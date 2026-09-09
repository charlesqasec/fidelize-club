-- Fidelize.club — programas de fidelidade e branding.
--
-- Decisão de normalização vs. JSONB (docs/ARQUITETURA.md, seção 3 e 8):
--   loyalty_programs.rules  -> JSONB. A mecânica varia por `type`
--                              (meta de selos, taxa de pontos, degraus de
--                              nível...). O formato do JSON difere por tipo;
--                              colunas fixas forçariam muitos campos nulos
--                              ou uma tabela por tipo. JSONB é o encaixe certo.
--   program_branding        -> colunas normalizadas. Todo programa tem
--                              exatamente os mesmos campos visuais
--                              (logo, cores, headline...), sempre editados
--                              via formulário. Não há razão para JSONB aqui —
--                              colunas tipadas validam melhor e são mais
--                              baratas de consultar/indexar.

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  name text not null,
  type text not null check (type in ('STAMP', 'VISIT', 'POINTS', 'TIER', 'CUSTOM')),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.loyalty_programs is
  'Programa de fidelidade de uma organização. location_id nulo = programa vale para todas as unidades.';
comment on column public.loyalty_programs.rules is
  'Parâmetros da mecânica, específicos de `type` (ex.: {"target": 10} para STAMP). Validado pela aplicação, não pelo banco.';

create trigger set_updated_at
  before update on public.loyalty_programs
  for each row execute function public.set_updated_at();

create trigger check_location_org
  before insert or update on public.loyalty_programs
  for each row execute function public.check_location_belongs_to_org();

create index loyalty_programs_organization_id_idx on public.loyalty_programs (organization_id);
create index loyalty_programs_location_id_idx on public.loyalty_programs (location_id);

-- ---------------------------------------------------------------------------
-- program_branding — identidade visual do programa (1:1).
-- ---------------------------------------------------------------------------
create table public.program_branding (
  program_id uuid primary key references public.loyalty_programs (id) on delete cascade,
  logo_url text,
  primary_color text,
  secondary_color text,
  background_color text,
  text_color text,
  card_style text not null default 'CLASSIC' check (card_style in ('CLASSIC', 'MINIMAL', 'BOLD')),
  headline text,
  description text,
  updated_at timestamptz not null default now()
);

comment on table public.program_branding is
  'Identidade visual e textos do programa, usados no Cartão Digital. Relação 1:1 com loyalty_programs.';

create trigger set_updated_at
  before update on public.program_branding
  for each row execute function public.set_updated_at();
