import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  getAdminContext,
  resolveOrganizationAccess,
  type AdminContext,
  type OrganizationAccess,
} from "./context";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type OrgPageAccess = {
  supabase: SupabaseServerClient;
  context: AdminContext;
  access: OrganizationAccess;
};

/**
 * Guarda reutilizável por cada página do CONTEXTO DE ORGANIZAÇÃO
 * (`/admin/org/[organizationId]/...`). O layout já barra o acesso, mas
 * cada página revalida server-side — "nunca confia só na navegação
 * renderizada" (docs/ARQUITETURA.md, seção 10) — e recebe de volta o
 * `access` (com `viewerRole`) para adaptar o que mostra sem esconder nada
 * que o backend/RLS já não proteja.
 *
 * Sem sessão -> `/login`. Organização alheia/inexistente -> `notFound()`
 * (nunca confirma que o id existe). Nenhuma query usa `service_role`: é a
 * própria sessão do usuário, sujeita a RLS como qualquer outra.
 */
export async function requireOrgAccess(
  organizationId: string,
): Promise<OrgPageAccess> {
  const supabase = await createClient();
  const context = await getAdminContext(supabase);

  if (!context) {
    redirect("/login");
  }

  const access = await resolveOrganizationAccess(
    supabase,
    context,
    organizationId,
  );

  if (!access) {
    notFound();
  }

  return { supabase, context, access };
}
