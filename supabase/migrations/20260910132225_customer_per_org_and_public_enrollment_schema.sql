-- Fidelize.club — ETAPA 5.0A: customers por organização + fundação do
-- cadastro público (SOMENTE schema).
--
-- Decisão aprovada (ETAPA 5.0): customers deixa de ser entidade global e
-- passa a pertencer a UMA organização. Isolamento multi-tenant forte —
-- mesmo telefone/e-mail pode existir em organizações diferentes, a
-- deduplicação passa a ser POR organização e a RLS de customers passa a
-- ser org-scoped como as demais tabelas operacionais.
--
-- Esta migration é SÓ schema. NÃO cria enroll_customer, get_program_entry,
-- rota /join/[token], UI, QR render, painel, OTP, Turnstile, campanhas nem
-- lógica de crédito/pontos. NÃO toca get_public_card, submit_card_feedback
-- nem o ledger de fidelidade.

-- ===========================================================================
-- 1. customers — organization_id, backfill guardado, unicidade por organização
-- ===========================================================================

alter table public.customers
  add column organization_id uuid references public.organizations (id) on delete cascade;

comment on column public.customers.organization_id is
  'Organização dona deste registro de cliente. customers deixou de ser global na ETAPA 5.0A: cada organização tem seu próprio registro; mesmo telefone/e-mail pode repetir entre organizações.';

-- Guarda: a decisão 5.0A só é aplicável se nenhum customer existente
-- estiver vinculado a mais de uma organização (via memberships) e se todo
-- customer tiver ao menos uma membership de onde inferir a organização.
-- Qualquer violação ABORTA a migration inteira (transação).
do $$
declare
  v_multi  integer;
  v_orphan integer;
begin
  select count(*) into v_multi
  from (
    select customer_id
    from public.customer_memberships
    group by customer_id
    having count(distinct organization_id) > 1
  ) t;

  if v_multi > 0 then
    raise exception
      'ETAPA 5.0A abortada: % customer(s) com memberships em organizacoes diferentes. Resolver identidade manualmente antes de tornar customers.organization_id NOT NULL.', v_multi;
  end if;

  select count(*) into v_orphan
  from public.customers c
  left join public.customer_memberships m on m.customer_id = c.id
  where m.id is null;

  if v_orphan > 0 then
    raise exception
      'ETAPA 5.0A abortada: % customer(s) sem nenhuma membership - organization_id nao pode ser inferido com seguranca.', v_orphan;
  end if;
end $$;

-- Backfill: cada customer tem memberships em exatamente uma organização
-- (garantido pela guarda acima), então qualquer membership serve.
update public.customers c
set organization_id = m.organization_id
from public.customer_memberships m
where m.customer_id = c.id
  and c.organization_id is null;

alter table public.customers
  alter column organization_id set not null;

create index customers_organization_id_idx
  on public.customers (organization_id);

-- Unicidade passa de GLOBAL para POR ORGANIZAÇÃO. NULLs continuam livres
-- (índice parcial). Mesmo telefone/e-mail pode existir em organizações
-- diferentes; dentro de uma organização continua único.
drop index if exists public.customers_phone_unique_idx;
drop index if exists public.customers_email_unique_idx;

create unique index customers_org_phone_unique_idx
  on public.customers (organization_id, phone)
  where phone is not null;

create unique index customers_org_email_unique_idx
  on public.customers (organization_id, lower(email))
  where email is not null;

-- Telefone endurecido para E.164 estrito (+ obrigatório). Não havia
-- nenhum telefone gravado nesta base no momento da migration.
alter table public.customers
  drop constraint customers_phone_format;

alter table public.customers
  add constraint customers_phone_format
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');

comment on constraint customers_phone_format on public.customers is
  'E.164 estrito: + obrigatorio, primeiro digito 1-9, total de 8 a 15 digitos. Normalizacao de entrada BR: public.normalize_br_phone().';

-- RLS: customers passa a ser org-scoped, igual às demais tabelas
-- operacionais. platform_admin continua com acesso total (cláusula OR).
drop policy customers_select_admin on public.customers;

create policy customers_select_staff
  on public.customers for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- Integridade multi-tenant: uma membership nunca pode apontar para um
-- customer de outra organização.
create function public.check_membership_customer_org()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.customers c
    where c.id = new.customer_id
      and c.organization_id = new.organization_id
  ) then
    raise exception 'customer_id % nao pertence a organization_id %', new.customer_id, new.organization_id;
  end if;
  return new;
end;
$$;

comment on function public.check_membership_customer_org() is
  'Valida que customer_memberships.customer_id pertence a mesma organization_id da membership. Complementa a RLS: impede vinculo cruzado entre tenants mesmo por service_role/bug.';

revoke execute on function public.check_membership_customer_org() from anon, authenticated, public;

create trigger check_membership_customer_org
  before insert or update on public.customer_memberships
  for each row execute function public.check_membership_customer_org();

-- ===========================================================================
-- 2. normalize_br_phone — normalização de telefone BR para E.164
-- ===========================================================================
-- Pura, sem acesso a tabela (search_path vazio — só builtins de pg_catalog).
-- Não é SECURITY DEFINER e não fica executável por anon/authenticated: só
-- o dono (postgres), service_role e futuras funções SECURITY DEFINER
-- (enroll_customer, etapa posterior) a chamam.

create function public.normalize_br_phone(p_raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_digits text;
begin
  if p_raw is null then
    return null;
  end if;

  v_digits := regexp_replace(p_raw, '\D', '', 'g');

  -- prefixo internacional "00" -> descarta
  if left(v_digits, 2) = '00' then
    v_digits := substr(v_digits, 3);
  end if;

  if length(v_digits) in (12, 13) and left(v_digits, 2) = '55' then
    null;  -- já traz o código do país
  elsif length(v_digits) in (10, 11) then
    v_digits := '55' || v_digits;  -- número nacional (DDD + assinante)
  else
    return null;
  end if;

  -- DDD (posição 3) precisa começar em 1-9
  if substr(v_digits, 3, 1) !~ '[1-9]' then
    return null;
  end if;

  return '+' || v_digits;
end;
$$;

comment on function public.normalize_br_phone(text) is
  'Normaliza telefone BR digitado livremente para E.164 (+55DDDNUMERO) ou NULL se nao for possivel normalizar com confianca. Nao faz lookup de operadora nem valida se a linha existe. Uso: dentro de funcoes SECURITY DEFINER de cadastro - nao exposta a anon/authenticated.';

revoke execute on function public.normalize_br_phone(text) from anon, authenticated, public;

-- ===========================================================================
-- 3. program_join_links — token público de entrada num programa
-- ===========================================================================
-- Peça NOVA e paralela a qr_tokens/nfc_devices (que continuam sendo só
-- check-in de quem já é cliente). token NÃO é segredo — sozinho nunca
-- credita ponto, só abriria a tela de apresentação/cadastro do programa.
-- Nesta etapa: sem função de leitura pública, sem rota. Só o schema.

create table public.program_join_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  label text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.program_join_links is
  'Token publico de entrada num programa (impresso/gravado em NFC/QR fisico, visivel a qualquer pessoa). Diferente de qr_tokens.token: nao e segredo e nunca credita ponto sozinho. Acesso publico futuro via funcao SECURITY DEFINER dedicada - nunca por RLS direta.';

create trigger check_program_org
  before insert or update on public.program_join_links
  for each row execute function public.check_membership_program_org();

create trigger check_location_org
  before insert or update on public.program_join_links
  for each row execute function public.check_location_belongs_to_org();

create index program_join_links_organization_id_idx on public.program_join_links (organization_id);
create index program_join_links_program_id_idx on public.program_join_links (program_id);

alter table public.program_join_links enable row level security;

create policy program_join_links_select_admin
  on public.program_join_links for select
  using (public.is_platform_admin());

-- ===========================================================================
-- 4. enrollment_events — log append-only de adesões pelo cadastro público
-- ===========================================================================
-- Sem PII: nenhum telefone/e-mail/nome em texto. Só ids e um booleano.
-- Campos de proteção contra abuso (hash de IP, fingerprint) ficam para a
-- ETAPA 5.0F, quando o fluxo público e sua defesa forem desenhados.

create table public.enrollment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.loyalty_programs (id) on delete cascade,
  membership_id uuid references public.customer_memberships (id) on delete set null,
  join_link_id uuid references public.program_join_links (id) on delete set null,
  was_new_customer boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.enrollment_events is
  'Log append-only de cada adesao originada do cadastro publico. Nunca guarda telefone/e-mail/nome - so referencias e was_new_customer. Defesa contra abuso (IP/fingerprint) fica para a ETAPA 5.0F.';

create trigger check_program_org
  before insert or update on public.enrollment_events
  for each row execute function public.check_membership_program_org();

create trigger forbid_mutation
  before update or delete on public.enrollment_events
  for each row execute function public.forbid_mutation();

create index enrollment_events_organization_id_idx on public.enrollment_events (organization_id);
create index enrollment_events_program_id_idx on public.enrollment_events (program_id);
create index enrollment_events_membership_id_idx on public.enrollment_events (membership_id);
create index enrollment_events_join_link_id_idx on public.enrollment_events (join_link_id);

alter table public.enrollment_events enable row level security;

create policy enrollment_events_select_admin
  on public.enrollment_events for select
  using (public.is_platform_admin());

-- ===========================================================================
-- 5. customer_consents — novas finalidades e proveniência (LGPD)
-- ===========================================================================
-- Preserva linhas e valores existentes: só ACRESCENTA valores ao CHECK e
-- colunas nulas.

alter table public.customer_consents
  drop constraint customer_consents_consent_type_check;

alter table public.customer_consents
  add constraint customer_consents_consent_type_check
  check (consent_type in (
    'MARKETING_MESSAGES',
    'WEB_PUSH',
    'DATA_PROCESSING',
    'MARKETING_WHATSAPP',
    'MARKETING_EMAIL'
  ));

alter table public.customer_consents
  add column purpose text,
  add column term_version text,
  add column source text,
  add column source_ref text;

comment on column public.customer_consents.purpose is
  'Finalidade especifica do consentimento (LGPD art. 9) - texto da versao do termo apresentada.';
comment on column public.customer_consents.term_version is
  'Identificador da versao do termo / aviso de privacidade aceito.';
comment on column public.customer_consents.source is
  'Origem do registro de consentimento (ex.: cadastro publico, painel, importacao).';
comment on column public.customer_consents.source_ref is
  'Referencia opcional a origem (ex.: program_join_links.id, enrollment_events.id) - sem PII.';
