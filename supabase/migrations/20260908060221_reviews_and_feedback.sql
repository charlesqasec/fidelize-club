-- Fidelize.club — avaliação pública externa e feedback interno.
-- Ver docs/ARQUITETURA.md, seção 7, para as regras de integridade
-- (nunca condicionar recompensa a nota, nunca review gating, pedido sempre
-- neutro). Nenhuma integração real (Google, TripAdvisor...) é implementada
-- aqui — apenas o modelo de dados, extensível a novos `provider`.

create table public.review_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('GOOGLE', 'TRIPADVISOR', 'FACEBOOK', 'CUSTOM')),
  label text,
  url text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.review_channels is
  'Canal de avaliação pública configurado pelo estabelecimento (ex.: link do Google Reviews). provider é extensível.';

create trigger set_updated_at
  before update on public.review_channels
  for each row execute function public.set_updated_at();

create index review_channels_organization_id_idx on public.review_channels (organization_id);

-- ---------------------------------------------------------------------------
create table public.review_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  membership_id uuid not null references public.customer_memberships (id) on delete cascade,
  visit_transaction_id uuid references public.loyalty_transactions (id),
  review_channel_id uuid not null references public.review_channels (id) on delete cascade,
  requested_at timestamptz not null default now(),
  clicked_at timestamptz,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'CLICKED', 'DISMISSED'))
);

comment on table public.review_requests is
  'Registra que o convite de avaliação foi mostrado/clicado. Não infere nem confirma que uma avaliação foi de fato publicada no canal externo — isso exigiria integração autorizada, fora de escopo desta etapa.';

create index review_requests_organization_id_idx on public.review_requests (organization_id);
create index review_requests_membership_id_idx on public.review_requests (membership_id);

-- ---------------------------------------------------------------------------
-- customer_feedback — privado, nunca publicado automaticamente.
-- ---------------------------------------------------------------------------
create table public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  membership_id uuid not null references public.customer_memberships (id) on delete cascade,
  visit_transaction_id uuid references public.loyalty_transactions (id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  status text not null default 'NEW' check (status in ('NEW', 'REVIEWED', 'ARCHIVED')),
  created_at timestamptz not null default now()
);

comment on table public.customer_feedback is
  'Feedback privado do cliente, visível apenas para a própria organização (nunca publicado automaticamente em canal externo).';

create index customer_feedback_organization_id_idx on public.customer_feedback (organization_id);
create index customer_feedback_membership_id_idx on public.customer_feedback (membership_id);

-- ---------------------------------------------------------------------------
create table public.feedback_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

comment on table public.feedback_categories is
  'Categoria de classificação de feedback. organization_id nulo = categoria padrão da plataforma, disponível a todos.';

create table public.feedback_category_links (
  feedback_id uuid not null references public.customer_feedback (id) on delete cascade,
  category_id uuid not null references public.feedback_categories (id) on delete cascade,
  primary key (feedback_id, category_id)
);

comment on table public.feedback_category_links is
  'Relação N:N entre customer_feedback e feedback_categories.';

-- Categorias padrão de plataforma (docs/ARQUITETURA.md, seção 7.5).
insert into public.feedback_categories (organization_id, name) values
  (null, 'Atendimento'),
  (null, 'Ambiente'),
  (null, 'Produto'),
  (null, 'Tempo de espera'),
  (null, 'Preço');
