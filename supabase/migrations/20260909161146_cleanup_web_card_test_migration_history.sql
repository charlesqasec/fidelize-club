-- Fidelize.club — limpeza de histórico de migrations (ETAPA 4.0.1).
--
-- Durante a validação de get_public_card/submit_card_feedback contra o
-- projeto real, 8 migrations puramente TEMPORÁRIAS foram aplicadas para
-- inserir e depois remover fixtures de teste (web_card_test_fixtures_temp,
-- web_card_test_toggle_states_1/2 [+ revert], web_card_test_fixtures_teardown,
-- web_card_test_route_e2e_temp/teardown). Nenhuma delas alterou schema —
-- só dados (inseridos e depois apagados pelas próprias migrations
-- seguintes) — e nenhuma tem arquivo correspondente neste repositório,
-- de propósito: eram efêmeras, existiram só para o round-trip de teste.
--
-- Esta migration remove o RASTREAMENTO dessas 8 entradas de
-- `supabase_migrations.schema_migrations`, para o histórico remoto voltar
-- a corresponder exatamente aos arquivos deste diretório. Não desfaz
-- nenhum dado (já desfeito) nem toca em nenhuma tabela de negócio,
-- function ou policy.
delete from supabase_migrations.schema_migrations
where version in (
  '20260909155435', -- web_card_test_fixtures_temp
  '20260909155550', -- web_card_test_toggle_states_1
  '20260909155611', -- web_card_test_toggle_states_1_revert
  '20260909155804', -- web_card_test_toggle_states_2
  '20260909155831', -- web_card_test_toggle_states_2_revert
  '20260909155847', -- web_card_test_fixtures_teardown
  '20260909160355', -- web_card_test_route_e2e_temp
  '20260909160704'  -- web_card_test_route_e2e_teardown
);
