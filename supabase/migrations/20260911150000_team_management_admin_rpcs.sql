-- Fidelize.club — ETAPA 4.6D: gestão de equipe do estabelecimento
-- (organization_members). Mesma postura das ETAPAs 4.0.1 / 5.0B / 4.6B /
-- 4.6C: nenhuma tabela base ganha policy de INSERT/UPDATE/DELETE para
-- `authenticated`. Toda escrita passa por function SECURITY DEFINER com
-- `search_path` fixo, que valida `auth.uid()`, a organização e o papel
-- ANTES de escrever, sem SQL dinâmico, e registra em `audit_logs`.
-- Reutiliza `admin_org_actor_role` (20260910150000) — nenhum helper novo de
-- autorização.
--
-- RBAC (validado no servidor, dentro de cada function):
--   PLATFORM_ADMIN -> qualquer organização; pode promover/alterar/suspender
--                     qualquer papel, inclusive OWNER.
--   OWNER          -> só a própria organização; adiciona/altera/suspende
--                     apenas MANAGER/STAFF; NUNCA promove ninguém a OWNER;
--                     NUNCA altera (nem suspende) outro membro que já seja
--                     OWNER — nem a si mesmo por esta via.
--   MANAGER/STAFF/não-membro -> negado (somente leitura).
--
-- Cross-tenant: `p_organization_id` autoriza o ator via
-- `admin_org_actor_role`; o membro alvo (`p_member_id`) é revalidado contra
-- essa mesma organização (nunca confia que o `organization_id` do membro
-- bate com o parâmetro só porque o cliente disse isso).
--
-- Proteção do último OWNER: nenhuma operação pode deixar a organização sem
-- nenhum OWNER com status ACTIVE — `admin_update_member_role` (rebaixar) e
-- `admin_set_member_status` (suspender) contam os outros OWNERs ativos antes
-- de aplicar a mudança.
--
-- `admin_add_member` nunca cria conta Supabase Auth — isso é
-- responsabilidade da Server Action (`src/lib/admin/team-panel/actions.ts`,
-- Auth Admin API com `service_role`, fora do banco). A RPC só grava o
-- vínculo em `organization_members` para um `auth.users.id` que já existe
-- (seja porque acabou de ser criado via convite, seja porque o usuário já
-- tinha conta Fidelize noutra organização) — nunca faz UPSERT sobre uma
-- linha existente (evita reabrir, por este caminho, a proteção de "OWNER
-- nunca mexe em outro OWNER" via um insert que colidisse com o registro
-- atual); reativar um vínculo suspenso é sempre `admin_set_member_status`.
--
-- NÃO implementa remoção física de membro nesta etapa — suspender preserva
-- auditoria e é suficiente para o MVP.

-- ===========================================================================
-- admin_add_member — vincula um `auth.users.id` já existente à organização.
-- ===========================================================================
create function public.admin_add_member(
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
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
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

  -- OWNER nunca promove ninguém a OWNER — só PLATFORM_ADMIN.
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
  'ETAPA 4.6D. Vincula um auth.users.id ja existente a organization_members (status ACTIVE). OWNER (so MANAGER/STAFF) ou PLATFORM_ADMIN (qualquer papel). Nao faz upsert sobre vinculo existente (reason already_member). Registra audit_logs (member.added).';

-- ===========================================================================
-- admin_update_member_role — altera o papel de um membro já vinculado.
-- ===========================================================================
create function public.admin_update_member_role(
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
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
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

  -- OWNER nunca mexe em outro OWNER (nem promove ninguém a OWNER).
  if v_actor = 'OWNER' and (v_from = 'OWNER' or p_role = 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_from = p_role then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  -- Nunca deixar a organização sem nenhum OWNER ACTIVE.
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
  'ETAPA 4.6D. Altera organization_members.role. OWNER (so entre MANAGER/STAFF, nunca em/para OWNER) ou PLATFORM_ADMIN (qualquer papel). Bloqueia rebaixar o ultimo OWNER ACTIVE (reason last_owner). Registra audit_logs (member.role_changed).';

-- ===========================================================================
-- admin_set_member_status — suspende/reativa um membro (nunca remove).
-- ===========================================================================
create function public.admin_set_member_status(
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
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
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

  -- OWNER nunca mexe em outro OWNER (nem em si mesmo por esta via).
  if v_actor = 'OWNER' and v_role = 'OWNER' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_from = p_status then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  -- Nunca suspender o último OWNER ACTIVE.
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
  'ETAPA 4.6D. Suspende/reativa um membro (status ACTIVE|SUSPENDED; nunca remove). OWNER (nunca sobre outro OWNER) ou PLATFORM_ADMIN. Bloqueia suspender o ultimo OWNER ACTIVE (reason last_owner). Registra audit_logs (member.status_changed).';

-- ===========================================================================
-- profiles — nova policy de leitura: colegas de organização.
--
-- `profiles_select_own` (20260908060231) só permite `id = auth.uid() or
-- is_platform_admin()` — suficiente até aqui, mas a Equipe do painel do
-- estabelecimento (ETAPA 4.6D) precisa mostrar nome/e-mail de MANAGER/STAFF
-- para o OWNER (e entre colegas), o que a policy atual não cobre (só
-- platform_admin enxerga perfil alheio). Policy adicional, permissiva
-- (Postgres combina múltiplas policies de SELECT com OR — nenhuma policy
-- existente é alterada): visível para quem compartilha pelo menos uma
-- organização ativa com o dono do perfil. Sem risco de recursão: usa
-- `is_org_member` (SECURITY DEFINER sobre organization_members), que nunca
-- consulta `profiles`.
-- ===========================================================================
create policy profiles_select_org_mates
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      where om.user_id = profiles.id
        and om.status = 'ACTIVE'
        and public.is_org_member(om.organization_id)
    )
  );

comment on policy profiles_select_org_mates on public.profiles is
  'ETAPA 4.6D. Perfil visivel para quem compartilha uma organizacao ativa com o dono (equipe do estabelecimento se enxerga). Adicional a profiles_select_own (self / platform_admin) — nao substitui.';

-- ===========================================================================
-- Privilégios — EXECUTE só para `authenticated` (nunca `anon`, nunca
-- `public`). Postgres concede a `public` por padrão em toda function nova, e
-- `anon`/`authenticated` herdam de `public` — revoga dos dois explicitamente
-- antes de conceder (mesma correção aplicada em 20260910160000, aplicada
-- aqui desde a criação).
-- ===========================================================================
revoke execute on function public.admin_add_member(uuid, uuid, text)
  from public, anon;
grant execute on function public.admin_add_member(uuid, uuid, text)
  to authenticated;

revoke execute on function public.admin_update_member_role(uuid, uuid, text)
  from public, anon;
grant execute on function public.admin_update_member_role(uuid, uuid, text)
  to authenticated;

revoke execute on function public.admin_set_member_status(uuid, uuid, text)
  from public, anon;
grant execute on function public.admin_set_member_status(uuid, uuid, text)
  to authenticated;
