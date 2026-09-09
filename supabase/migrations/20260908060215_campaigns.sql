-- Fidelize.club — campanhas e mensagens.
--
-- Regra permanente (docs/ARQUITETURA.md, seção 6): nenhuma campanha vai ao
-- ar sem aprovação do proprietário. A CHECK constraint abaixo torna essa
-- regra impossível de violar mesmo por bug de aplicação — não é apenas
-- validação de UI.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid references public.loyalty_programs (id) on delete set null,
  name text not null,
  type text not null check (type in ('STANDARD', 'ADVANCED')),
  status text not null default 'DRAFT' check (
    status in ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')
  ),
  start_at timestamptz,
  end_at timestamptz,
  content jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_require_approval check (
    status not in ('APPROVED', 'ACTIVE') or (approved_by is not null and approved_at is not null)
  )
);

comment on table public.campaigns is
  'Campanha padrão ou personalizada (type). type=STANDARD cobre as incluídas no programa; ADVANCED cobre as sob orçamento (docs/ARQUITETURA.md, seção 6).';
comment on constraint campaigns_require_approval on public.campaigns is
  'Impede, a nível de banco, que uma campanha fique ACTIVE/APPROVED sem aprovação registrada.';

create trigger set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create index campaigns_organization_id_idx on public.campaigns (organization_id);
create index campaigns_program_id_idx on public.campaigns (program_id);

-- ---------------------------------------------------------------------------
create table public.campaign_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  channel text not null check (channel in ('WEB_CARD', 'WEB_PUSH', 'GOOGLE_WALLET', 'APPLE_WALLET')),
  title text not null,
  body text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.campaign_messages is
  'Mensagem de uma campanha por canal. Nenhum envio real é implementado nesta etapa (Web Push é ETAPA 11; Wallet é ETAPA 8/9).';

create index campaign_messages_campaign_id_idx on public.campaign_messages (campaign_id);
