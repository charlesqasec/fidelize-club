-- Fidelize.club — ETAPA 4.6F: homologação manual com conta real de
-- estabelecimento (2026-09-12) — regra oficial do MVP: "Configurações
-- estruturais (nome, slug, status, unidades, canais e acessos):
-- estabelecimento consulta; criação/edição/desativação ficam com Fidelize
-- Admin." O acesso principal do estabelecimento no MVP é o OWNER — mas ele
-- não deve mais escrever aqui: só consultar.
--
-- Correção: as 8 RPCs de organização/unidades (4.6B,
-- `20260910150000_establishment_panel_admin_rpcs.sql`) e equipe (4.6D,
-- `20260911150000_team_management_admin_rpcs.sql`) aceitavam OWNER (e
-- unidades também aceitavam MANAGER). `CREATE OR REPLACE` muda só o portão
-- de autorização de cada function para `v_actor <> 'PLATFORM_ADMIN'` —
-- assinatura, comentário-base, grants e todo o resto do corpo continuam
-- idênticos. As proteções internas de `admin_add_member` /
-- `admin_update_member_role` / `admin_set_member_status` que só faziam
-- sentido quando OWNER podia chamar (ex.: "OWNER nunca promove a OWNER",
-- proteção do último OWNER) ficam no código, agora inertes sob
-- PLATFORM_ADMIN — não removidas, para não perder a proteção no dia em que
-- o portão for reaberto para OWNER.
--
-- Nenhuma tabela, policy ou trigger é tocada. `admin_org_actor_role`
-- continua resolvendo OWNER/MANAGER/STAFF normalmente.

create or replace function public.admin_update_organization(
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
  if v_actor is null or v_actor <> 'PLATFORM_ADMIN' then
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
  'ETAPA 4.6F (era 4.6B). Atualiza organizations.name. Somente PLATFORM_ADMIN — regra do MVP pos-homologacao: configuracoes estruturais sao exclusivas do Fidelize Admin. Registra audit_logs (organization.updated).';

create or replace function public.admin_update_feature_flags(
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
  if v_actor is null or v_actor <> 'PLATFORM_ADMIN' then
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
  'ETAPA 4.6F (era 4.6B). Atualiza organization_feature_flags. Somente PLATFORM_ADMIN — regra do MVP pos-homologacao. web_card_enabled imutavel. Wallet/Web Push rebaixados ao teto de platform_settings. Registra audit_logs.';

create or replace function public.admin_create_location(
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
  if v_actor is null or v_actor <> 'PLATFORM_ADMIN' then
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
  'ETAPA 4.6F (era 4.6B). Cria uma unidade (locations). Somente PLATFORM_ADMIN — regra do MVP pos-homologacao: unidades sao configuracao estrutural exclusiva do Fidelize Admin. Registra audit_logs (location.created).';

create or replace function public.admin_update_location(
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
  if v_actor is null or v_actor <> 'PLATFORM_ADMIN' then
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
  'ETAPA 4.6F (era 4.6B). Atualiza uma unidade. Somente PLATFORM_ADMIN — regra do MVP pos-homologacao. Registra audit_logs (location.updated).';

create or replace function public.admin_set_location_status(
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
  if v_actor is null or v_actor <> 'PLATFORM_ADMIN' then
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
  'ETAPA 4.6F (era 4.6B). Ativa/desativa uma unidade. Somente PLATFORM_ADMIN — regra do MVP pos-homologacao. Registra audit_logs (location.status_changed).';

create or replace function public.admin_add_member(
  p_organization_id uuid,
  p_user_id         uuid,
  p_role            text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := public.admin_org_actor_role(p_organization_id);
  v_id    uuid;
begin
  if v_actor is null or v_actor <> 'PLATFORM_ADMIN' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_role is null or p_role not in ('OWNER', 'MANAGER', 'STAFF') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_role');
  end if;

  -- Preservada por simetria com a versão 4.6D (inerte sob PLATFORM_ADMIN,
  -- que já pode atribuir qualquer papel) — não removida, para caso o
  -- portão volte a aceitar OWNER no futuro.
  if v_actor = 'OWNER' and p_role = 'OWNER' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (p_organization_id, p_user_id, p_role, 'ACTIVE')
  on conflict (organization_id, user_id) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'already_member');
  end if;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (p_organization_id, auth.uid(), 'member.added', 'organization_member', v_id,
     jsonb_build_object('role', p_role, 'targetUserId', p_user_id, 'actorRole', v_actor));

  return jsonb_build_object('ok', true, 'member', (
    select jsonb_build_object('id', m.id, 'role', m.role, 'status', m.status,
                              'user_id', m.user_id, 'created_at', m.created_at)
    from public.organization_members m where m.id = v_id
  ));
end;
$$;

comment on function public.admin_add_member(uuid, uuid, text) is
  'ETAPA 4.6F (era 4.6D). Vincula um auth.users.id ja existente a organization_members. Somente PLATFORM_ADMIN — regra do MVP pos-homologacao: acesso e equipe do estabelecimento sao configuracao estrutural exclusiva do Fidelize Admin. Registra audit_logs (member.added).';

create or replace function public.admin_update_member_role(
  p_organization_id uuid,
  p_member_id       uuid,
  p_role            text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor        text := public.admin_org_actor_role(p_organization_id);
  v_org          uuid;
  v_from         text;
  v_other_owners integer;
begin
  if v_actor is null or v_actor <> 'PLATFORM_ADMIN' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select organization_id, role into v_org, v_from
  from public.organization_members where id = p_member_id;

  if v_org is null or v_org <> p_organization_id then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_role is null or p_role not in ('OWNER', 'MANAGER', 'STAFF') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_role');
  end if;

  -- Preservada por simetria com a versão 4.6D (inerte sob PLATFORM_ADMIN).
  if v_actor = 'OWNER' and (v_from = 'OWNER' or p_role = 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_from = p_role then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  if v_from = 'OWNER' and p_role <> 'OWNER' then
    select count(*) into v_other_owners
    from public.organization_members
    where organization_id = p_organization_id
      and role = 'OWNER'
      and status = 'ACTIVE'
      and id <> p_member_id;
    if v_other_owners = 0 then
      return jsonb_build_object('ok', false, 'reason', 'last_owner');
    end if;
  end if;

  update public.organization_members set role = p_role where id = p_member_id;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (p_organization_id, auth.uid(), 'member.role_changed', 'organization_member', p_member_id,
     jsonb_build_object('from', v_from, 'to', p_role, 'actorRole', v_actor));

  return jsonb_build_object('ok', true, 'member', jsonb_build_object(
    'id', p_member_id, 'role', p_role
  ));
end;
$$;

comment on function public.admin_update_member_role(uuid, uuid, text) is
  'ETAPA 4.6F (era 4.6D). Altera organization_members.role. Somente PLATFORM_ADMIN — regra do MVP pos-homologacao. Bloqueia rebaixar o ultimo OWNER ACTIVE (reason last_owner). Registra audit_logs (member.role_changed).';

create or replace function public.admin_set_member_status(
  p_organization_id uuid,
  p_member_id       uuid,
  p_status          text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor        text := public.admin_org_actor_role(p_organization_id);
  v_org          uuid;
  v_role         text;
  v_from         text;
  v_other_owners integer;
begin
  if v_actor is null or v_actor <> 'PLATFORM_ADMIN' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_status is null or p_status not in ('ACTIVE', 'SUSPENDED') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  select organization_id, role, status into v_org, v_role, v_from
  from public.organization_members where id = p_member_id;

  if v_org is null or v_org <> p_organization_id then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Preservada por simetria com a versão 4.6D (inerte sob PLATFORM_ADMIN).
  if v_actor = 'OWNER' and v_role = 'OWNER' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_from = p_status then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  if v_role = 'OWNER' and p_status <> 'ACTIVE' then
    select count(*) into v_other_owners
    from public.organization_members
    where organization_id = p_organization_id
      and role = 'OWNER'
      and status = 'ACTIVE'
      and id <> p_member_id;
    if v_other_owners = 0 then
      return jsonb_build_object('ok', false, 'reason', 'last_owner');
    end if;
  end if;

  update public.organization_members set status = p_status where id = p_member_id;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (p_organization_id, auth.uid(), 'member.status_changed', 'organization_member', p_member_id,
     jsonb_build_object('from', v_from, 'to', p_status, 'actorRole', v_actor));

  return jsonb_build_object('ok', true, 'member', jsonb_build_object(
    'id', p_member_id, 'status', p_status
  ));
end;
$$;

comment on function public.admin_set_member_status(uuid, uuid, text) is
  'ETAPA 4.6F (era 4.6D). Suspende/reativa um membro (nunca remove). Somente PLATFORM_ADMIN — regra do MVP pos-homologacao. Bloqueia suspender o ultimo OWNER ACTIVE (reason last_owner). Registra audit_logs (member.status_changed).';
