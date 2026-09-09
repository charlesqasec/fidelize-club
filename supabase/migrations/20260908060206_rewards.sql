-- Fidelize.club — recompensas e resgates.
--
-- reward_redemptions registra o resgate como evento próprio (não apenas uma
-- flag "usado" no cliente) — permite múltiplos resgates ao longo do tempo e
-- histórico auditável. O efeito no saldo (dedução de pontos/selos) é sempre
-- uma linha em loyalty_transactions (type REWARD_REDEEM), referenciada por
-- transaction_id.

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  name text not null,
  description text,
  reward_type text not null check (reward_type in ('FREE_ITEM', 'DISCOUNT', 'CASHBACK', 'CUSTOM')),
  threshold integer not null default 0 check (threshold >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'ARCHIVED')),
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rewards is
  'Catálogo de recompensas de um programa. threshold é o custo em pontos/selos/visitas conforme o tipo do programa.';

create trigger set_updated_at
  before update on public.rewards
  for each row execute function public.set_updated_at();

create index rewards_organization_id_idx on public.rewards (organization_id);
create index rewards_program_id_idx on public.rewards (program_id);

-- ---------------------------------------------------------------------------
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  membership_id uuid not null references public.customer_memberships (id) on delete cascade,
  transaction_id uuid references public.loyalty_transactions (id),
  status text not null default 'PENDING' check (status in ('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED')),
  redeemed_by uuid references auth.users (id),
  redeemed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.reward_redemptions is
  'Registro de cada resgate de recompensa. transaction_id aponta para a linha do ledger que deduziu o saldo — o resgate nunca é "só uma flag".';

create index reward_redemptions_organization_id_idx on public.reward_redemptions (organization_id);
create index reward_redemptions_membership_id_idx on public.reward_redemptions (membership_id);
create index reward_redemptions_reward_id_idx on public.reward_redemptions (reward_id);
