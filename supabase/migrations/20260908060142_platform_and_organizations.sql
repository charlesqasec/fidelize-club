-- Fidelize.club — plataforma, organizações, unidades, perfis e feature flags.
--
-- Distingue dois planos de acesso (docs/ARQUITETURA.md, seção 10):
--   platform_admins        -> equipe Fidelize (Fidelize Admin, plano A)
--   organization_members   -> equipe do estabelecimento (plano B)
-- Não são a mesma coisa: um FIDELIZE_SUPPORT não é "membro" de nenhuma
-- organização, apenas tem acesso administrativo global controlado.

-- ---------------------------------------------------------------------------
-- profiles — espelha auth.users com dados de perfil não sensíveis.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil público de cada usuário autenticado (equipe Fidelize e equipe de estabelecimentos). Criado automaticamente no signup.';

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Criação automática do profile a cada novo usuário em auth.users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- platform_admins — equipe interna Fidelize.club (Fidelize Admin).
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null check (role in ('FIDELIZE_SUPER_ADMIN', 'FIDELIZE_SUPPORT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Equipe Fidelize.club com acesso administrativo global. Nunca confundir com organization_members.';

-- ---------------------------------------------------------------------------
-- organizations — conta contratante (empresa/estabelecimento).
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Conta contratante. Uma organização pode ter uma ou várias locations (unidades). Fonte de verdade do tenant.';

create trigger set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- locations — unidade física de uma organização.
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  address jsonb,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

comment on table public.locations is
  'Unidade física de uma organização (ex.: Barra, Pituba). Endereço em JSONB por não ter, ainda, consulta estruturada por campo.';

create trigger set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

create index locations_organization_id_idx on public.locations (organization_id);

-- ---------------------------------------------------------------------------
-- organization_members — equipe do estabelecimento (papéis operacionais).
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('OWNER', 'MANAGER', 'STAFF')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INVITED', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table public.organization_members is
  'Vínculo de um usuário com uma organização e seu papel operacional (OWNER/MANAGER/STAFF). Um usuário pode pertencer a mais de uma organização.';

create index organization_members_user_id_idx on public.organization_members (user_id);
create index organization_members_organization_id_idx on public.organization_members (organization_id);

-- ---------------------------------------------------------------------------
-- Funções auxiliares de autorização (SECURITY DEFINER).
--
-- Por que SECURITY DEFINER: uma policy de RLS em organization_members que
-- fizesse "select ... from organization_members" para checar o próprio
-- acesso causaria recursão infinita. Estas funções rodam com o privilégio de
-- quem as definiu, ignorando RLS internamente, e por isso podem ser chamadas
-- com segurança de dentro de qualquer policy (seção rls_policies).
-- `set search_path` evita hijacking de search_path — prática recomendada
-- para toda função SECURITY DEFINER.
-- ---------------------------------------------------------------------------
create function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = auth.uid() and pa.status = 'ACTIVE'
  );
$$;

create function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.status = 'ACTIVE'
  );
$$;

create function public.org_role(org_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select om.role from public.organization_members om
  where om.organization_id = org_id
    and om.user_id = auth.uid()
    and om.status = 'ACTIVE'
  limit 1;
$$;

comment on function public.is_platform_admin() is 'true se o usuário autenticado é equipe Fidelize ativa.';
comment on function public.is_org_member(uuid) is 'true se o usuário autenticado é membro ativo da organização informada.';
comment on function public.org_role(uuid) is 'Papel (OWNER/MANAGER/STAFF) do usuário autenticado na organização informada, ou null.';

-- ---------------------------------------------------------------------------
-- platform_settings — kill-switch global (singleton). Controla o que a
-- plataforma permite, independentemente do que cada organização configurar.
-- O truque `id boolean primary key default true check (id)` garante uma
-- única linha possível (só o valor `true` é aceito).
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  id boolean primary key default true check (id),
  google_wallet_enabled boolean not null default false,
  apple_wallet_enabled boolean not null default false,
  web_push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_settings is
  'Configuração global de plataforma (singleton). O flag efetivo de Wallet/Web Push é platform_settings.X AND organization_feature_flags.X — a organização só liga o que a plataforma permite.';

create trigger set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

insert into public.platform_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- organization_feature_flags — uma linha por organização, criada
-- automaticamente. Colunas booleanas simples (não JSONB): o conjunto de
-- flags é pequeno, evolui devagar e cada uma se beneficia de default e
-- constraint próprios — JSONB só adicionaria complexidade de validação aqui.
-- ---------------------------------------------------------------------------
create table public.organization_feature_flags (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  web_card_enabled boolean not null default true,
  google_wallet_enabled boolean not null default false,
  apple_wallet_enabled boolean not null default false,
  web_push_enabled boolean not null default false,
  reviews_enabled boolean not null default false,
  internal_feedback_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.organization_feature_flags is
  'Flags de canal por organização. web_card_enabled nunca deve ser desligado (canal oficial permanente — docs/ARQUITETURA.md, seção 2).';

create trigger set_updated_at
  before update on public.organization_feature_flags
  for each row execute function public.set_updated_at();

create function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_feature_flags (organization_id) values (new.id);
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();
