-- Fidelize.club — clientes (entidade global) e memberships (vínculo por
-- organização/programa).
--
-- customers é GLOBAL: um consumidor pode ter memberships em vários
-- estabelecimentos diferentes, então esta tabela não tem organization_id e
-- não pode ser protegida por RLS multi-tenant simples (ver rls_policies).
--
-- Estratégia de deduplicação (docs/ARQUITETURA.md, seção 9): não resolvemos
-- identidade global de forma "esperta" agora — isso é arriscado (duas
-- pessoas podem compartilhar telefone; uma pessoa pode ter dois e-mails).
-- Criamos apenas um índice único parcial em e-mail/telefone normalizados
-- para evitar duplicata ÓBVIA do mesmo identificador exato. Fusão de
-- identidade real fica para quando o cadastro do consumidor existir
-- (ETAPA 4).

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_phone_format check (phone is null or phone ~ '^\+?[0-9]{8,15}$')
);

comment on table public.customers is
  'Consumidor final, entidade global (não pertence a uma organização). email e phone são opcionais — cadastro precisa poder ser simples.';

create trigger set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create unique index customers_email_unique_idx on public.customers (lower(email)) where email is not null;
create unique index customers_phone_unique_idx on public.customers (phone) where phone is not null;

-- ---------------------------------------------------------------------------
-- customer_memberships — vínculo do cliente com uma organização/programa.
--
-- Saldo materializado (current_points/current_stamps/current_visits): ver
-- explicação completa na migration checkin_and_ledger.sql. Resumo: estas
-- colunas só podem ser alteradas pelo trigger que processa
-- loyalty_transactions — nunca por UPDATE direto de cliente.
-- ---------------------------------------------------------------------------
create table public.customer_memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'BLOCKED')),
  current_points integer not null default 0 check (current_points >= 0),
  current_stamps integer not null default 0 check (current_stamps >= 0),
  current_visits integer not null default 0 check (current_visits >= 0),
  joined_at timestamptz not null default now(),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, program_id)
);

comment on table public.customer_memberships is
  'Relacionamento de um cliente com um programa específico. Saldos são materializados a partir do ledger (loyalty_transactions) — nunca escritos diretamente.';

create trigger set_updated_at
  before update on public.customer_memberships
  for each row execute function public.set_updated_at();

-- Garante program_id.organization_id = organization_id desta linha.
create function public.check_membership_program_org()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.loyalty_programs p
    where p.id = new.program_id
      and p.organization_id = new.organization_id
  ) then
    raise exception 'program_id % não pertence à organization_id %', new.program_id, new.organization_id;
  end if;
  return new;
end;
$$;

create trigger check_membership_program_org
  before insert or update on public.customer_memberships
  for each row execute function public.check_membership_program_org();

create index customer_memberships_customer_id_idx on public.customer_memberships (customer_id);
create index customer_memberships_organization_id_idx on public.customer_memberships (organization_id);
create index customer_memberships_program_id_idx on public.customer_memberships (program_id);
