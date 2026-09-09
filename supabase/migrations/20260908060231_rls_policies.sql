-- Fidelize.club — Row Level Security.
--
-- POSTURA DESTA ETAPA (docs/ARQUITETURA.md, seção 16.1): RLS habilitado em
-- toda tabela. A maioria das tabelas recebe apenas política de SELECT para
-- a equipe do estabelecimento/plataforma — política de INSERT/UPDATE/DELETE
-- fica para quando a etapa que implementa aquele fluxo existir (painel,
-- motor de fidelidade, cadastro do consumidor...). Em Postgres, RLS
-- habilitado sem nenhuma política para um comando = esse comando fica
-- negado por padrão para `anon`/`authenticated`, mesmo que a role tenha
-- GRANT na tabela. Só `service_role` (que ignora RLS) escreve por enquanto.
-- Isso é deliberado: reduz superfície de ataque enquanto não há lógica de
-- negócio/antifraude para validar essas escritas.
--
-- Nunca usar `using (true)` em dado sensível — nenhuma política abaixo faz
-- isso.

-- ---------------------------------------------------------------------------
-- profiles — cada usuário vê e edita apenas o próprio perfil.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid() or public.is_platform_admin());

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- platform_admins — sem policy para authenticated/anon. Consultado apenas
-- pelas funções SECURITY DEFINER (is_platform_admin) e por service_role.
-- ---------------------------------------------------------------------------
alter table public.platform_admins enable row level security;

-- ---------------------------------------------------------------------------
-- organizations / locations / organization_members / organization_feature_flags
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy organizations_select_staff
  on public.organizations for select
  using (public.is_org_member(id) or public.is_platform_admin());

alter table public.locations enable row level security;

create policy locations_select_staff
  on public.locations for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

alter table public.organization_members enable row level security;

create policy organization_members_select_staff
  on public.organization_members for select
  using (
    user_id = auth.uid()
    or public.is_org_member(organization_id)
    or public.is_platform_admin()
  );

alter table public.organization_feature_flags enable row level security;

create policy organization_feature_flags_select_staff
  on public.organization_feature_flags for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- platform_settings — só a equipe Fidelize lê o kill-switch global.
-- ---------------------------------------------------------------------------
alter table public.platform_settings enable row level security;

create policy platform_settings_select_admin
  on public.platform_settings for select
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- loyalty_programs / program_branding
-- ---------------------------------------------------------------------------
alter table public.loyalty_programs enable row level security;

create policy loyalty_programs_select_staff
  on public.loyalty_programs for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

alter table public.program_branding enable row level security;

create policy program_branding_select_staff
  on public.program_branding for select
  using (
    exists (
      select 1 from public.loyalty_programs p
      where p.id = program_branding.program_id
        and (public.is_org_member(p.organization_id) or public.is_platform_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- customers — entidade global, sem organization_id. Deliberadamente SEM
-- policy de leitura para equipe de estabelecimento nesta etapa: expor a
-- tabela inteira por RLS "frouxo" arriscaria vazar clientes entre
-- organizações. O painel (ETAPA 7) vai ler clientes através de uma
-- function/view que cruza com customer_memberships e filtra por
-- organization_id — não por acesso direto a esta tabela.
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;

create policy customers_select_admin
  on public.customers for select
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- customer_memberships — saldo é somente leitura por RLS; só o trigger do
-- ledger (SECURITY DEFINER) escreve current_points/current_stamps/current_visits.
-- ---------------------------------------------------------------------------
alter table public.customer_memberships enable row level security;

create policy customer_memberships_select_staff
  on public.customer_memberships for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- nfc_devices / qr_tokens — contêm segredo (hash) e token. Restrito à
-- equipe Fidelize nesta etapa; quando o painel (ETAPA 7) precisar listar
-- dispositivos para o estabelecimento, deve ser via view/function que
-- exclua secret_hash — não por ampliar esta policy.
-- ---------------------------------------------------------------------------
alter table public.nfc_devices enable row level security;

create policy nfc_devices_select_admin
  on public.nfc_devices for select
  using (public.is_platform_admin());

alter table public.qr_tokens enable row level security;

create policy qr_tokens_select_admin
  on public.qr_tokens for select
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- checkin_events — sem segredo; visível à equipe do estabelecimento.
-- ---------------------------------------------------------------------------
alter table public.checkin_events enable row level security;

create policy checkin_events_select_staff
  on public.checkin_events for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- loyalty_transactions — ledger. Leitura para a equipe do estabelecimento;
-- escrita nesta etapa só por service_role (motor de fidelidade é ETAPA 6).
-- ---------------------------------------------------------------------------
alter table public.loyalty_transactions enable row level security;

create policy loyalty_transactions_select_staff
  on public.loyalty_transactions for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- rewards / reward_redemptions
-- ---------------------------------------------------------------------------
alter table public.rewards enable row level security;

create policy rewards_select_staff
  on public.rewards for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

alter table public.reward_redemptions enable row level security;

create policy reward_redemptions_select_staff
  on public.reward_redemptions for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- customer_cards — SEM policy de leitura, nem para a equipe do
-- estabelecimento. O acesso público por token (fidelize.club/c/[token],
-- ETAPA 5) será servido por uma function SECURITY DEFINER dedicada, que
-- pode aplicar rate limiting — nunca por SELECT direto via RLS, que
-- permitiria enumeração do token.
-- ---------------------------------------------------------------------------
alter table public.customer_cards enable row level security;

create policy customer_cards_select_admin
  on public.customer_cards for select
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- wallet_passes
-- ---------------------------------------------------------------------------
alter table public.wallet_passes enable row level security;

create policy wallet_passes_select_staff
  on public.wallet_passes for select
  using (
    exists (
      select 1 from public.customer_memberships m
      where m.id = wallet_passes.membership_id
        and (public.is_org_member(m.organization_id) or public.is_platform_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- campaigns / campaign_messages
-- ---------------------------------------------------------------------------
alter table public.campaigns enable row level security;

create policy campaigns_select_staff
  on public.campaigns for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

alter table public.campaign_messages enable row level security;

create policy campaign_messages_select_staff
  on public.campaign_messages for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_messages.campaign_id
        and (public.is_org_member(c.organization_id) or public.is_platform_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- review_channels / review_requests / customer_feedback / feedback_categories
-- ---------------------------------------------------------------------------
alter table public.review_channels enable row level security;

create policy review_channels_select_staff
  on public.review_channels for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

alter table public.review_requests enable row level security;

create policy review_requests_select_staff
  on public.review_requests for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- customer_feedback é dado privado e sensível (seção 7.8/9 da arquitetura):
-- nunca visível fora da própria organização, em nenhuma hipótese.
alter table public.customer_feedback enable row level security;

create policy customer_feedback_select_staff
  on public.customer_feedback for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

alter table public.feedback_categories enable row level security;

create policy feedback_categories_select_all
  on public.feedback_categories for select
  using (
    organization_id is null
    or public.is_org_member(organization_id)
    or public.is_platform_admin()
  );

alter table public.feedback_category_links enable row level security;

create policy feedback_category_links_select_staff
  on public.feedback_category_links for select
  using (
    exists (
      select 1 from public.customer_feedback f
      where f.id = feedback_category_links.feedback_id
        and (public.is_org_member(f.organization_id) or public.is_platform_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- customer_consents
-- ---------------------------------------------------------------------------
alter table public.customer_consents enable row level security;

create policy customer_consents_select_staff
  on public.customer_consents for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- audit_logs — visível à própria organização (transparência) e à equipe
-- Fidelize. Nunca escrito por authenticated/anon (sem policy de INSERT) —
-- somente por funções SECURITY DEFINER ou service_role.
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy audit_logs_select_staff
  on public.audit_logs for select
  using (
    (organization_id is not null and public.is_org_member(organization_id))
    or public.is_platform_admin()
  );
