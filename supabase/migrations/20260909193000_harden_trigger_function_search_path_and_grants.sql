-- Fidelize.club — hardening de segurança pré-homologação (ETAPA 4.2).
--
-- Corrige DOIS findings dos Supabase Advisors, sem tocar em nenhuma lógica,
-- assinatura, trigger ou policy de RLS:
--
--   1. function_search_path_mutable (0011, WARN) — 4 funções de trigger
--      próprias do projeto sem `search_path` fixo:
--        set_updated_at, forbid_mutation,
--        check_location_belongs_to_org, check_membership_program_org
--
--   2. anon_/authenticated_security_definer_function_executable (0028/0029,
--      WARN) — 3 funções de trigger `SECURITY DEFINER` com EXECUTE concedido
--      a anon/authenticated/PUBLIC:
--        apply_loyalty_transaction, handle_new_user, handle_new_organization
--
-- --------------------------------------------------------------------------
-- Parte 1 — search_path fixo (= public) nas 4 funções de trigger.
-- --------------------------------------------------------------------------
-- `ALTER FUNCTION ... SET search_path` altera SÓ a configuração da função:
-- OID, corpo, assinatura, dono e vínculo com os triggers permanecem
-- idênticos. As 4 já qualificam todos os objetos que referenciam
-- (`public.locations`, `public.loyalty_programs`) ou usam apenas builtins
-- de `pg_catalog` (`now()`), então `= public` não muda resolução de nome
-- alguma — apenas remove a dependência do search_path do chamador. Mesma
-- convenção já usada por is_platform_admin(), handle_new_user(),
-- apply_loyalty_transaction() etc.
--
-- Testado (transação revertida) contra o projeto de desenvolvimento:
--   set_updated_at ............... reescreve updated_at = now() no UPDATE   OK
--   forbid_mutation ............. rejeita UPDATE/DELETE no ledger (P0001)   OK
--   check_location_belongs_to_org  rejeita location de outra org (P0001)    OK
--   check_membership_program_org . rejeita programa de outra org (P0001)    OK

alter function public.set_updated_at() set search_path = public;
alter function public.forbid_mutation() set search_path = public;
alter function public.check_location_belongs_to_org() set search_path = public;
alter function public.check_membership_program_org() set search_path = public;

-- --------------------------------------------------------------------------
-- Parte 2 — remover EXECUTE de anon/authenticated/PUBLIC das funções que só
-- existem para rodar como TRIGGER.
-- --------------------------------------------------------------------------
-- Nenhuma destas é chamável fora de um trigger:
--   * PostgreSQL recusa a chamada direta em SQL (SQLSTATE 0A000
--     "trigger functions can only be called as triggers") — verificado
--     nas 6 funções `returns trigger` deste schema;
--   * PostgREST não expõe funções `returns trigger` como RPC — verificado
--     (`PGRST202` para /rest/v1/rpc/apply_loyalty_transaction, /handle_new_user,
--     /handle_new_organization, /set_updated_at, ...).
--
-- E revogar EXECUTE NÃO quebra os triggers: o privilégio de EXECUTE de uma
-- função de trigger é checado em CREATE TRIGGER, nunca no disparo. Provado
-- experimentalmente (transação revertida): a role `authenticated`, com
-- `has_function_privilege(...,'execute') = false`, disparou um trigger
-- BEFORE INSERT normalmente. Todos os triggers reais deste schema
-- (handle_new_organization, apply_loyalty_transaction, set_updated_at,
-- forbid_mutation, check_*) seguiram funcionando após a revogação no mesmo
-- teste.
--
-- `service_role` e o dono (`postgres`) mantêm o EXECUTE que a arquitetura
-- Supabase já lhes concede — este passo não mexe nisso (mesmo sem uso
-- prático, seguem a convenção existente do projeto).

-- 2a. Funções de trigger SECURITY DEFINER (findings 0028/0029).
revoke execute on function public.apply_loyalty_transaction() from anon, authenticated, public;
revoke execute on function public.handle_new_user()          from anon, authenticated, public;
revoke execute on function public.handle_new_organization()  from anon, authenticated, public;

-- 2b. Funções de trigger SECURITY INVOKER (não aparecem em 0028/0029 —
-- SECURITY INVOKER — mas o grant a PUBLIC/anon/authenticated também é
-- desnecessário e é higiene de pré-deploy: nunca são invocáveis).
revoke execute on function public.set_updated_at()                from anon, authenticated, public;
revoke execute on function public.forbid_mutation()              from anon, authenticated, public;
revoke execute on function public.check_location_belongs_to_org() from anon, authenticated, public;
revoke execute on function public.check_membership_program_org()  from anon, authenticated, public;

-- --------------------------------------------------------------------------
-- Fora do escopo desta migration (ver relatório da ETAPA 4.2):
--
--   * get_public_card / submit_card_feedback — DEVEM continuar executáveis
--     por anon/authenticated (são a porta pública do Web Card). Os findings
--     0028/0029 para elas são esperados e aceitos. Não mexer.
--
--   * is_platform_admin / is_org_member / org_role — SECURITY DEFINER
--     expostas via RPC por engano, MAS são chamadas dentro de ~20 policies
--     de RLS. Revogar EXECUTE de authenticated quebra TODA a RLS do painel
--     (verificado: `SELECT` em `organizations` como authenticated →
--     `42501 permission denied for function is_org_member`). A correção
--     seria movê-las para um schema não exposto (`private`) e reescrever as
--     policies — refatoração fora do escopo deste passo. Reportado como
--     risco residual + recomendação de follow-up.
