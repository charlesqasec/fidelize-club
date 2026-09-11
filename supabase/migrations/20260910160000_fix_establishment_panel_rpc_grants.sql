-- Fidelize.club — ETAPA 4.6B: correção de privilégios das funções de
-- 20260910150000_establishment_panel_admin_rpcs.sql.
--
-- Finding da homologação: o `revoke ... from public` daquela migration NÃO
-- remove o EXECUTE que o Supabase concede automaticamente a `anon` e
-- `authenticated` em toda function nova — as 6 funções ficaram chamáveis por
-- `anon` (advisors 0028/0029). A segurança funcional estava intacta (as
-- RPCs validam `auth.uid()` e retornam `forbidden` sem escrever), mas o
-- privilégio divergia da intenção. Corrige com REVOKE/GRANT explícitos,
-- mesma técnica de 20260909193000.
--
-- NÃO altera corpo de função, assinatura, RLS, tabela, trigger nem o ledger.
-- `ALTER ... ` nenhum: só `REVOKE` / `GRANT` de EXECUTE.

-- ---------------------------------------------------------------------------
-- 1. As 5 RPCs administrativas: EXECUTE só para `authenticated`.
--    (exigem sessão; o RBAC real é validado dentro da function.)
-- ---------------------------------------------------------------------------
revoke execute on function public.admin_update_organization(uuid, text)
  from public, anon;
grant execute on function public.admin_update_organization(uuid, text)
  to authenticated;

revoke execute on function public.admin_update_feature_flags(uuid, boolean, boolean, boolean, boolean, boolean)
  from public, anon;
grant execute on function public.admin_update_feature_flags(uuid, boolean, boolean, boolean, boolean, boolean)
  to authenticated;

revoke execute on function public.admin_create_location(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.admin_create_location(uuid, text, text, jsonb)
  to authenticated;

revoke execute on function public.admin_update_location(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.admin_update_location(uuid, text, text, jsonb)
  to authenticated;

revoke execute on function public.admin_set_location_status(uuid, text)
  from public, anon;
grant execute on function public.admin_set_location_status(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helper admin_org_actor_role: NÃO é ponto de entrada — nem `anon` nem
--    `authenticated` devem chamá-lo via RPC. As 5 RPCs são SECURITY DEFINER
--    e rodam como o dono (postgres), que mantém o EXECUTE de dono mesmo
--    após o REVOKE — o uso interno continua funcionando.
-- ---------------------------------------------------------------------------
revoke execute on function public.admin_org_actor_role(uuid)
  from public, anon, authenticated;
