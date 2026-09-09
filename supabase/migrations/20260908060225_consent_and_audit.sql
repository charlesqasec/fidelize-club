-- Fidelize.club — consentimento (LGPD) e trilha de auditoria.

create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  consent_type text not null check (consent_type in ('MARKETING_MESSAGES', 'WEB_PUSH', 'DATA_PROCESSING')),
  status text not null default 'GRANTED' check (status in ('GRANTED', 'REVOKED')),
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (customer_id, organization_id, consent_type)
);

comment on table public.customer_consents is
  'Consentimento explícito do cliente por organização e finalidade (LGPD). Nunca presumir consentimento — sempre um registro explícito.';

create index customer_consents_customer_id_idx on public.customer_consents (customer_id);
create index customer_consents_organization_id_idx on public.customer_consents (organization_id);

-- ---------------------------------------------------------------------------
-- audit_logs — trilha de auditoria, append-only.
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Trilha de auditoria. Nunca armazenar segredos/dados sensíveis em metadata. Append-only — sem UPDATE/DELETE, nem para service_role.';

create trigger forbid_mutation
  before update or delete on public.audit_logs
  for each row execute function public.forbid_mutation();

create index audit_logs_organization_id_idx on public.audit_logs (organization_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);
