-- Fidelize.club — check-ins e ledger de fidelidade.
--
-- DECISÃO — visitas como duas entidades, não uma (docs/ARQUITETURA.md,
-- seção 12): um checkin_event registra toda TENTATIVA de entrada (NFC, QR,
-- staff, admin) e pode ser REJECTED pelo antifraude. Só uma tentativa
-- ACCEPTED gera exatamente uma linha em loyalty_transactions. Isso separa
-- "o evento de chegada" de "o efeito na fidelidade" — essencial para
-- investigar fraude sem contaminar o saldo do cliente, e para relatórios
-- que precisam contar tentativas rejeitadas separadamente de visitas reais.
--
-- DECISÃO — ledger imutável + saldo materializado (docs/ARQUITETURA.md,
-- seção 11): current_points/current_stamps/current_visits, em
-- customer_memberships, são cache. A única forma de alterá-los é inserir uma
-- linha em loyalty_transactions — um trigger recalcula o saldo. Resultado:
-- leitura rápida (não soma o histórico inteiro a cada carregamento de
-- cartão) e auditável (todo saldo é reconstruível a partir do ledger).
-- loyalty_transactions nunca aceita UPDATE/DELETE (nem de service_role) —
-- correções entram como novas linhas do tipo REVERSAL/ADJUSTMENT.
--
-- O trigger apply_loyalty_transaction() abaixo é um sincronizador simples,
-- NÃO o motor de fidelidade (isso é a ETAPA 6). Ele não aplica regras por
-- tipo de programa, threshold de recompensa ou lógica de nível — só mantém
-- ledger e saldo consistentes.

create table public.checkin_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  membership_id uuid references public.customer_memberships (id) on delete set null,
  source text not null check (source in ('NFC', 'QR', 'STAFF', 'ADMIN')),
  device_id uuid references public.nfc_devices (id),
  qr_token_id uuid references public.qr_tokens (id),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED')),
  risk_score numeric,
  resulting_transaction_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.checkin_events is
  'Tentativa de check-in via NFC/QR/staff/admin. Pode ser REJECTED pelo antifraude (ETAPA 10) sem gerar nenhuma transação de fidelidade.';

create trigger check_location_org
  before insert or update on public.checkin_events
  for each row execute function public.check_location_belongs_to_org();

create index checkin_events_organization_id_idx on public.checkin_events (organization_id);
create index checkin_events_membership_id_idx on public.checkin_events (membership_id);
create index checkin_events_device_id_idx on public.checkin_events (device_id);
create index checkin_events_qr_token_id_idx on public.checkin_events (qr_token_id);

-- ---------------------------------------------------------------------------
-- loyalty_transactions — ledger imutável.
-- ---------------------------------------------------------------------------
create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  membership_id uuid not null references public.customer_memberships (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  type text not null check (
    type in ('VISIT', 'STAMP_ADD', 'POINTS_ADD', 'POINTS_REMOVE', 'REWARD_REDEEM', 'ADJUSTMENT', 'BONUS', 'REVERSAL')
  ),
  amount integer not null default 0,
  source text not null check (source in ('NFC', 'QR', 'STAFF', 'ADMIN', 'SYSTEM', 'CAMPAIGN')),
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table public.loyalty_transactions is
  'Ledger imutável de todo evento de fidelidade. Fonte de verdade dos saldos — nunca aceita UPDATE/DELETE, nem correções (usar REVERSAL/ADJUSTMENT).';
comment on column public.loyalty_transactions.reference_id is
  'Referência opcional a outra entidade relacionada (ex.: checkin_events.id, reward_redemptions.id, ou a transação original em caso de REVERSAL).';

create trigger check_location_org
  before insert or update on public.loyalty_transactions
  for each row execute function public.check_location_belongs_to_org();

create trigger forbid_mutation
  before update or delete on public.loyalty_transactions
  for each row execute function public.forbid_mutation();

create index loyalty_transactions_membership_id_idx on public.loyalty_transactions (membership_id);
create index loyalty_transactions_organization_id_idx on public.loyalty_transactions (organization_id);
create index loyalty_transactions_created_at_idx on public.loyalty_transactions (created_at);

alter table public.checkin_events
  add constraint checkin_events_resulting_transaction_fkey
  foreign key (resulting_transaction_id) references public.loyalty_transactions (id);

-- ---------------------------------------------------------------------------
-- Sincronização de saldo (placeholder — não é o motor de fidelidade).
-- ---------------------------------------------------------------------------
create function public.apply_loyalty_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  points_delta integer := 0;
  stamps_delta integer := 0;
  visits_delta integer := 0;
begin
  if new.type in ('POINTS_ADD', 'BONUS') then
    points_delta := new.amount;
  elsif new.type in ('POINTS_REMOVE', 'REWARD_REDEEM') then
    points_delta := -new.amount;
  elsif new.type = 'STAMP_ADD' then
    stamps_delta := new.amount;
  elsif new.type = 'VISIT' then
    visits_delta := new.amount;
  elsif new.type in ('ADJUSTMENT', 'REVERSAL') then
    -- Sinal e semântica decididos por quem insere a transação (amount pode
    -- ser negativo). Aplicado como ajuste de pontos por padrão.
    points_delta := new.amount;
  end if;

  update public.customer_memberships
  set
    current_points = greatest(current_points + points_delta, 0),
    current_stamps = greatest(current_stamps + stamps_delta, 0),
    current_visits = greatest(current_visits + visits_delta, 0),
    last_activity_at = new.created_at
  where id = new.membership_id;

  return new;
end;
$$;

comment on function public.apply_loyalty_transaction() is
  'Sincroniza o saldo materializado em customer_memberships a partir de uma nova linha do ledger. NÃO é o motor de fidelidade (ETAPA 6) — não conhece regras por tipo de programa.';

create trigger apply_loyalty_transaction
  after insert on public.loyalty_transactions
  for each row execute function public.apply_loyalty_transaction();
