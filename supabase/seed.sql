-- Fidelize.club — seed de desenvolvimento local.
--
-- Executado por `supabase db reset` (config.toml → [db.seed]). Dados 100%
-- fictícios, claramente identificados como demo (docs/ARQUITETURA.md,
-- seção 12 do plano original / regra "não usar nomes de empresas reais").
--
-- Deliberadamente NÃO cria nenhum usuário em auth.users nem
-- organization_members: autenticação está fora do escopo desta etapa
-- (ETAPA 2 é fundação de schema, não login). Quem quiser testar como
-- OWNER/STAFF deve criar um usuário via Supabase Auth localmente e inserir
-- a linha correspondente em organization_members manualmente.

do $$
declare
  v_org_id uuid;
  v_location_id uuid;
  v_program_id uuid;
  v_reward_id uuid;
  v_customer_id uuid;
  v_membership_id uuid;
  v_channel_id uuid;
  v_txn_id uuid;
begin
  insert into public.organizations (name, slug)
  values ('Barbearia Demo', 'barbearia-demo')
  returning id into v_org_id;

  insert into public.locations (organization_id, name, slug)
  values (v_org_id, 'Unidade Demo', 'unidade-demo')
  returning id into v_location_id;

  insert into public.loyalty_programs (organization_id, name, type, status, rules)
  values (v_org_id, 'Clube de Fidelidade Demo', 'VISIT', 'ACTIVE', '{"target": 10}'::jsonb)
  returning id into v_program_id;

  insert into public.program_branding (
    program_id, primary_color, secondary_color, card_style, headline, description
  )
  values (
    v_program_id, '#6d3ce0', '#1e0b47', 'CLASSIC',
    'Bom corte sempre te traz de volta.',
    'Programa de fidelidade de demonstração — dados fictícios.'
  );

  insert into public.rewards (organization_id, program_id, name, description, reward_type, threshold)
  values (v_org_id, v_program_id, 'Corte grátis', 'Complete 10 visitas e ganhe um corte grátis.', 'FREE_ITEM', 10)
  returning id into v_reward_id;

  insert into public.customers (name, email)
  values ('Cliente Demo', 'cliente.demo@exemplo.invalid')
  returning id into v_customer_id;

  insert into public.customer_memberships (customer_id, organization_id, program_id)
  values (v_customer_id, v_org_id, v_program_id)
  returning id into v_membership_id;

  -- Seis visitas demonstrativas (o trigger apply_loyalty_transaction
  -- atualiza current_visits automaticamente a cada insert).
  for i in 1..6 loop
    insert into public.loyalty_transactions (
      organization_id, program_id, membership_id, location_id, type, amount, source
    )
    values (v_org_id, v_program_id, v_membership_id, v_location_id, 'VISIT', 1, 'ADMIN')
    returning id into v_txn_id;
  end loop;

  insert into public.customer_cards (membership_id)
  values (v_membership_id);

  -- URL em domínio .invalid (RFC 2606) — nunca resolve a um endereço real,
  -- para não parecer um link de avaliação verdadeiro.
  insert into public.review_channels (organization_id, provider, label, url)
  values (v_org_id, 'GOOGLE', 'Google Reviews (demo)', 'https://reviews.exemplo.invalid/barbearia-demo')
  returning id into v_channel_id;

  insert into public.customer_feedback (organization_id, membership_id, visit_transaction_id, rating, comment)
  values (v_org_id, v_membership_id, v_txn_id, 5, 'Atendimento ótimo, ambiente agradável. (feedback de demonstração)');
end $$;
