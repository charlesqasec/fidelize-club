-- Fidelize.club — ETAPA 4.6C: painel do estabelecimento — Programa,
-- Branding e Recompensas.
--
-- Mesma postura das ETAPAs 4.0.1 / 5.0B / 4.6B: nenhuma tabela base ganha
-- policy de INSERT/UPDATE/DELETE para `authenticated`. Toda escrita passa
-- por function SECURITY DEFINER com `search_path` fixo, que valida
-- `auth.uid()`, a organização e o papel ANTES de escrever, sem SQL
-- dinâmico, e registra em `audit_logs`. Reutiliza `admin_org_actor_role`
-- (20260910150000) — nenhum helper novo de autorização.
--
-- RBAC (validado no servidor, dentro de cada function):
--   PLATFORM_ADMIN / OWNER -> programa, branding e recompensas da própria org
--   MANAGER / STAFF        -> negado (somente leitura) — programa/branding/
--                             recompensas são identidade e economia do
--                             negócio, mesmo nível de sensibilidade de
--                             organização/feature flags no 4.6B, não de
--                             unidade operacional.
--
-- Decisões aprovadas (fechamento do plano 4.6C):
--   1. loyalty_programs.type é IMUTÁVEL depois de criado — nenhuma function
--      aqui aceita mudar `type`.
--   2. loyalty_programs.rules só aceita as chaves já conhecidas por
--      `ruleKeyLabel` (src/lib/admin/status.ts), whitelisted por `type`.
--      Chave fora da whitelist do tipo -> `invalid_rules` (nunca grava).
--      TIER/CUSTOM não têm chave whitelisted nesta etapa (mecânica ainda
--      não suportada por formulário estruturado) — programas desses tipos
--      só editam nome/status aqui.
--   3. Não há RPC de CRIAR programa nesta etapa — só administrar os já
--      existentes.
--   4. `logo_url` é só texto (o estabelecimento cola um link já hospedado
--      em outro lugar) — sem Storage/upload; validado como http(s) para
--      nunca aceitar `javascript:`/outro esquema.
--
-- NÃO cria: motor de concessão/resgate, NFC, QR, campanhas, wallets, IA.
-- NÃO altera nenhuma policy existente nem o helper `admin_org_actor_role`.

-- ===========================================================================
-- admin_update_program — nome, status e regras (whitelist por tipo) de
-- loyalty_programs. Somente OWNER / PLATFORM_ADMIN. `type` nunca é parâmetro.
-- ===========================================================================
create function public.admin_update_program(
  p_program_id uuid,
  p_name       text default null,
  p_status     text default null,
  p_rules      jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      uuid;
  v_type     text;
  v_actor    text;
  v_name     text;
  v_fields   text[] := array[]::text[];
  v_allowed  text[];
  v_key      text;
  v_val      jsonb;
  v_before   public.loyalty_programs%rowtype;
  v_after    public.loyalty_programs%rowtype;
begin
  select organization_id, type into v_org, v_type
  from public.loyalty_programs where id = p_program_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_actor := public.admin_org_actor_role(v_org);
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_before from public.loyalty_programs where id = p_program_id;

  if p_name is not null then
    v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
    if length(v_name) < 2 or length(v_name) > 200 or v_name ~ '[[:cntrl:]]' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_name');
    end if;
    v_fields := v_fields || 'name';
  end if;

  if p_status is not null and p_status not in ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;
  if p_status is not null then
    v_fields := v_fields || 'status';
  end if;

  -- Whitelist de chaves de `rules`, por `type` — nunca aceita chave
  -- desconhecida (evita inventar campo que a UI/ledger não interpretam).
  v_allowed := case v_type
    when 'STAMP'  then array['target', 'stamps_target', 'max_per_day', 'expires_days']
    when 'VISIT'  then array['target', 'visits_target', 'min_interval_minutes', 'max_per_day', 'expires_days']
    when 'POINTS' then array['target', 'points_target', 'points_per_visit', 'points_per_currency', 'expires_days']
    else array[]::text[]  -- TIER / CUSTOM: sem editor estruturado nesta etapa
  end;

  if p_rules is not null and p_rules <> '{}'::jsonb then
    if jsonb_typeof(p_rules) <> 'object' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_rules');
    end if;
    for v_key, v_val in select * from jsonb_each(p_rules) loop
      if not (v_key = any(v_allowed)) then
        return jsonb_build_object('ok', false, 'reason', 'invalid_rules');
      end if;
      if jsonb_typeof(v_val) <> 'number'
         or (v_val::text)::numeric < 0
         or (v_val::text)::numeric > 100000
         or (v_val::text)::numeric <> trunc((v_val::text)::numeric) then
        return jsonb_build_object('ok', false, 'reason', 'invalid_rules');
      end if;
    end loop;
    v_fields := v_fields || 'rules';
  end if;

  if array_length(v_fields, 1) is null then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  update public.loyalty_programs set
    name   = coalesce(v_name, name),
    status = coalesce(p_status, status),
    rules  = case
               when p_rules is null then rules
               else coalesce(rules, '{}'::jsonb) || p_rules
             end
  where id = p_program_id;

  select * into v_after from public.loyalty_programs where id = p_program_id;

  if v_before is distinct from v_after then
    insert into public.audit_logs
      (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values
      (v_org, auth.uid(), 'program.updated', 'loyalty_program', p_program_id,
       jsonb_build_object('fields', to_jsonb(v_fields), 'actorRole', v_actor));
  end if;

  return jsonb_build_object('ok', true, 'program', jsonb_build_object(
    'id', v_after.id, 'name', v_after.name, 'type', v_after.type,
    'status', v_after.status, 'rules', v_after.rules
  ));
end;
$$;

comment on function public.admin_update_program(uuid, text, text, jsonb) is
  'ETAPA 4.6C. Atualiza nome/status/rules (whitelist por type) de loyalty_programs. OWNER ou PLATFORM_ADMIN. type nunca editavel. Registra audit_logs (program.updated). Retorno: { ok, program } | { ok:false, reason }.';

-- ===========================================================================
-- admin_upsert_program_branding — identidade visual (1:1). Formulário
-- sempre envia o conjunto completo (mesmo padrão do editor único da UI);
-- valores ausentes gravam NULL/`CLASSIC` (limpar é um estado válido,
-- coberto pela UI com as cores padrão da Fidelize). Somente OWNER /
-- PLATFORM_ADMIN.
-- ===========================================================================
create function public.admin_upsert_program_branding(
  p_program_id      uuid,
  p_logo_url        text default null,
  p_primary_color   text default null,
  p_secondary_color text default null,
  p_background_color text default null,
  p_text_color      text default null,
  p_card_style      text default 'CLASSIC',
  p_headline        text default null,
  p_description     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org        uuid;
  v_actor      text;
  v_logo       text;
  v_primary    text;
  v_secondary  text;
  v_background text;
  v_text       text;
  v_card_style text;
  v_headline   text;
  v_description text;
begin
  select organization_id into v_org
  from public.loyalty_programs where id = p_program_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_actor := public.admin_org_actor_role(v_org);
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_logo := nullif(btrim(coalesce(p_logo_url, '')), '');
  if v_logo is not null and (length(v_logo) > 2048 or v_logo !~ '^https?://\S+$') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_logo_url');
  end if;

  v_primary    := nullif(upper(btrim(coalesce(p_primary_color, ''))), '');
  v_secondary  := nullif(upper(btrim(coalesce(p_secondary_color, ''))), '');
  v_background := nullif(upper(btrim(coalesce(p_background_color, ''))), '');
  v_text       := nullif(upper(btrim(coalesce(p_text_color, ''))), '');

  if (v_primary is not null and v_primary !~ '^#[0-9A-F]{6}$')
     or (v_secondary is not null and v_secondary !~ '^#[0-9A-F]{6}$')
     or (v_background is not null and v_background !~ '^#[0-9A-F]{6}$')
     or (v_text is not null and v_text !~ '^#[0-9A-F]{6}$') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_color');
  end if;

  v_card_style := upper(btrim(coalesce(p_card_style, 'CLASSIC')));
  if v_card_style not in ('CLASSIC', 'MINIMAL', 'BOLD') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_card_style');
  end if;

  v_headline := nullif(btrim(coalesce(p_headline, '')), '');
  if v_headline is not null and length(v_headline) > 120 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_headline');
  end if;

  v_description := nullif(btrim(coalesce(p_description, '')), '');
  if v_description is not null and length(v_description) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_description');
  end if;

  insert into public.program_branding
    (program_id, logo_url, primary_color, secondary_color, background_color,
     text_color, card_style, headline, description)
  values
    (p_program_id, v_logo, v_primary, v_secondary, v_background,
     v_text, v_card_style, v_headline, v_description)
  on conflict (program_id) do update set
    logo_url         = excluded.logo_url,
    primary_color    = excluded.primary_color,
    secondary_color  = excluded.secondary_color,
    background_color = excluded.background_color,
    text_color       = excluded.text_color,
    card_style       = excluded.card_style,
    headline         = excluded.headline,
    description      = excluded.description;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (v_org, auth.uid(), 'program.branding_updated', 'program_branding', p_program_id,
     jsonb_build_object('actorRole', v_actor));

  return jsonb_build_object('ok', true, 'branding', (
    select jsonb_build_object(
      'logo_url', b.logo_url, 'primary_color', b.primary_color,
      'secondary_color', b.secondary_color, 'background_color', b.background_color,
      'text_color', b.text_color, 'card_style', b.card_style,
      'headline', b.headline, 'description', b.description
    )
    from public.program_branding b where b.program_id = p_program_id
  ));
end;
$$;

comment on function public.admin_upsert_program_branding(uuid, text, text, text, text, text, text, text, text) is
  'ETAPA 4.6C. Cria/atualiza program_branding (1:1). OWNER ou PLATFORM_ADMIN. logo_url validado como http(s); cores como #RRGGBB; card_style em CLASSIC|MINIMAL|BOLD. Registra audit_logs (program.branding_updated). Retorno: { ok, branding } | { ok:false, reason }.';

-- ===========================================================================
-- Recompensas (rewards) — OWNER / PLATFORM_ADMIN.
-- ===========================================================================
create function public.admin_create_reward(
  p_program_id  uuid,
  p_name        text,
  p_reward_type text,
  p_description text default null,
  p_threshold   integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_actor text;
  v_name text;
  v_description text;
  v_id uuid;
begin
  select organization_id into v_org
  from public.loyalty_programs where id = p_program_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_actor := public.admin_org_actor_role(v_org);
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_name is null or length(p_name) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;
  v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  if length(v_name) < 2 or v_name ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;

  if p_reward_type is null or p_reward_type not in ('FREE_ITEM', 'DISCOUNT', 'CASHBACK', 'CUSTOM') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_reward_type');
  end if;

  if p_threshold is null or p_threshold < 0 or p_threshold > 1000000 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_threshold');
  end if;

  v_description := nullif(btrim(left(coalesce(p_description, ''), 500)), '');

  insert into public.rewards
    (organization_id, program_id, name, description, reward_type, threshold)
  values
    (v_org, p_program_id, v_name, v_description, p_reward_type, p_threshold)
  returning id into v_id;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (v_org, auth.uid(), 'reward.created', 'reward', v_id,
     jsonb_build_object('actorRole', v_actor));

  return jsonb_build_object('ok', true, 'reward', (
    select jsonb_build_object(
      'id', r.id, 'name', r.name, 'description', r.description,
      'reward_type', r.reward_type, 'threshold', r.threshold, 'status', r.status
    )
    from public.rewards r where r.id = v_id
  ));
end;
$$;

comment on function public.admin_create_reward(uuid, text, text, text, integer) is
  'ETAPA 4.6C. Cria uma recompensa (rewards). OWNER ou PLATFORM_ADMIN da organizacao dona do programa (resolvida da propria linha, nunca do cliente). Registra audit_logs (reward.created).';

create function public.admin_update_reward(
  p_reward_id   uuid,
  p_name        text default null,
  p_description text default null,
  p_reward_type text default null,
  p_threshold   integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_actor text;
  v_name text;
  v_description text;
  v_has_description boolean := false;
  v_fields text[] := array[]::text[];
begin
  select organization_id into v_org
  from public.rewards where id = p_reward_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_actor := public.admin_org_actor_role(v_org);
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_name is not null then
    v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
    if length(v_name) < 2 or length(v_name) > 200 or v_name ~ '[[:cntrl:]]' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_name');
    end if;
    v_fields := v_fields || 'name';
  end if;

  if p_description is not null then
    v_description := nullif(btrim(left(p_description, 500)), '');
    v_has_description := true;
    v_fields := v_fields || 'description';
  end if;

  if p_reward_type is not null then
    if p_reward_type not in ('FREE_ITEM', 'DISCOUNT', 'CASHBACK', 'CUSTOM') then
      return jsonb_build_object('ok', false, 'reason', 'invalid_reward_type');
    end if;
    v_fields := v_fields || 'reward_type';
  end if;

  if p_threshold is not null then
    if p_threshold < 0 or p_threshold > 1000000 then
      return jsonb_build_object('ok', false, 'reason', 'invalid_threshold');
    end if;
    v_fields := v_fields || 'threshold';
  end if;

  if array_length(v_fields, 1) is null then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  update public.rewards set
    name        = coalesce(v_name, name),
    description = case when v_has_description then v_description else description end,
    reward_type = coalesce(p_reward_type, reward_type),
    threshold   = coalesce(p_threshold, threshold)
  where id = p_reward_id;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (v_org, auth.uid(), 'reward.updated', 'reward', p_reward_id,
     jsonb_build_object('fields', to_jsonb(v_fields), 'actorRole', v_actor));

  return jsonb_build_object('ok', true, 'reward', (
    select jsonb_build_object(
      'id', r.id, 'name', r.name, 'description', r.description,
      'reward_type', r.reward_type, 'threshold', r.threshold, 'status', r.status
    )
    from public.rewards r where r.id = p_reward_id
  ));
end;
$$;

comment on function public.admin_update_reward(uuid, text, text, text, integer) is
  'ETAPA 4.6C. Atualiza uma recompensa (parametro null = nao altera; description aceita string vazia para limpar). OWNER ou PLATFORM_ADMIN. Registra audit_logs (reward.updated).';

create function public.admin_set_reward_status(
  p_reward_id uuid,
  p_status    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_actor text;
  v_from text;
begin
  if p_status is null or p_status not in ('ACTIVE', 'PAUSED', 'ARCHIVED') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  select organization_id, status into v_org, v_from
  from public.rewards where id = p_reward_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_actor := public.admin_org_actor_role(v_org);
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_from is distinct from p_status then
    update public.rewards set status = p_status where id = p_reward_id;
    insert into public.audit_logs
      (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values
      (v_org, auth.uid(), 'reward.status_changed', 'reward', p_reward_id,
       jsonb_build_object('from', v_from, 'to', p_status, 'actorRole', v_actor));
  end if;

  return jsonb_build_object('ok', true, 'reward', jsonb_build_object(
    'id', p_reward_id, 'status', p_status
  ));
end;
$$;

comment on function public.admin_set_reward_status(uuid, text) is
  'ETAPA 4.6C. Ativa/pausa/arquiva uma recompensa (status ACTIVE|PAUSED|ARCHIVED). OWNER ou PLATFORM_ADMIN. Registra audit_logs (reward.status_changed).';

-- ===========================================================================
-- Privilégios — EXECUTE só para `authenticated` (nunca `anon`, nunca
-- `public`). Postgres concede a `public` por padrão em toda function nova,
-- e `anon`/`authenticated` herdam de `public` — revoga dos dois
-- explicitamente antes de conceder (mesma correção aplicada em
-- 20260910160000, aplicada aqui desde a criação).
-- ===========================================================================
revoke execute on function public.admin_update_program(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.admin_update_program(uuid, text, text, jsonb)
  to authenticated;

revoke execute on function public.admin_upsert_program_branding(uuid, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.admin_upsert_program_branding(uuid, text, text, text, text, text, text, text, text)
  to authenticated;

revoke execute on function public.admin_create_reward(uuid, text, text, text, integer)
  from public, anon;
grant execute on function public.admin_create_reward(uuid, text, text, text, integer)
  to authenticated;

revoke execute on function public.admin_update_reward(uuid, text, text, text, integer)
  from public, anon;
grant execute on function public.admin_update_reward(uuid, text, text, text, integer)
  to authenticated;

revoke execute on function public.admin_set_reward_status(uuid, text)
  from public, anon;
grant execute on function public.admin_set_reward_status(uuid, text)
  to authenticated;
