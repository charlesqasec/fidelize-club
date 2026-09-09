import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminShell, type NavItem } from "@/components/admin/AdminShell";
import { getAdminContext } from "@/lib/admin/context";
import { createClient } from "@/lib/supabase/server";

import { logout } from "../actions";

const PLATFORM_NAV: NavItem[] = [
  { label: "Visão geral", href: "/admin", icon: "chart", exact: true },
  { label: "Estabelecimentos", href: "/admin/estabelecimentos", icon: "store" },
  { label: "Configurações da plataforma", href: "/admin/configuracoes", icon: "wrench" },
];

/**
 * Guarda + shell do CONTEXTO DE PLATAFORMA (equipe Fidelize —
 * docs/ARQUITETURA.md, seção 10). Só `platform_admin` ativo enxerga esta
 * navegação (Estabelecimentos, Configurações da plataforma): um membro de
 * estabelecimento não tem visão de plataforma nenhuma — é mandado direto
 * para o contexto da própria organização, nunca vê este menu.
 *
 * Grupo de rotas `(platform)` — não aparece na URL (`/admin`,
 * `/admin/estabelecimentos`, `/admin/configuracoes` continuam exatamente
 * como antes). Existe só para este layout não ser o mesmo componente de
 * `src/app/admin/org/[organizationId]/layout.tsx`, que tem sua própria
 * guarda e seu próprio `<AdminShell>` — layouts irmãos, não aninhados, para
 * a barra "Administrando: [organização]" só existir onde faz sentido.
 *
 * `src/proxy.ts` já barra quem não tem sessão nenhuma antes de chegar
 * aqui — isso é só a primeira barreira. A autorização de verdade mora
 * aqui, server-side, via `getAdminContext()` (nunca `service_role`).
 */
export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const context = await getAdminContext(supabase);

  if (!context) {
    redirect("/login");
  }

  if (!context.isPlatformAdmin) {
    // Não é equipe Fidelize. Se for equipe de algum estabelecimento, o
    // contexto de plataforma não existe pra ele — manda pra organização
    // dele, nunca mostra este menu. Sem membership nenhuma = mesma regra
    // de acesso negado do login (src/app/login/actions.ts).
    if (context.memberships.length > 0) {
      redirect(`/admin/org/${context.memberships[0].organizationId}`);
    }
    await supabase.auth.signOut();
    redirect("/login?error=acesso_negado");
  }

  return (
    <AdminShell
      email={context.email}
      logoutAction={logout}
      nav={PLATFORM_NAV}
      viewerLabel="Equipe Fidelize"
    >
      {children}
    </AdminShell>
  );
}
