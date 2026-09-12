-- Fidelize.club — ETAPA 4.6G: bloco "Agente de IA" no Painel do
-- Estabelecimento (2026-09-12). Regra do produto: card premium na Visão
-- geral que mostra insights operacionais calculados sobre os dados reais da
-- PRÓPRIA organização. Nunca expõe o nome do modelo/fornecedor de IA (isso é
-- decisão só de UI: esta função nem sabe que existe um "Agente de IA", só
-- devolve números). MVP: cálculo determinístico, sem LLM externa — primeiro
-- (e único, por ora) insight é "clientes sem retorno há mais de 30 dias".
--
-- Reaproveita `customer_memberships.last_activity_at`, já mantido pelo
-- trigger `apply_loyalty_transaction` (20260908060202) a cada lançamento no
-- ledger — nenhuma tabela nova, nenhum job novo. "Sem retorno" = adesão
-- ACTIVE que já teve pelo menos um lançamento (last_activity_at not null) e
-- o último foi há mais de 30 dias. Adesões que NUNCA tiveram lançamento
-- (last_activity_at null) não entram nem no numerador nem no denominador:
-- "nunca voltou" e "nunca chegou a vir" são coisas diferentes, e este
-- insight é sobre a primeira.
--
-- `has_enough_data` = existe pelo menos uma adesão ACTIVE com histórico real
-- (evaluated_count > 0). Com `false`, a UI mostra um estado vazio — nunca
-- inventa o insight. Reutiliza `admin_org_actor_role` (20260910150000):
-- qualquer papel de organização (OWNER/MANAGER/STAFF) ou PLATFORM_ADMIN pode
-- chamar — é leitura operacional, não configuração sensível.

create function public.admin_org_ai_agent_overview(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_actor          text := public.admin_org_actor_role(p_organization_id);
  v_evaluated      integer;
  v_no_return_30d  integer;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select
    count(*) filter (where last_activity_at is not null),
    count(*) filter (
      where last_activity_at is not null
        and last_activity_at < now() - interval '30 days'
    )
  into v_evaluated, v_no_return_30d
  from public.customer_memberships
  where organization_id = p_organization_id
    and status = 'ACTIVE';

  return jsonb_build_object(
    'ok', true,
    'has_enough_data', coalesce(v_evaluated, 0) > 0,
    'evaluated_count', coalesce(v_evaluated, 0),
    'no_return_30d_count', coalesce(v_no_return_30d, 0)
  );
end;
$$;

comment on function public.admin_org_ai_agent_overview(uuid) is
  'ETAPA 4.6G. Insights deterministicos do "Agente de IA" (nome de UI — esta funcao nao sabe/expõe fornecedor ou modelo algum) para UMA organizacao: has_enough_data (existe ao menos 1 adesao ACTIVE com last_activity_at preenchido) + evaluated_count + no_return_30d_count (adesoes ACTIVE cujo last_activity_at passou de 30 dias). Nunca inventa insight sem dado real. Qualquer papel de organizacao (OWNER/MANAGER/STAFF) ou PLATFORM_ADMIN. organization_id sempre do parametro — isolamento multi-tenant preservado.';

-- ---------------------------------------------------------------------------
-- Privilégios — EXECUTE só para `authenticated` (nunca `anon`, nunca
-- `public`).
-- ---------------------------------------------------------------------------
revoke execute on function public.admin_org_ai_agent_overview(uuid)
  from public, anon;
grant execute on function public.admin_org_ai_agent_overview(uuid)
  to authenticated;
