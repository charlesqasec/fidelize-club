-- Fidelize.club — cartão digital (token público) e status de Wallet.
--
-- public_token: hex de 24 bytes aleatórios (gen_random_bytes), não
-- sequencial e imprevisível — nunca expõe o uuid interno da linha. Será a
-- chave da futura rota fidelize.club/c/[token] (ETAPA 5). Importante: esta
-- tabela NÃO tem, nesta etapa, nenhuma policy de leitura pública (ver
-- rls_policies) — o acesso por token vai precisar de uma function dedicada,
-- não de RLS direta, para evitar enumeração e permitir rate limiting.

create table public.customer_cards (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique references public.customer_memberships (id) on delete cascade,
  public_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customer_cards is
  'Cartão Digital Web de um membership. public_token é o identificador usado na URL — nunca o id interno.';

create trigger set_updated_at
  before update on public.customer_cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wallet_passes — status de sincronização com Google/Apple Wallet.
--
-- Esta tabela guarda apenas STATUS. Nenhuma API de Wallet é chamada nesta
-- etapa (ETAPA 8/9). O Cartão Digital Web continua sendo a fonte de verdade
-- mesmo depois que isto for implementado — ver docs/ARQUITETURA.md, seção 2.
-- ---------------------------------------------------------------------------
create table public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.customer_memberships (id) on delete cascade,
  provider text not null check (provider in ('GOOGLE', 'APPLE')),
  external_id text,
  status text not null default 'NOT_LINKED' check (status in ('NOT_LINKED', 'LINKED', 'REVOKED', 'ERROR')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (membership_id, provider)
);

comment on table public.wallet_passes is
  'Status de vínculo com Apple/Google Wallet por membership. Wallet nunca é fonte de verdade — apenas um canal opcional.';

create trigger set_updated_at
  before update on public.wallet_passes
  for each row execute function public.set_updated_at();

create index wallet_passes_membership_id_idx on public.wallet_passes (membership_id);
