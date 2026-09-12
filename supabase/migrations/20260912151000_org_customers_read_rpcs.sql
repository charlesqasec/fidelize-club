-- Fidelize.club — ETAPA 4.6F: homologação manual com conta real de
-- estabelecimento (2026-09-12) — regra oficial do MVP: "Clientes: o
-- estabelecimento pode identificar e consultar somente seus próprios
-- clientes, saldo/progresso, visitas/selos, última atividade e histórico.
-- Não pode criar manualmente, excluir, exportar ou editar dados
-- sensíveis."
--
-- `public.customers` é entidade GLOBAL (docs/BANCO_DE_DADOS.md, seção 5.1;
-- `20260908060153_customers_and_memberships.sql`) — não tem organization_id
-- e por isso não pode ganhar policy de SELECT direta sem vazar clientes de
-- OUTRAS organizações. A solução aqui NÃO afrouxa `customers_select_admin`
-- (continua platform_admin-only): duas novas RPCs `SECURITY DEFINER`,
-- somente leitura, que fazem o join com `customer_memberships` e filtram
-- por `organization_id` SEMPRE a partir do parâmetro/linha, nunca do
-- cliente que chama — mesmo isolamento multi-tenant de toda RPC `admin_*`
-- deste painel.
--
-- Menor privilégio, em duas funções (não uma só) de propósito:
--   admin_list_org_customers  -> só os campos de LISTAGEM (nome, saldo,
--                                 visitas/selos, última atividade, adesão).
--                                 Nunca inclui e-mail/telefone nem
--                                 histórico do ledger.
--   admin_get_customer_detail -> uma adesão específica, com o histórico do
--                                 ledger (`loyalty_transactions`, somente
--                                 leitura — nunca inclui e-mail/telefone,
--                                 que não fazem parte da regra aprovada).
--
-- Ambas leem qualquer papel de organização (OWNER/MANAGER/STAFF) e
-- PLATFORM_ADMIN — é consulta operacional do dia a dia, não configuração
-- sensível. Nenhuma escrita: sem admin_create_customer, sem delete, sem
-- export. Reutiliza `admin_org_actor_role` (20260910150000) — nenhum
-- helper novo de autorização, nenhuma tabela/policy alterada.

create function public.admin_list_org_customers(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_actor text := public.admin_org_actor_role(p_organization_id);
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', cm.id,
        'name', c.name,
        'status', cm.status,
        'current_points', cm.current_points,
        'current_stamps', cm.current_stamps,
        'current_visits', cm.current_visits,
        'joined_at', cm.joined_at,
        'last_activity_at', cm.last_activity_at,
        'program_name', p.name,
        'program_type', p.type
      ) order by cm.joined_at desc)
      from public.customer_memberships cm
      join public.customers c on c.id = cm.customer_id
      join public.loyalty_programs p on p.id = cm.program_id
      where cm.organization_id = p_organization_id
      limit 200
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.admin_list_org_customers(uuid) is
  'ETAPA 4.6F. Lista (ate 200, mais recentes primeiro) as adesoes de clientes de UMA organizacao — nome, saldo/selos/visitas, ultima atividade, adesao/programa. So leitura; nunca e-mail/telefone/historico (ver admin_get_customer_detail). Qualquer papel de organizacao (OWNER/MANAGER/STAFF) ou PLATFORM_ADMIN. organization_id sempre do parametro, nunca inferido do cliente — isolamento multi-tenant preservado.';

create function public.admin_get_customer_detail(
  p_organization_id uuid,
  p_membership_id   uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_actor text := public.admin_org_actor_role(p_organization_id);
  v_row   record;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select cm.id, cm.status, cm.current_points, cm.current_stamps, cm.current_visits,
         cm.joined_at, cm.last_activity_at, c.name, p.name as program_name, p.type as program_type
    into v_row
  from public.customer_memberships cm
  join public.customers c on c.id = cm.customer_id
  join public.loyalty_programs p on p.id = cm.program_id
  where cm.id = p_membership_id
    and cm.organization_id = p_organization_id;

  if v_row is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'customer', jsonb_build_object(
      'membership_id', v_row.id,
      'name', v_row.name,
      'status', v_row.status,
      'current_points', v_row.current_points,
      'current_stamps', v_row.current_stamps,
      'current_visits', v_row.current_visits,
      'joined_at', v_row.joined_at,
      'last_activity_at', v_row.last_activity_at,
      'program_name', v_row.program_name,
      'program_type', v_row.program_type
    ),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'type', t.type, 'amount', t.amount,
        'source', t.source, 'created_at', t.created_at
      ) order by t.created_at desc)
      from public.loyalty_transactions t
      where t.membership_id = v_row.id
        and t.organization_id = p_organization_id
      limit 100
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.admin_get_customer_detail(uuid, uuid) is
  'ETAPA 4.6F. Detalhe de UMA adesao (nome, saldo, adesao/programa) + ate 100 lancamentos do ledger (loyalty_transactions), mais recentes primeiro. So leitura; nunca e-mail/telefone. p_membership_id revalidado contra p_organization_id (nunca confia que a adesao pertence a organizacao so porque o cliente informou o id). Qualquer papel de organizacao ou PLATFORM_ADMIN.';

-- ---------------------------------------------------------------------------
-- Privilégios — EXECUTE só para `authenticated` (nunca `anon`, nunca
-- `public`). Postgres concede a `public` por padrão em toda function nova, e
-- `anon`/`authenticated` herdam de `public` — revoga dos dois explicitamente
-- antes de conceder (mesma correção aplicada em 20260910160000).
-- ---------------------------------------------------------------------------
revoke execute on function public.admin_list_org_customers(uuid)
  from public, anon;
grant execute on function public.admin_list_org_customers(uuid)
  to authenticated;

revoke execute on function public.admin_get_customer_detail(uuid, uuid)
  from public, anon;
grant execute on function public.admin_get_customer_detail(uuid, uuid)
  to authenticated;
