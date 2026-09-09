-- Fidelize.club — funções públicas do Web Card (ETAPA 4.0.1).
--
-- Contexto (docs/BANCO_DE_DADOS.md, seção 5, item 3): `customer_cards` e
-- toda tabela da qual o Web Card depende (`customer_memberships`,
-- `customers`, `loyalty_programs`, `program_branding`, `rewards`,
-- `campaigns`, `campaign_messages`, `review_channels`, `customer_feedback`,
-- `organization_feature_flags`) só têm policy de SELECT para
-- `is_org_member()`/`is_platform_admin()` — nenhuma delas ganha policy de
-- leitura/escrita para `anon` nesta migration, nem aqui nem em nenhum
-- lugar. O visitante anônimo do `/c/[token]` nunca toca essas tabelas
-- diretamente: as duas funções abaixo são a ÚNICA porta de entrada,
-- cada uma validando e resolvendo tudo internamente a partir só do token.
--
-- Por que SECURITY DEFINER: as duas funções rodam com os privilégios de
-- quem as criou (não do chamador `anon`), então conseguem ler/escrever as
-- tabelas base mesmo sem nenhuma policy de RLS liberando isso para `anon`
-- — a segurança não vem da RLS aqui, vem inteiramente da lógica interna da
-- função (nunca aceitar organization_id/customer_id/membership_id do
-- chamador; resolver tudo a partir do token; nunca SQL dinâmico; nunca
-- retornar coluna sensível). `set search_path = public` fixo em ambas —
-- mesma convenção já usada por `is_platform_admin()`, `is_org_member()`,
-- `handle_new_user()` e `apply_loyalty_transaction()` nas migrations
-- anteriores — evita que um `search_path` manipulado pelo chamador engane
-- a função a resolver `public.customer_cards` (ou qualquer objeto sem
-- schema qualificado) para outra coisa.
--
-- Nenhuma tabela base muda nesta migration. Nenhuma policy nova. Nenhum
-- `USING (true)`. Nenhum uso de `service_role`.

-- =============================================================================
-- get_public_card — leitura do Web Card por token.
-- =============================================================================
--
-- Contrato de retorno (consumido por src/lib/card/getPublicCard.ts):
--   null                                              -> token não corresponde a nenhum cartão (estado "not_found")
--   { outcome: "card_inactive", organizationName? }   -> customer_cards.status <> 'ACTIVE'
--   { outcome: "program_inactive", organizationName? }-> programa arquivado/rascunho, ou organização suspensa/cancelada
--   { outcome: "ok", card: {...} }                    -> formato exato de PublicCardData (src/lib/card/types.ts)
--
-- "not_found" e "card_inactive"/"program_inactive" são deliberadamente
-- diferenciáveis (o token em si tem 192 bits de entropia — ver comentário
-- de `public_token` em cards_and_wallet.sql — então dizer "este cartão
-- existiu mas foi desativado" não habilita enumeração prática). O que a
-- função NUNCA faz é aceitar organization_id/customer_id/membership_id
-- como parâmetro: tudo é resolvido a partir do `public_token`, sempre.
create or replace function public.get_public_card(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_status          text;
  v_membership_id        uuid;

  v_customer_id          uuid;
  v_organization_id      uuid;
  v_program_id           uuid;
  v_membership_status    text;
  v_points                integer;
  v_stamps                integer;
  v_visits                integer;
  v_joined_at             timestamptz;
  v_last_activity_at      timestamptz;

  v_org_name              text;
  v_org_status            text;

  v_program_name          text;
  v_program_type          text;
  v_program_status        text;
  v_program_rules         jsonb;

  v_customer_name         text;
  v_first_name            text;

  v_branding              jsonb;
  v_rewards               jsonb;
  v_campaigns              jsonb;
  v_review                jsonb;

  v_reviews_enabled        boolean;
  v_internal_feedback_enabled boolean;
begin
  -- Defesa em profundidade: o formato já é validado em
  -- src/lib/card/getPublicCard.ts antes do round-trip de rede (evita
  -- gastar uma consulta com lixo óbvio), mas esta função nunca confia só
  -- nisso — repete a checagem aqui dentro.
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then
    return null;
  end if;

  select cc.status, cc.membership_id
    into v_card_status, v_membership_id
  from public.customer_cards cc
  where cc.public_token = p_token;

  if not found then
    return null;
  end if;

  select cm.customer_id, cm.organization_id, cm.program_id, cm.status,
         cm.current_points, cm.current_stamps, cm.current_visits,
         cm.joined_at, cm.last_activity_at
    into v_customer_id, v_organization_id, v_program_id, v_membership_status,
         v_points, v_stamps, v_visits, v_joined_at, v_last_activity_at
  from public.customer_memberships cm
  where cm.id = v_membership_id;

  if not found then
    -- Inatingível em operação normal (customer_memberships.id é FK not
    -- null de customer_cards.membership_id, on delete cascade — se o
    -- cartão existe, o membership existe). Ainda assim, nunca assume.
    return null;
  end if;

  select o.name, o.status into v_org_name, v_org_status
  from public.organizations o
  where o.id = v_organization_id;

  if v_card_status <> 'ACTIVE' then
    return jsonb_build_object('outcome', 'card_inactive', 'organizationName', v_org_name);
  end if;

  select p.name, p.type, p.status, p.rules
    into v_program_name, v_program_type, v_program_status, v_program_rules
  from public.loyalty_programs p
  where p.id = v_program_id;

  -- ARCHIVED/DRAFT viram "program_inactive" (DRAFT não deveria ter
  -- membership nenhum na prática, mas é defesa em profundidade, não
  -- confiança no dado). Organização SUSPENDED/CANCELLED reaproveita o
  -- mesmo estado — para o consumidor é a mesma experiência ("este
  -- estabelecimento não está operando no Fidelize agora"); a UI não
  -- distingue as duas causas, então a function também não precisa.
  if v_program_status in ('ARCHIVED', 'DRAFT') or v_org_status in ('SUSPENDED', 'CANCELLED') then
    return jsonb_build_object('outcome', 'program_inactive', 'organizationName', v_org_name);
  end if;

  select coalesce(f.reviews_enabled, false), coalesce(f.internal_feedback_enabled, true)
    into v_reviews_enabled, v_internal_feedback_enabled
  from public.organization_feature_flags f
  where f.organization_id = v_organization_id;
  -- `organization_feature_flags` é criada automaticamente para toda
  -- organização (trigger on_organization_created) — o COALESCE acima é só
  -- defesa em profundidade, não é o caminho esperado.
  --
  -- `web_card_enabled` desta tabela NÃO é lido/checado aqui de propósito:
  -- o comentário da própria coluna (20260908060142_platform_and_organizations.sql)
  -- e docs/ARQUITETURA.md, seção 2, são explícitos — é o canal oficial
  -- permanente do produto e "nunca deve ser desligado". Gate-ar esta
  -- function nele contradiria essa decisão já registrada.

  select c.name into v_customer_name
  from public.customers c
  where c.id = v_customer_id;

  v_first_name := nullif(split_part(coalesce(v_customer_name, ''), ' ', 1), '');

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
  -- Sem linha em program_branding -> v_branding permanece NULL (branding
  -- ausente é um estado legítimo, tratado pela UI com as cores padrão da
  -- Fidelize — nunca inventamos um branding aqui).

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'description', r.description,
        'type', r.reward_type,
        'threshold', r.threshold
      )
      order by r.threshold asc
    ),
    '[]'::jsonb
  )
    into v_rewards
  from public.rewards r
  where r.program_id = v_program_id
    and r.organization_id = v_organization_id
    and r.status = 'ACTIVE';

  -- Campanhas: só ACTIVE (aprovada — a constraint campaigns_require_approval
  -- já impede ACTIVE sem approved_by/approved_at no banco), da mesma
  -- organização, com program_id nulo (vale para todos os programas) OU
  -- igual ao programa deste cartão, dentro do período vigente quando
  -- start_at/end_at estiverem definidos, e com uma campaign_messages no
  -- canal WEB_CARD que não esteja em DRAFT nem CANCELLED (a mensagem
  -- precisa estar finalizada pelo estabelecimento, mesmo sem envio
  -- funcional — Web Push/Wallet são etapas futuras; o Web Card é
  -- "pull", não depende de um envio real acontecer).
  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', camp.id, 'title', msg.title, 'body', msg.body)
      order by camp.created_at desc
    ),
    '[]'::jsonb
  )
    into v_campaigns
  from public.campaigns camp
  join lateral (
    select cm2.title, cm2.body
    from public.campaign_messages cm2
    where cm2.campaign_id = camp.id
      and cm2.channel = 'WEB_CARD'
      and cm2.status in ('SCHEDULED', 'SENT')
    order by cm2.created_at desc
    limit 1
  ) msg on true
  where camp.organization_id = v_organization_id
    and (camp.program_id is null or camp.program_id = v_program_id)
    and camp.status = 'ACTIVE'
    and (camp.start_at is null or camp.start_at <= now())
    and (camp.end_at is null or camp.end_at >= now());

  if v_reviews_enabled then
    select jsonb_build_object(
      'label', coalesce(
        nullif(rc.label, ''),
        case rc.provider
          when 'GOOGLE' then 'Google'
          when 'TRIPADVISOR' then 'TripAdvisor'
          when 'FACEBOOK' then 'Facebook'
          else 'nosso canal de avaliação'
        end
      ),
      'url', rc.url
    )
      into v_review
    from public.review_channels rc
    where rc.organization_id = v_organization_id
      and rc.status = 'ACTIVE'
    order by rc.created_at asc
    limit 1;
  end if;
  -- v_review permanece NULL quando reviews_enabled=false ou não há canal
  -- ACTIVE — a UI só mostra o botão de avaliação quando isto é não-nulo.

  return jsonb_build_object(
    'outcome', 'ok',
    'card', jsonb_build_object(
      'organization', jsonb_build_object('name', v_org_name),
      'program', jsonb_build_object(
        'name', v_program_name,
        'type', v_program_type,
        'status', v_program_status,
        'rules', coalesce(v_program_rules, '{}'::jsonb)
      ),
      'branding', v_branding,
      'customer', jsonb_build_object('firstName', v_first_name),
      'membership', jsonb_build_object(
        'status', v_membership_status,
        'points', v_points,
        'stamps', v_stamps,
        'visits', v_visits,
        'joinedAt', v_joined_at,
        'lastActivityAt', v_last_activity_at
      ),
      'rewards', v_rewards,
      'campaigns', v_campaigns,
      'reviewChannel', v_review,
      'feedbackEnabled', v_internal_feedback_enabled
    )
  );
end;
$$;

comment on function public.get_public_card(text) is
  'Único ponto de leitura pública do Web Card (/c/[token], ETAPA 4.0.1). SECURITY DEFINER: resolve tudo a partir de customer_cards.public_token, nunca aceita organization_id/customer_id do chamador. Nenhuma tabela base ganhou policy de SELECT para anon — a segurança desta function é a lógica interna, não RLS.';

-- =============================================================================
-- submit_card_feedback — feedback interno (1 a 5 estrelas + comentário).
-- =============================================================================
--
-- Espelha a UI já pronta em src/components/card/FeedbackCard.tsx e o
-- contrato já definido em src/lib/card/submitFeedback.ts
-- (SubmitFeedbackResult). Nunca publica nada externamente — feedback
-- interno é sempre privado à organização (docs/ARQUITETURA.md, seção 7.2-B).
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

  select cc.status, cc.membership_id
    into v_card_status, v_membership_id
  from public.customer_cards cc
  where cc.public_token = p_token;

  if not found or v_card_status <> 'ACTIVE' then
    -- Mesma mensagem genérica para "token não existe" e "cartão
    -- desativado" — quem chama esta function já passou pelo
    -- get_public_card antes (a UI só mostra o formulário quando o cartão
    -- está "ok"), então esta branch cobre principalmente token adulterado
    -- entre uma chamada e outra, não um fluxo normal.
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

  -- Sanitização: string vazia/só espaço vira NULL; nunca mais que 1000
  -- caracteres, mesmo que o cliente tenha mandado mais (o limite de 1000
  -- do lado do app em submitFeedback.ts é conveniência de UX, não a
  -- fonte de verdade — esta linha é).
  v_comment := nullif(btrim(left(coalesce(p_comment, ''), 1000)), '');

  -- Defesa mínima contra abuso, usando dado que já existe
  -- (customer_feedback.membership_id + created_at) — sem tabela nova, sem
  -- infraestrutura nova. Limite deliberadamente pequeno (3 por cartão a
  -- cada 24h): alto o bastante para nunca incomodar um cliente real (que
  -- envia feedback uma vez, talvez duas se errou), baixo o bastante para
  -- travar um script simples de flood em poucas tentativas. Isto NÃO
  -- substitui rate limiting por IP/dispositivo numa borda (Cloudflare,
  -- proxy, etc.) — é a documentada limitação desta etapa, não uma
  -- proteção completa contra abuso distribuído.
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
  'Único ponto de escrita pública de feedback interno (ETAPA 4.0.1). SECURITY DEFINER: resolve organization_id/membership_id a partir do token, nunca os aceita como parâmetro. Rating 1-5 e comentário (máx. 1000 caracteres) validados dentro da function, não só no cliente. Defesa contra abuso: no máximo 3 envios por cartão a cada 24h, calculada sobre customer_feedback existente — ver comentário interno para limitações.';

-- =============================================================================
-- Privilégios — só EXECUTE, só para anon/authenticated.
-- =============================================================================
--
-- Postgres concede EXECUTE em toda function nova para PUBLIC por padrão
-- (diferente de tabelas). Revogamos isso explicitamente e concedemos de
-- volta só para os dois papéis que o Web Card público realmente usa.
-- `service_role` não é mencionado aqui de propósito — nada nesta etapa
-- depende dele, e não é este o lugar para decidir se o Fidelize Admin
-- deve chamar estas functions (ele já lê as tabelas base diretamente, com
-- sua própria sessão, sujeito à RLS normal).
revoke all on function public.get_public_card(text) from public;
grant execute on function public.get_public_card(text) to anon, authenticated;

revoke all on function public.submit_card_feedback(text, integer, text) from public;
grant execute on function public.submit_card_feedback(text, integer, text) to anon, authenticated;
