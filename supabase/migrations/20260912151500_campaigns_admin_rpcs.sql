-- Fidelize.club — ETAPA 4.6F: homologação manual com conta real de
-- estabelecimento (2026-09-12) — regra oficial do MVP: "Campanhas: o
-- estabelecimento deverá criar/editar/ativar/desativar campanhas padrão,
-- com limite de 5 campanhas ativas. Administração avançada,
-- personalizações e alteração de limite ficam com Fidelize Admin. O
-- limite deverá futuramente ser garantido no backend, não apenas UI."
--
-- Escopo desta etapa (aprovado): CRUD básico de campanhas type='STANDARD'
-- apenas — nome, programa (opcional), período. NÃO implementa envio real
-- (campaign_messages continua sem RPC de escrita), segmentação avançada
-- nem canais. Campanhas type='ADVANCED' (personalizadas, sob orçamento,
-- docs/ARQUITETURA.md seção 6) continuam fora do alcance destas RPCs —
-- exclusivas do Fidelize Admin, criadas/editadas fora deste painel.
--
-- Aprovação (constraint permanente `campaigns_require_approval`,
-- 20260908060215): "o proprietário sempre aprova antes de a campanha ir ao
-- ar" (seção 6). Como só OWNER/PLATFORM_ADMIN podem chamar
-- admin_set_campaign_status, ativar UMA campanha JÁ É o ato de aprovação —
-- a RPC grava approved_by/approved_at do próprio ator na hora de ativar.
--
-- RBAC (validado no servidor, dentro de cada function, via
-- admin_org_actor_role — 20260910150000, nenhum helper novo):
--   PLATFORM_ADMIN / OWNER -> criar/editar/ativar/desativar campanhas
--                             STANDARD da própria organização
--   MANAGER / STAFF        -> negado (somente leitura, já coberta por
--                             `campaigns_select_staff`, 20260908060231)
--
-- Limite de 5 ACTIVE por organização — defesa em profundidade:
--   1. admin_set_campaign_status checa a contagem ANTES do update e
--      devolve `{ ok:false, reason:'campaign_limit_reached' }` (mensagem
--      amigável, sem exceção) — caminho normal de uso.
--   2. Trigger `enforce_campaign_active_limit` no banco barra a inserção/
--      atualização mesmo fora desta RPC (SQL direto, migration futura,
--      condição de corrida) — nunca dependente só de RBAC de aplicação.
-- Conta TODAS as campanhas ACTIVE da organização (STANDARD + ADVANCED,
-- que o Fidelize Admin também pode ativar) — é o teto operacional real
-- de campanhas simultâneas no cartão do cliente, não um teto por tipo.
--
-- Não altera `campaigns_select_staff` nem nenhuma outra policy existente.

-- ===========================================================================
-- Trigger — limite de 5 campanhas ACTIVE por organização (nível banco).
-- ===========================================================================
create function public.enforce_campaign_active_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.campaigns
  where organization_id = new.organization_id
    and status = 'ACTIVE'
    and id <> new.id;

  if v_count >= 5 then
    raise exception 'Limite de 5 campanhas ativas por estabelecimento atingido'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.enforce_campaign_active_limit() is
  'ETAPA 4.6F. Barra INSERT/UPDATE que deixaria uma organizacao com mais de 5 campaigns.status=ACTIVE. Defesa em profundidade: a RPC admin_set_campaign_status ja checa isso antes e devolve erro funcional amigavel; este trigger e o ultimo garante mesmo fora da RPC.';

-- Função de trigger, não ponto de entrada — mesmo tratamento de
-- admin_org_actor_role (20260910160000): ninguém deve chamá-la via RPC.
revoke execute on function public.enforce_campaign_active_limit()
  from public, anon, authenticated;

create trigger enforce_campaign_active_limit_insert
  before insert on public.campaigns
  for each row when (new.status = 'ACTIVE')
  execute function public.enforce_campaign_active_limit();

create trigger enforce_campaign_active_limit_update
  before update on public.campaigns
  for each row when (new.status = 'ACTIVE' and old.status is distinct from 'ACTIVE')
  execute function public.enforce_campaign_active_limit();

-- ===========================================================================
-- admin_create_campaign — cria campanha type='STANDARD', status='DRAFT'.
-- ===========================================================================
create function public.admin_create_campaign(
  p_organization_id uuid,
  p_name            text,
  p_program_id      uuid default null,
  p_start_at        timestamptz default null,
  p_end_at          timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := public.admin_org_actor_role(p_organization_id);
  v_name  text;
  v_id    uuid;
begin
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_program_id is not null and not exists (
    select 1 from public.loyalty_programs
    where id = p_program_id and organization_id = p_organization_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_name is null or length(p_name) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;
  v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  if length(v_name) < 2 or v_name ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;

  if p_start_at is not null and p_end_at is not null and p_end_at <= p_start_at then
    return jsonb_build_object('ok', false, 'reason', 'invalid_period');
  end if;

  insert into public.campaigns
    (organization_id, program_id, name, type, status, start_at, end_at, created_by)
  values
    (p_organization_id, p_program_id, v_name, 'STANDARD', 'DRAFT', p_start_at, p_end_at, auth.uid())
  returning id into v_id;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (p_organization_id, auth.uid(), 'campaign.created', 'campaign', v_id,
     jsonb_build_object('actorRole', v_actor));

  return jsonb_build_object('ok', true, 'campaign', (
    select jsonb_build_object(
      'id', c.id, 'name', c.name, 'type', c.type, 'status', c.status,
      'start_at', c.start_at, 'end_at', c.end_at, 'approved_at', c.approved_at
    )
    from public.campaigns c where c.id = v_id
  ));
end;
$$;

comment on function public.admin_create_campaign(uuid, text, uuid, timestamptz, timestamptz) is
  'ETAPA 4.6F. Cria campanha padrao (type=STANDARD, status inicial DRAFT). OWNER ou PLATFORM_ADMIN. p_program_id, quando informado, precisa pertencer a mesma organizacao. Registra audit_logs (campaign.created).';

-- ===========================================================================
-- admin_update_campaign — edita nome/programa/período. Só campanhas
-- STANDARD (ADVANCED nunca é alvo desta RPC, mesmo pertencendo à mesma
-- organização — ficam com o Fidelize Admin).
-- ===========================================================================
create function public.admin_update_campaign(
  p_campaign_id uuid,
  p_name        text default null,
  p_program_id  uuid default null,
  p_start_at    timestamptz default null,
  p_end_at      timestamptz default null,
  p_clear_program boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org    uuid;
  v_type   text;
  v_actor  text;
  v_name   text;
  v_start  timestamptz;
  v_end    timestamptz;
  v_fields text[] := array[]::text[];
begin
  select organization_id, type, start_at, end_at into v_org, v_type, v_start, v_end
  from public.campaigns where id = p_campaign_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_type <> 'STANDARD' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
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

  if p_program_id is not null then
    if not exists (
      select 1 from public.loyalty_programs
      where id = p_program_id and organization_id = v_org
    ) then
      return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;
    v_fields := v_fields || 'program_id';
  elsif p_clear_program then
    v_fields := v_fields || 'program_id';
  end if;

  if p_start_at is not null then
    v_start := p_start_at;
    v_fields := v_fields || 'start_at';
  end if;
  if p_end_at is not null then
    v_end := p_end_at;
    v_fields := v_fields || 'end_at';
  end if;
  if v_start is not null and v_end is not null and v_end <= v_start then
    return jsonb_build_object('ok', false, 'reason', 'invalid_period');
  end if;

  if array_length(v_fields, 1) is null then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  update public.campaigns set
    name       = coalesce(v_name, name),
    program_id = case
                   when p_program_id is not null then p_program_id
                   when p_clear_program then null
                   else program_id
                 end,
    start_at   = case when p_start_at is not null then p_start_at else start_at end,
    end_at     = case when p_end_at is not null then p_end_at else end_at end
  where id = p_campaign_id;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (v_org, auth.uid(), 'campaign.updated', 'campaign', p_campaign_id,
     jsonb_build_object('fields', to_jsonb(v_fields), 'actorRole', v_actor));

  return jsonb_build_object('ok', true, 'campaign', (
    select jsonb_build_object(
      'id', c.id, 'name', c.name, 'type', c.type, 'status', c.status,
      'start_at', c.start_at, 'end_at', c.end_at, 'approved_at', c.approved_at
    )
    from public.campaigns c where c.id = p_campaign_id
  ));
end;
$$;

comment on function public.admin_update_campaign(uuid, text, uuid, timestamptz, timestamptz, boolean) is
  'ETAPA 4.6F. Atualiza nome/programa/periodo de uma campanha type=STANDARD (ADVANCED nunca e alvo desta RPC). OWNER ou PLATFORM_ADMIN da organizacao dona (resolvida da propria linha). Registra audit_logs (campaign.updated).';

-- ===========================================================================
-- admin_set_campaign_status — ativar (=aprovar) / desativar (pausar). Só
-- campanhas STANDARD. Checa o limite de 5 ACTIVE ANTES do update (mensagem
-- funcional amigável) — o trigger é a rede de segurança, não o caminho
-- normal.
-- ===========================================================================
create function public.admin_set_campaign_status(
  p_campaign_id uuid,
  p_status      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org    uuid;
  v_type   text;
  v_actor  text;
  v_from   text;
  v_count  integer;
begin
  if p_status is null or p_status not in ('ACTIVE', 'PAUSED') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  select organization_id, type, status into v_org, v_type, v_from
  from public.campaigns where id = p_campaign_id;
  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_type <> 'STANDARD' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_actor := public.admin_org_actor_role(v_org);
  if v_actor is null or v_actor not in ('PLATFORM_ADMIN', 'OWNER') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_from = p_status then
    return jsonb_build_object('ok', false, 'reason', 'no_changes');
  end if;

  if p_status = 'ACTIVE' then
    select count(*) into v_count
    from public.campaigns
    where organization_id = v_org
      and status = 'ACTIVE'
      and id <> p_campaign_id;
    if v_count >= 5 then
      return jsonb_build_object('ok', false, 'reason', 'campaign_limit_reached');
    end if;

    update public.campaigns set
      status      = 'ACTIVE',
      approved_by = auth.uid(),
      approved_at = now()
    where id = p_campaign_id;
  else
    update public.campaigns set status = 'PAUSED' where id = p_campaign_id;
  end if;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (v_org, auth.uid(), 'campaign.status_changed', 'campaign', p_campaign_id,
     jsonb_build_object('from', v_from, 'to', p_status, 'actorRole', v_actor));

  return jsonb_build_object('ok', true, 'campaign', jsonb_build_object(
    'id', p_campaign_id, 'status', p_status
  ));
end;
$$;

comment on function public.admin_set_campaign_status(uuid, text) is
  'ETAPA 4.6F. Ativa (= aprova: grava approved_by/approved_at do proprio ator, satisfazendo campaigns_require_approval) ou pausa uma campanha type=STANDARD. OWNER ou PLATFORM_ADMIN. Limite de 5 ACTIVE por organizacao checado aqui (reason campaign_limit_reached) e reforcado por trigger no banco. Registra audit_logs (campaign.status_changed).';

-- ===========================================================================
-- Privilégios — EXECUTE só para `authenticated` (nunca `anon`, nunca
-- `public`).
-- ===========================================================================
revoke execute on function public.admin_create_campaign(uuid, text, uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.admin_create_campaign(uuid, text, uuid, timestamptz, timestamptz)
  to authenticated;

revoke execute on function public.admin_update_campaign(uuid, text, uuid, timestamptz, timestamptz, boolean)
  from public, anon;
grant execute on function public.admin_update_campaign(uuid, text, uuid, timestamptz, timestamptz, boolean)
  to authenticated;

revoke execute on function public.admin_set_campaign_status(uuid, text)
  from public, anon;
grant execute on function public.admin_set_campaign_status(uuid, text)
  to authenticated;
