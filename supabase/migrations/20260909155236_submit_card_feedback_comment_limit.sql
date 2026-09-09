-- Fidelize.club — ajuste em submit_card_feedback (ETAPA 4.0.1).
--
-- A versão original (20260909155027_public_web_card_functions.sql)
-- truncava silenciosamente um comentário acima de 1000 caracteres. Isso
-- perde parte do que o cliente escreveu sem ele saber — pior experiência
-- do que recusar com um motivo claro e deixar a UI pedir para encurtar.
-- Esta migration troca o truncamento por rejeição explícita
-- (`reason: 'comment_too_long'`), mantendo o resto da function idêntico.
create or replace function public.submit_card_feedback(
  p_token text,
  p_rating integer,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_status                 text;
  v_membership_id                uuid;
  v_organization_id              uuid;
  v_internal_feedback_enabled    boolean;
  v_recent_count                 integer;
  v_comment                      text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_token');
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_rating');
  end if;

  if p_comment is not null and length(p_comment) > 1000 then
    return jsonb_build_object('ok', false, 'reason', 'comment_too_long');
  end if;

  select cc.status, cc.membership_id
    into v_card_status, v_membership_id
  from public.customer_cards cc
  where cc.public_token = p_token;

  if not found or v_card_status <> 'ACTIVE' then
    return jsonb_build_object('ok', false, 'reason', 'card_not_found');
  end if;

  select cm.organization_id into v_organization_id
  from public.customer_memberships cm
  where cm.id = v_membership_id;

  select coalesce(f.internal_feedback_enabled, true)
    into v_internal_feedback_enabled
  from public.organization_feature_flags f
  where f.organization_id = v_organization_id;

  if not coalesce(v_internal_feedback_enabled, true) then
    return jsonb_build_object('ok', false, 'reason', 'feedback_disabled');
  end if;

  -- Só sanitiza espaço/whitespace nas pontas e string vazia -> NULL; o
  -- limite de tamanho já foi tratado acima como rejeição, não truncamento.
  v_comment := nullif(btrim(coalesce(p_comment, '')), '');

  -- Defesa mínima contra abuso, usando dado que já existe
  -- (customer_feedback.membership_id + created_at) — sem tabela nova, sem
  -- infraestrutura nova. Limite deliberadamente pequeno (3 por cartão a
  -- cada 24h) — ver comentário original em
  -- 20260909155027_public_web_card_functions.sql. Isto NÃO substitui rate
  -- limiting por IP/dispositivo numa borda (Cloudflare, proxy, etc.).
  select count(*) into v_recent_count
  from public.customer_feedback
  where membership_id = v_membership_id
    and created_at > now() - interval '24 hours';

  if v_recent_count >= 3 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  insert into public.customer_feedback (organization_id, membership_id, rating, comment)
  values (v_organization_id, v_membership_id, p_rating, v_comment);

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.submit_card_feedback(text, integer, text) is
  'Único ponto de escrita pública de feedback interno (ETAPA 4.0.1). SECURITY DEFINER: resolve organization_id/membership_id a partir do token, nunca os aceita como parâmetro. Rating 1-5 obrigatório; comentário acima de 1000 caracteres é REJEITADO (reason: comment_too_long), não truncado. Defesa contra abuso: no máximo 3 envios por cartão a cada 24h, calculada sobre customer_feedback existente — ver comentário interno para limitações.';

-- REVOKE/GRANT já aplicados pela migration anterior continuam valendo
-- (CREATE OR REPLACE preserva privilégios existentes na function) — sem
-- necessidade de repetir aqui.
