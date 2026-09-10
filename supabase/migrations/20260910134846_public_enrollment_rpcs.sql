-- Fidelize.club — ETAPA 5.0B: RPCs do cadastro público.
--
-- Duas funções SECURITY DEFINER, ÚNICA porta de entrada do fluxo de
-- inscrição pública num programa (o visitante ainda não é cliente):
--
--   public.get_program_entry(p_token)  -> leitura neutra da tela de entrada
--   public.enroll_customer(...)        -> cria/reaproveita customer+membership+card
--
-- Mesma postura de get_public_card/submit_card_feedback (ETAPA 4.0.1):
-- nenhuma tabela base ganha policy para anon; a segurança é a lógica
-- interna — nunca aceitar organization_id/program_id/customer_id/
-- membership_id do chamador, resolver tudo a partir do token do
-- program_join_links, search_path fixo, sem SQL dinâmico.
--
-- NÃO cria UI, rota /join/[token], não toca QR/NFC, ledger,
-- get_public_card nem submit_card_feedback.

-- =============================================================================
-- get_program_entry — leitura pública da tela de entrada de um programa.
-- =============================================================================
--
-- Retorno:
--   { "outcome": "unavailable" }        -> token ausente/malformado, link
--                                          inexistente/DISABLED/expirado,
--                                          organização não-ACTIVE ou
--                                          programa não-ACTIVE. Resposta
--                                          NEUTRA — o chamador não distingue
--                                          a causa (anti-enumeração de links).
--   { "outcome": "ok", "entry": {...} } -> nome da org, nome/tipo do
--                                          programa, branding e bloco de
--                                          consentimento. NUNCA ids internos
--                                          nem qualquer dado de cliente.
create function public.get_program_entry(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_version constant text := '2026-09-10';

  v_org_id        uuid;
  v_program_id    uuid;
  v_org_name      text;
  v_org_status    text;
  v_program_name  text;
  v_program_type  text;
  v_program_status text;
  v_branding      jsonb;
begin
  -- Sanidade de entrada (sem acoplar ao formato exato do token — a coluna
  -- program_join_links.token é text livre; o default é 48 hex, mas não há
  -- CHECK). Só evita lookup com lixo óbvio.
  if p_token is null or length(p_token) not between 16 and 128 then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  select l.organization_id, l.program_id
    into v_org_id, v_program_id
  from public.program_join_links l
  where l.token = p_token
    and l.status = 'ACTIVE'
    and (l.expires_at is null or l.expires_at > now());

  if not found then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  select o.name, o.status into v_org_name, v_org_status
  from public.organizations o
  where o.id = v_org_id;

  select p.name, p.type, p.status
    into v_program_name, v_program_type, v_program_status
  from public.loyalty_programs p
  where p.id = v_program_id;

  if coalesce(v_org_status, '') <> 'ACTIVE'
     or coalesce(v_program_status, '') <> 'ACTIVE' then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  select jsonb_build_object(
    'logoUrl', b.logo_url,
    'primaryColor', b.primary_color,
    'secondaryColor', b.secondary_color,
    'backgroundColor', b.background_color,
    'textColor', b.text_color,
    'cardStyle', b.card_style,
    'headline', b.headline,
    'description', b.description
  )
    into v_branding
  from public.program_branding b
  where b.program_id = v_program_id;
  -- Sem linha -> v_branding NULL (branding ausente é estado legítimo; a UI
  -- usa as cores padrão da Fidelize).

  return jsonb_build_object(
    'outcome', 'ok',
    'entry', jsonb_build_object(
      'organization', jsonb_build_object('name', v_org_name),
      'program', jsonb_build_object('name', v_program_name, 'type', v_program_type),
      'branding', v_branding,
      'consent', jsonb_build_object(
        'termVersion', v_term_version,
        'dataProcessingRequired', true,
        -- Placeholders estáveis para o contrato da UI: hoje ambos os
        -- canais de marketing podem sempre ser oferecidos como opt-in.
        -- Quando existir um toggle de canal por organização, é aqui que
        -- ele passa a refletir.
        'marketingWhatsappAvailable', true,
        'marketingEmailAvailable', true
      )
    )
  );
end;
$$;

comment on function public.get_program_entry(text) is
  'ETAPA 5.0B. Leitura publica da tela de entrada de um programa a partir de program_join_links.token. SECURITY DEFINER; resposta NEUTRA (outcome=unavailable) para qualquer falha de token/link/org/programa. Nunca devolve id interno nem dado de cliente.';

-- =============================================================================
-- enroll_customer — inscrição pública num programa.
-- =============================================================================
--
-- Parâmetros: SÓ o token e os dados digitados pelo visitante. Nunca
-- organization_id/program_id/customer_id/membership_id.
--
-- Retorno (formato fixo): { ok, cardToken, alreadyEnrolled, reason? }
--   reason (só quando ok=false), sempre neutro:
--     'invalid_link'    -> token ausente/malformado
--     'link_unavailable'-> link inexistente/DISABLED/expirado, org/programa não-ACTIVE
--     'invalid_name'    -> nome vazio/curto/inválido
--     'invalid_phone'   -> telefone não normalizável para E.164 BR
--     'invalid_email'   -> e-mail informado com formato inválido
--     'rate_limited'    -> proteção básica contra flood (ver comentário)
--     'unavailable'     -> membership BLOCKED ou card REVOKED (neutro de propósito)
--
-- Dedup/idempotência: chave (organization_id + phone) para o customer,
-- (customer_id + program_id) para a membership, (membership_id) para o
-- card. Repetir a chamada com os mesmos dados devolve o mesmo cartão.
-- Nunca cruza customer entre organizações (customers é org-scoped desde a
-- ETAPA 5.0A). Nunca altera saldo (não escreve em loyalty_transactions
-- nem em current_points/stamps/visits).
create function public.enroll_customer(
  p_token            text,
  p_name             text,
  p_phone            text,
  p_email            text default null,
  p_opt_in_whatsapp  boolean default false,
  p_opt_in_email     boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_version   constant text := '2026-09-10';
  v_source         constant text := 'PUBLIC_JOIN';

  v_link_id        uuid;
  v_org_id         uuid;
  v_program_id     uuid;
  v_org_status     text;
  v_program_status text;

  v_name           text;
  v_email          text;
  v_phone          text;
  v_effective_email text;

  v_customer_id       uuid;
  v_new_customer      boolean := false;
  v_membership_id     uuid;
  v_membership_status text;
  v_new_membership    boolean := false;
  v_reactivated       boolean := false;
  v_already           boolean := false;

  v_card_token     text;
  v_card_status    text;

  v_event_id       uuid;
  v_recent         integer;
begin
  ---------------------------------------------------------------------------
  -- 1. Token + link + org + programa (tudo resolvido só pelo token)
  ---------------------------------------------------------------------------
  if p_token is null or length(p_token) not between 16 and 128 then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'invalid_link');
  end if;

  select l.id, l.organization_id, l.program_id
    into v_link_id, v_org_id, v_program_id
  from public.program_join_links l
  where l.token = p_token
    and l.status = 'ACTIVE'
    and (l.expires_at is null or l.expires_at > now());

  if not found then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'link_unavailable');
  end if;

  select o.status into v_org_status from public.organizations o where o.id = v_org_id;
  select p.status into v_program_status from public.loyalty_programs p where p.id = v_program_id;

  if coalesce(v_org_status, '') <> 'ACTIVE' or coalesce(v_program_status, '') <> 'ACTIVE' then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'link_unavailable');
  end if;

  ---------------------------------------------------------------------------
  -- 2. Validação/normalização dos dados digitados
  ---------------------------------------------------------------------------
  if p_name is null or length(p_name) > 400
     or coalesce(length(p_phone), 0) > 100
     or coalesce(length(p_email), 0) > 400 then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'invalid_name');
  end if;

  v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  if length(v_name) < 2 or v_name !~ '\S' or v_name ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'invalid_name');
  end if;

  v_phone := public.normalize_br_phone(p_phone);
  if v_phone is null then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'invalid_phone');
  end if;

  v_email := lower(nullif(btrim(coalesce(p_email, '')), ''));
  if v_email is not null
     and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'invalid_email');
  end if;

  ---------------------------------------------------------------------------
  -- 3. Estado atual (customer/membership/card) — só leitura
  ---------------------------------------------------------------------------
  select c.id into v_customer_id
  from public.customers c
  where c.organization_id = v_org_id and c.phone = v_phone;

  v_new_customer := v_customer_id is null;

  if not v_new_customer then
    select cm.id, cm.status
      into v_membership_id, v_membership_status
    from public.customer_memberships cm
    where cm.customer_id = v_customer_id and cm.program_id = v_program_id;

    if v_membership_id is not null then
      if v_membership_status = 'BLOCKED' then
        return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', true, 'reason', 'unavailable');
      end if;

      select cc.status into v_card_status
      from public.customer_cards cc
      where cc.membership_id = v_membership_id;

      if v_card_status = 'REVOKED' then
        return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', true, 'reason', 'unavailable');
      end if;
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- 4. Proteção básica contra flood — só no caminho que criaria customer
  --    novo. Usa dado que já existe (enrollment_events.created_at), sem
  --    infraestrutura externa. NÃO substitui rate limiting por IP/borda
  --    (Cloudflare/proxy) — limitação conhecida, mesma da ETAPA 4.0.1.
  ---------------------------------------------------------------------------
  if v_new_customer then
    select count(*) into v_recent
    from public.enrollment_events
    where join_link_id = v_link_id
      and created_at > now() - interval '30 seconds';
    if v_recent >= 15 then
      return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'rate_limited');
    end if;

    select count(*) into v_recent
    from public.enrollment_events
    where join_link_id = v_link_id
      and was_new_customer
      and created_at > now() - interval '1 hour';
    if v_recent >= 100 then
      return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', false, 'reason', 'rate_limited');
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- 5. customer — cria ou reaproveita (dedup por organization_id + phone)
  ---------------------------------------------------------------------------
  if v_new_customer then
    -- e-mail só entra na criação se não colidir com o índice único
    -- (organization_id, lower(email)); em colisão, cria sem e-mail (o
    -- telefone é a identidade) — a inscrição não falha por isso.
    if v_email is not null and exists (
      select 1 from public.customers c2
      where c2.organization_id = v_org_id and lower(c2.email) = v_email
    ) then
      v_email := null;
    end if;

    insert into public.customers (organization_id, name, phone, email)
    values (v_org_id, v_name, v_phone, v_email)
    on conflict (organization_id, phone) where phone is not null do nothing
    returning id into v_customer_id;

    if v_customer_id is null then
      -- corrida perdida: outra chamada acabou de criar o mesmo customer
      select c.id into v_customer_id
      from public.customers c
      where c.organization_id = v_org_id and c.phone = v_phone;
      v_new_customer := false;
    end if;
  end if;

  if not v_new_customer then
    -- Preenche só campos vazios, nunca sobrescreve valor existente, nunca
    -- toca phone/birth_date. E-mail só se estiver vazio e não colidir.
    update public.customers c
    set
      name = case when coalesce(btrim(c.name), '') = '' then v_name else c.name end,
      email = case
        when c.email is null and v_email is not null
             and not exists (
               select 1 from public.customers c2
               where c2.organization_id = v_org_id
                 and lower(c2.email) = v_email
                 and c2.id <> c.id
             )
        then v_email
        else c.email
      end
    where c.id = v_customer_id;
  end if;

  ---------------------------------------------------------------------------
  -- 6. membership — cria / reaproveita / reativa (nunca mexe em saldo)
  ---------------------------------------------------------------------------
  if v_membership_id is null then
    select cm.id, cm.status into v_membership_id, v_membership_status
    from public.customer_memberships cm
    where cm.customer_id = v_customer_id and cm.program_id = v_program_id;
  end if;

  if v_membership_id is null then
    insert into public.customer_memberships (customer_id, organization_id, program_id)
    values (v_customer_id, v_org_id, v_program_id)
    on conflict (customer_id, program_id) do nothing
    returning id into v_membership_id;

    if v_membership_id is null then
      select cm.id, cm.status into v_membership_id, v_membership_status
      from public.customer_memberships cm
      where cm.customer_id = v_customer_id and cm.program_id = v_program_id;
      v_already := true;
    else
      v_new_membership := true;
      v_membership_status := 'ACTIVE';
      v_already := false;
    end if;
  else
    v_already := true;
  end if;

  if v_membership_status = 'BLOCKED' then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', true, 'reason', 'unavailable');
  end if;

  if v_membership_status = 'INACTIVE' then
    update public.customer_memberships
    set status = 'ACTIVE'
    where id = v_membership_id and status = 'INACTIVE';
    v_reactivated := true;
  end if;

  ---------------------------------------------------------------------------
  -- 7. card — cria / reaproveita (REVOKED = rejeição neutra)
  ---------------------------------------------------------------------------
  select cc.public_token, cc.status into v_card_token, v_card_status
  from public.customer_cards cc
  where cc.membership_id = v_membership_id;

  if v_card_token is null then
    insert into public.customer_cards (membership_id)
    values (v_membership_id)
    on conflict (membership_id) do nothing
    returning public_token, status into v_card_token, v_card_status;

    if v_card_token is null then
      select cc.public_token, cc.status into v_card_token, v_card_status
      from public.customer_cards cc
      where cc.membership_id = v_membership_id;
    end if;
  end if;

  if v_card_status = 'REVOKED' then
    return jsonb_build_object('ok', false, 'cardToken', null, 'alreadyEnrolled', true, 'reason', 'unavailable');
  end if;

  ---------------------------------------------------------------------------
  -- 8. Guarda de repetição rápida idempotente: se NADA mudou e já houve um
  --    enrollment_event para esta membership+link nos últimos 60s, não
  --    re-registra consents/evento/auditoria — só devolve o cartão.
  ---------------------------------------------------------------------------
  if not v_new_customer and not v_new_membership and not v_reactivated
     and exists (
       select 1 from public.enrollment_events
       where membership_id = v_membership_id
         and join_link_id = v_link_id
         and created_at > now() - interval '1 minute'
     ) then
    return jsonb_build_object('ok', true, 'cardToken', v_card_token, 'alreadyEnrolled', true);
  end if;

  ---------------------------------------------------------------------------
  -- 9. enrollment_events (append-only) + consentimentos (LGPD)
  ---------------------------------------------------------------------------
  insert into public.enrollment_events
    (organization_id, program_id, membership_id, join_link_id, was_new_customer)
  values
    (v_org_id, v_program_id, v_membership_id, v_link_id, v_new_customer)
  returning id into v_event_id;

  v_effective_email := coalesce(v_email, (select c.email from public.customers c where c.id = v_customer_id));

  -- DATA_PROCESSING: sempre GRANTED (a adesão pressupõe o tratamento).
  insert into public.customer_consents
    (customer_id, organization_id, consent_type, status, granted_at,
     purpose, term_version, source, source_ref)
  values
    (v_customer_id, v_org_id, 'DATA_PROCESSING', 'GRANTED', now(),
     'Tratamento de dados pessoais para adesao e gestao do programa de fidelidade (LGPD art. 7, I).',
     v_term_version, v_source, v_event_id::text)
  on conflict (customer_id, organization_id, consent_type) do update
    set status = 'GRANTED', granted_at = now(), revoked_at = null,
        purpose = excluded.purpose, term_version = excluded.term_version,
        source = excluded.source, source_ref = excluded.source_ref;

  -- MARKETING_WHATSAPP: só quando houve opt-in explícito.
  if p_opt_in_whatsapp then
    insert into public.customer_consents
      (customer_id, organization_id, consent_type, status, granted_at,
       purpose, term_version, source, source_ref)
    values
      (v_customer_id, v_org_id, 'MARKETING_WHATSAPP', 'GRANTED', now(),
       'Envio de comunicacoes de marketing e novidades por WhatsApp.',
       v_term_version, v_source, v_event_id::text)
    on conflict (customer_id, organization_id, consent_type) do update
      set status = 'GRANTED', granted_at = now(), revoked_at = null,
          purpose = excluded.purpose, term_version = excluded.term_version,
          source = excluded.source, source_ref = excluded.source_ref;
  end if;

  -- MARKETING_EMAIL: só com opt-in explícito E e-mail disponível.
  if p_opt_in_email and v_effective_email is not null then
    insert into public.customer_consents
      (customer_id, organization_id, consent_type, status, granted_at,
       purpose, term_version, source, source_ref)
    values
      (v_customer_id, v_org_id, 'MARKETING_EMAIL', 'GRANTED', now(),
       'Envio de comunicacoes de marketing e novidades por e-mail.',
       v_term_version, v_source, v_event_id::text)
    on conflict (customer_id, organization_id, consent_type) do update
      set status = 'GRANTED', granted_at = now(), revoked_at = null,
          purpose = excluded.purpose, term_version = excluded.term_version,
          source = excluded.source, source_ref = excluded.source_ref;
  end if;

  ---------------------------------------------------------------------------
  -- 10. audit_logs (append-only) — sem PII (nada de nome/telefone/e-mail)
  ---------------------------------------------------------------------------
  insert into public.audit_logs
    (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values
    (v_org_id, null, 'customer.enrolled_via_public_link', 'customer_membership', v_membership_id,
     jsonb_build_object(
       'joinLinkId', v_link_id,
       'enrollmentEventId', v_event_id,
       'wasNewCustomer', v_new_customer,
       'newMembership', v_new_membership,
       'membershipReactivated', v_reactivated,
       'consents', jsonb_build_object(
         'dataProcessing', true,
         'marketingWhatsapp', p_opt_in_whatsapp,
         'marketingEmail', (p_opt_in_email and v_effective_email is not null)
       )
     ));

  return jsonb_build_object(
    'ok', true,
    'cardToken', v_card_token,
    'alreadyEnrolled', v_already
  );
end;
$$;

comment on function public.enroll_customer(text, text, text, text, boolean, boolean) is
  'ETAPA 5.0B. Unico ponto de escrita publica de inscricao num programa. SECURITY DEFINER; resolve org/programa SO pelo program_join_links.token. Dedup por (organization_id, phone); idempotente por (org, phone, programa). Nunca cruza customer entre organizacoes, nunca altera saldo. Registra customer_consents (DATA_PROCESSING sempre; MARKETING_* so com opt-in), enrollment_events e audit_logs. Retorno: { ok, cardToken, alreadyEnrolled, reason? }.';

-- =============================================================================
-- Privilégios — EXECUTE só para anon/authenticated (Postgres concede a
-- PUBLIC por padrão em toda function nova; revogamos e reconcedemos).
-- =============================================================================
revoke all on function public.get_program_entry(text) from public;
grant execute on function public.get_program_entry(text) to anon, authenticated;

revoke all on function public.enroll_customer(text, text, text, text, boolean, boolean) from public;
grant execute on function public.enroll_customer(text, text, text, text, boolean, boolean) to anon, authenticated;
