-- Fidelize.club — ETAPA 4.6B / BLOCO 1: painel do estabelecimento operacional.
--
-- Primeiro conjunto de ESCRITAS administrativas do painel do estabelecimento
-- (/admin/org/[organizationId]/configuracoes). Mesma postura das ETAPAs
-- 4.0.1 / 5.0B: nenhuma tabela base ganha policy de INSERT/UPDATE/DELETE
-- para `authenticated`. Toda escrita passa por function SECURITY DEFINER
-- com `search_path` fixo, que valida `auth.uid()`, a organização e o papel
-- ANTES de escrever, sem SQL dinâmico, e registra em `audit_logs`.
--
-- RBAC (validado no servidor, dentro de cada function):
--   PLATFORM_ADMIN  -> qualquer organização
--   OWNER           -> organização, feature flags e unidades da própria org
--   MANAGER         -> apenas unidades (criar/editar/ativar/desativar) da
--                      própria org — a operação segura deste bloco
--   STAFF / não-membro -> negado (somente leitura)
--
-- Cross-tenant: o chamador nunca informa o papel; ele é derivado de
-- `org_role(organization_id)`. Nas RPCs de unidade o `organization_id` é
-- lido da própria linha de `locations`, nunca do cliente.
--
-- NÃO cria: programa, recompensas, program_join_links, QR/NFC, motor de
-- fidelidade, campanhas, wallets. NÃO altera nenhuma policy existente.
-- `web_card_enabled` continua imutável (canal oficial permanente).

-- ===========================================================================
-- Helper interno de autorização — NÃO exposto como RPC.
-- ===========================================================================
create function public.admin_org_actor_role(p_organization_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or p_organization_id is null then
    return null;
  end if;
  if public.is_platform_admin() then
    return 'PLATFORM_ADMIN';
  end if;
  return public.org_role(p_organization_id);  -- OWNER / MANAGER / STAFF / null
end;
$$;

comment on function public.admin_org_actor_role(uuid) is
  'ETAPA 4.6B. Papel efetivo do usuario autenticado sobre uma organizacao no painel do estabelecimento: PLATFORM_ADMIN, OWNER, MANAGER, STAFF ou null. Uso interno das RPCs admin_* - nao exposta a anon/authenticated.';

revoke all on function public.admin_org_actor_role(uuid) from public;

-- ===========================================================================
-- admin_update_organization — identidade básica da organização.
-- Somente OWNER / PLATFORM_ADMIN. Campo editável: name (slug é identidade
-- de URL, status é decisão de plataforma/contrato — fora deste bloco).
-- ===========================================================================
create function public.admin_update_organization(
  p_organization_id uuid,
  p_name            text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := public.admin_org_actor_role(p_organization_id);
  v_name  text;
begin
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_name is null or length(p_name) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;
  v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  if length(v_name) < 2 or v_name ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;

  update public.organizations
    set name = v_name
  where id = p_organization_id
    and name is distinct from v_name;

  if found then
    insert into public.audit_logs
      (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values
      (p_organization_id, auth.uid(), 'organization.updated', 'organization',
       p_organization_id,
       jsonb_build_object('fields', jsonb_build_array('name'), 'actorRole', v_actor));
  end if;

  return jsonb_build_object('ok', true, 'organization', (
    select jsonb_build_object('id', o.id, 'name', o.name, 'slug', o.slug, 'status', o.status)
    from public.organizations o where o.id = p_organization_id
  ));
end;
$$;

comment on function public.admin_update_organization(uuid, text) is
  'ETAPA 4.6B. Atualiza organizations.name. OWNER ou PLATFORM_ADMIN. SECURITY DEFINER; valida papel via admin_org_actor_role; registra audit_logs (organization.updated). Retorno: { ok, organization } | { ok:false, reason }.';

-- ===========================================================================
-- admin_update_feature_flags — organization_feature_flags.
-- Somente OWNER / PLATFORM_ADMIN. Parâmetro null = não altera aquele flag.
-- web_card_enabled nunca é editável. Wallet/Web Push: efetivo = plataforma
-- AND organização; pedido acima do teto da plataforma é rebaixado (clamped).
-- ===========================================================================
create function public.admin_update_feature_flags(
  p_organization_id           uuid,
  p_reviews_enabled           boolean default null,
  p_internal_feedback_enabled boolean default null,
  p_web_push_enabled          boolean default null,
  p_google_wallet_enabled     boolean default null,
  p_apple_wallet_enabled      boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  text := public.admin_org_actor_role(p_organization_id);
  v_ps     record;
  v_before public.organization_feature_flags%rowtype;
  v_after  public.organization_feature_flags%rowtype;
  v_changed text[] := array[]::text[];
  v_clamped text[] := array[]::text[];
  v_web_push boolean;
  v_google   boolean;
  v_apple    boolean;
begin
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_before
  from public.organization_feature_flags
  where organization_id = p_organization_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select google_wallet_enabled, apple_wallet_enabled, web_push_enabled
    into v_ps
  from public.platform_settings where id = true;

  -- Rebaixa pedido de habilitar canal que a plataforma não permite.
  v_web_push := (coalesce(p_web_push_enabled, v_before.web_push_enabled))
                and (not coalesce(p_web_push_enabled, false) or coalesce(v_ps.web_push_enabled, false));
  v_google   := (coalesce(p_google_wallet_enabled, v_before.google_wallet_enabled))
                and (not coalesce(p_google_wallet_enabled, false) or coalesce(v_ps.google_wallet_enabled, false));
  v_apple    := (coalesce(p_apple_wallet_enabled, v_before.apple_wallet_enabled))
                and (not coalesce(p_apple_wallet_enabled, false) or coalesce(v_ps.apple_wallet_enabled, false));

  if coalesce(p_web_push_enabled, false) and not coalesce(v_ps.web_push_enabled, false) then
    v_clamped := v_clamped || 'web_push_enabled';
  end if;
  if coalesce(p_google_wallet_enabled, false) and not coalesce(v_ps.google_wallet_enabled, false) then
    v_clamped := v_clamped || 'google_wallet_enabled';
  end if;
  if coalesce(p_apple_wallet_enabled, false) and not coalesce(v_ps.apple_wallet_enabled, false) then
    v_clamped := v_clamped || 'apple_wallet_enabled';
  end if;

  update public.organization_feature_flags set
    reviews_enabled           = coalesce(p_reviews_enabled, reviews_enabled),
    internal_feedback_enabled = coalesce(p_internal_feedback_enabled, internal_feedback_enabled),
    web_push_enabled          = v_web_push,
    google_wallet_enabled     = v_google,
    apple_wallet_enabled      = v_apple
  where organization_id = p_organization_id;

  select * into v_after
  from public.organization_feature_flags
  where organization_id = p_organization_id;

  if v_before.reviews_enabled is distinct from v_after.reviews_enabled then
    v_changed := v_changed || 'reviews_enabled'; end if;
  if v_before.internal_feedback_enabled is distinct from v_after.internal_feedback_enabled then
    v_changed := v_changed || 'internal_feedback_enabled'; end if;
  if v_before.web_push_enabled is distinct from v_after.web_push_enabled then
    v_changed := v_changed || 'web_push_enabled'; end if;
  if v_before.google_wallet_enabled is distinct from v_after.google_wallet_enabled then
    v_changed := v_changed || 'google_wallet_enabled'; end if;
  if v_before.apple_wallet_enabled is distinct from v_after.apple_wallet_enabled then
    v_changed := v_changed || 'apple_wallet_enabled'; end if;

  if array_length(v_changed, 1) is not null then
    insert into public.audit_logs
      (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values
      (p_organization_id, auth.uid(), 'organization.feature_flags_updated',
       'organization_feature_flags', p_organization_id,
       jsonb_build_object('fields', to_jsonb(v_changed), 'clamped', to_jsonb(v_clamped),
                          'actorRole', v_actor));
  end if;

  return jsonb_build_object(
    'ok', true,
    'clamped', to_jsonb(v_clamped),
    'flags', jsonb_build_object(
      'web_card_enabled', v_after.web_card_enabled,
      'reviews_enabled', v_after.reviews_enabled,
      'internal_feedback_enabled', v_after.internal_feedback_enabled,
      'web_push_enabled', v_after.web_push_enabled,
      'google_wallet_enabled', v_after.google_wallet_enabled,
      'apple_wallet_enabled', v_after.apple_wallet_enabled
    )
  );
end;
$$;

comment on function public.admin_update_feature_flags(uuid, boolean, boolean, boolean, boolean, boolean) is
  'ETAPA 4.6B. Atualiza organization_feature_flags (parametro null = nao altera). OWNER ou PLATFORM_ADMIN. web_card_enabled imutavel. Wallet/Web Push rebaixados ao teto de platform_settings (reportado em clamped). Registra audit_logs. Retorno: { ok, flags, clamped } | { ok:false, reason }.';

-- ===========================================================================
-- Unidades (locations) — OWNER / MANAGER / PLATFORM_ADMIN.
-- ===========================================================================
create function public.admin_create_location(
  p_organization_id uuid,
  p_name            text,
  p_slug            text,
  p_address         jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := public.admin_org_actor_role(p_organization_id);
  v_name  text;
  v_slug  text;
  v_id    uuid;
begin
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER', 'MANAGER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_name is null or length(p_name) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;
  v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  if length(v_name) < 2 or v_name ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;

  v_slug := lower(btrim(coalesce(p_slug, '')));
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(v_slug) not between 2 and 60 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_slug');
  end if;

  if p_address is not null and jsonb_typeof(p_address) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_address');
  end if;

  begin
    insert into public.locations (organization_id, name, slug, address)
    values (p_organization_id, v_name, v_slug, p_address)
    returning id into v_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'slug_taken');
  end;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (p_organization_id, auth.uid(), 'location.created', 'location', v_id,
     jsonb_build_object('slug', v_slug, 'actorRole', v_actor));

  return jsonb_build_object('ok', true, 'location', (
    select jsonb_build_object('id', l.id, 'name', l.name, 'slug', l.slug,
                              'status', l.status, 'address', l.address)
    from public.locations l where l.id = v_id
  ));
end;
$$;

comment on function public.admin_create_location(uuid, text, text, jsonb) is
  'ETAPA 4.6B. Cria uma unidade (locations). OWNER, MANAGER ou PLATFORM_ADMIN. SECURITY DEFINER; valida papel, nome e slug; slug unico por organizacao (slug_taken). Registra audit_logs (location.created).';

create function public.admin_update_location(
  p_location_id uuid,
  p_name        text  default null,
  p_slug        text  default null,
  p_address     jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org    uuid;
  v_actor  text;
  v_name   text;
  v_slug   text;
  v_fields text[] := array[]::text[];
begin
  select organization_id into v_org from public.locations where id = p_location_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_actor := public.admin_org_actor_role(v_org);
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER', 'MANAGER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_name is not null then
    v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
    if length(v_name) < 2 or length(v_name) > 200 or v_name ~ '[[:cntrl:]]' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_name');
    end if;
    v_fields := v_fields || 'name';
  end if;

  if p_slug is not null then
    v_slug := lower(btrim(p_slug));
    if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(v_slug) not between 2 and 60 then
      return jsonb_build_object('ok', false, 'reason', 'invalid_slug');
    end if;
    v_fields := v_fields || 'slug';
  end if;

  if p_address is not null and jsonb_typeof(p_address) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_address');
  end if;
  if p_address is not null then
    v_fields := v_fields || 'address';
  end if;

  if array_length(v_fields, 1) is null then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  begin
    update public.locations set
      name    = coalesce(v_name, name),
      slug    = coalesce(v_slug, slug),
      address = case when p_address is null then address else p_address end
    where id = p_location_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'slug_taken');
  end;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (v_org, auth.uid(), 'location.updated', 'location', p_location_id,
     jsonb_build_object('fields', to_jsonb(v_fields), 'actorRole', v_actor));

  return jsonb_build_object('ok', true, 'location', (
    select jsonb_build_object('id', l.id, 'name', l.name, 'slug', l.slug,
                              'status', l.status, 'address', l.address)
    from public.locations l where l.id = p_location_id
  ));
end;
$$;

comment on function public.admin_update_location(uuid, text, text, jsonb) is
  'ETAPA 4.6B. Atualiza uma unidade (parametro null = nao altera). OWNER, MANAGER ou PLATFORM_ADMIN da organizacao dona da unidade (resolvida da propria linha, nunca do cliente). Registra audit_logs (location.updated).';

create function public.admin_set_location_status(
  p_location_id uuid,
  p_status      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org   uuid;
  v_actor text;
  v_from  text;
begin
  if p_status is null or p_status not in ('ACTIVE', 'INACTIVE') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  select organization_id, status into v_org, v_from
  from public.locations where id = p_location_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_actor := public.admin_org_actor_role(v_org);
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER', 'MANAGER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_from is distinct from p_status then
    update public.locations set status = p_status where id = p_location_id;
    insert into public.audit_logs
      (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values
      (v_org, auth.uid(), 'location.status_changed', 'location', p_location_id,
       jsonb_build_object('from', v_from, 'to', p_status, 'actorRole', v_actor));
  end if;

  return jsonb_build_object('ok', true, 'location', jsonb_build_object(
    'id', p_location_id, 'status', p_status
  ));
end;
$$;

comment on function public.admin_set_location_status(uuid, text) is
  'ETAPA 4.6B. Ativa/desativa uma unidade (status ACTIVE|INACTIVE). OWNER, MANAGER ou PLATFORM_ADMIN. Registra audit_logs (location.status_changed).';

-- ===========================================================================
-- Privilégios — EXECUTE só para `authenticated` (nunca `anon`). Postgres
-- concede a PUBLIC por padrão em toda function nova; revogamos e reconcedemos.
-- ===========================================================================
revoke all on function public.admin_update_organization(uuid, text) from public;
grant execute on function public.admin_update_organization(uuid, text) to authenticated;

revoke all on function public.admin_update_feature_flags(uuid, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.admin_update_feature_flags(uuid, boolean, boolean, boolean, boolean, boolean) to authenticated;

revoke all on function public.admin_create_location(uuid, text, text, jsonb) from public;
grant execute on function public.admin_create_location(uuid, text, text, jsonb) to authenticated;

revoke all on function public.admin_update_location(uuid, text, text, jsonb) from public;
grant execute on function public.admin_update_location(uuid, text, text, jsonb) to authenticated;

revoke all on function public.admin_set_location_status(uuid, text) from public;
grant execute on function public.admin_set_location_status(uuid, text) to authenticated;
