import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { AdminShell, type NavItem } from "@/components/admin/AdminShell";
import { getAdminContext, resolveOrganizationAccess } from "@/lib/admin/context";
import { orgRoleLabel } from "@/lib/admin/status";
import { createClient } from "@/lib/supabase/server";

import { logout } from "../../actions";

function buildOrgNav(organizationId: string): NavItem[] {
  const base = `/admin/org/${organizationId}`;
  return [
    { label: "Visão geral", href: base, icon: "chart", exact: true },
    { label: "Programa", href: `${base}/programa`, icon: "repeat" },
    { label: "Clientes", href: `${base}/clientes`, icon: "users" },
    { label: "Campanhas", href: `${base}/campanhas`, icon: "megaphone" },
    { label: "NFC & QR", href: `${base}/nfc-qr`, icon: "nfc" },
    { label: "Feedback", href: `${base}/feedback`, icon: "star" },
    { label: "Configurações", href: `${base}/configuracoes`, icon: "wrench" },
  ];
}

/**
 * Guarda + shell do CONTEXTO DE ORGANIZAÇÃO (ETAPA 3.2.1,
 * docs/ARQUITETURA.md, seção 10). Dois públicos completamente diferentes
 * chegam aqui pela mesma rota:
 *
 * - `platform_admin` "entrando" numa organização para configurar/dar
 *   suporte — com a PRÓPRIA sessão, nunca a senha do estabelecimento.
 *   `resolveOrganizationAccess` libera qualquer `organizationId` para ele.
 * - Membro do estabelecimento (`organization_members`, OWNER/MANAGER/
 *   STAFF) — só entra na(s) organização(ões) onde tem membership ATIVA.
 *   Tentar outro `organizationId` (mesmo sabendo que existe) cai em
 *   `notFound()`, não num redirect "sem permissão" — não confirmamos pra
 *   ele que aquele id é de uma organização de verdade.
 *
 * Layout irmão de `src/app/admin/(platform)/layout.tsx`, não aninhado
 * nele — por isso cada um monta seu próprio `<AdminShell>` com o `nav`
 * certo, e só este aqui passa `orgContext` (a faixa "Administrando:
 * [nome]"). `showPlatformSwitch` só é true para platform_admin: um membro
 * de estabelecimento não tem uma "plataforma" pra voltar.
 */
export default async function OrganizationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const supabase = await createClient();
  const context = await getAdminContext(supabase);

  if (!context) {
    redirect("/login");
  }

  if (!context.isPlatformAdmin && context.memberships.length === 0) {
    await supabase.auth.signOut();
    redirect("/login?error=acesso_negado");
  }

  const organization = await resolveOrganizationAccess(
    supabase,
    context,
    organizationId,
  );

  if (!organization) {
    notFound();
  }

  return (
    <AdminShell
      email={context.email}
      logoutAction={logout}
      nav={buildOrgNav(organizationId)}
      orgContext={{ id: organization.organizationId, name: organization.organizationName }}
      showPlatformSwitch={context.isPlatformAdmin}
      viewerLabel={
        organization.viewerRole === "PLATFORM_ADMIN"
          ? "Equipe Fidelize"
          : orgRoleLabel(organization.viewerRole)
      }
    >
      {children}
    </AdminShell>
  );
}
