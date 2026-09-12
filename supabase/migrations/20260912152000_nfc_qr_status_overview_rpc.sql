-- Fidelize.club — ETAPA 4.6F: fechamento do MVP do Painel do Estabelecimento
-- (2026-09-12). Regra: "NFC & QR: não deixar tela vazia para o
-- estabelecimento. Mostrar somente informações operacionais seguras: status
-- QR, status NFC, unidade vinculada e status geral. Nunca exibir token,
-- secret, hash ou configuração sensível. Não implementar ainda validação
-- nem antifraude."
--
-- `nfc_devices`/`qr_tokens` guardam segredo (secret_hash / token) e por isso
-- só têm policy de leitura DIRETA para platform_admin
-- (docs/BANCO_DE_DADOS.md, seção 5.2) — isso não muda: nenhuma policy nova,
-- nenhuma tabela alterada. Esta função `SECURITY DEFINER`, somente leitura,
-- devolve apenas um resumo agregado por unidade — se existe (e está ativo)
-- algum dispositivo NFC / token QR — nunca `public_identifier`,
-- `secret_hash`, `secret_version`, `token` ou `usage_count`. Qualquer papel
-- de organização (OWNER/MANAGER/STAFF) ou PLATFORM_ADMIN pode chamar: é
-- status operacional do dia a dia, não configuração sensível. Reutiliza
-- `admin_org_actor_role` (20260910150000) — nenhum helper novo, nenhuma
-- tabela/policy tocada.

create function public.admin_org_nfc_qr_overview(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_actor  text := public.admin_org_actor_role(p_organization_id);
  v_result jsonb;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  with per_location as (
    select
      l.id   as location_id,
      l.name as location_name,
      case
        when exists (
          select 1 from public.nfc_devices d
          where d.location_id = l.id and d.status = 'ACTIVE'
        ) then 'ACTIVE'
        when exists (select 1 from public.nfc_devices d where d.location_id = l.id)
          then 'INACTIVE'
        else 'NONE'
      end as nfc_status,
      case
        when exists (
          select 1 from public.qr_tokens q
          where q.location_id = l.id and q.status = 'ACTIVE'
        ) then 'ACTIVE'
        when exists (select 1 from public.qr_tokens q where q.location_id = l.id)
          then 'INACTIVE'
        else 'NONE'
      end as qr_status
    from public.locations l
    where l.organization_id = p_organization_id
  ),
  agg as (
    select
      jsonb_agg(jsonb_build_object(
        'location_id', location_id,
        'location_name', location_name,
        'nfc_status', nfc_status,
        'qr_status', qr_status
      ) order by location_name) as locations_json,
      count(*) filter (where nfc_status = 'ACTIVE' or qr_status = 'ACTIVE') as operational_count,
      count(*) filter (where nfc_status <> 'NONE' or qr_status <> 'NONE') as configured_count
    from per_location
  )
  select jsonb_build_object(
    'ok', true,
    'overall_status', case
      when coalesce(operational_count, 0) > 0 then 'OPERATIONAL'
      when coalesce(configured_count, 0) > 0 then 'PARTIAL'
      else 'NOT_CONFIGURED'
    end,
    'locations', coalesce(locations_json, '[]'::jsonb)
  )
  into v_result
  from agg;

  return v_result;
end;
$$;

comment on function public.admin_org_nfc_qr_overview(uuid) is
  'ETAPA 4.6F. Resumo seguro de NFC/QR por unidade da organizacao: nfc_status/qr_status (ACTIVE|INACTIVE|NONE, agregado de nfc_devices/qr_tokens, nunca as colunas sensiveis) + overall_status (OPERATIONAL|PARTIAL|NOT_CONFIGURED). Qualquer papel de organizacao (OWNER/MANAGER/STAFF) ou PLATFORM_ADMIN. Nao deve nunca ser alterada para incluir public_identifier, secret_hash, secret_version, token ou usage_count.';

-- ---------------------------------------------------------------------------
-- Privilégios — EXECUTE só para `authenticated` (nunca `anon`, nunca
-- `public`).
-- ---------------------------------------------------------------------------
revoke execute on function public.admin_org_nfc_qr_overview(uuid)
  from public, anon;
grant execute on function public.admin_org_nfc_qr_overview(uuid)
  to authenticated;
