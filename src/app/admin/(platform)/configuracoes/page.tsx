import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { IconWrench } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Configurações da plataforma",
  robots: { index: false, follow: false },
};

/**
 * Placeholder visual — configuração real é etapa futura. Distinta da
 * "Configurações" de organização (`org/[organizationId]/configuracoes`):
 * esta é `public.platform_settings` (kill-switch global, singleton);
 * aquela é `public.organization_feature_flags` (por organização). O
 * efetivo de cada canal é `platform.X AND organization.X` —
 * docs/BANCO_DE_DADOS.md, seção 3.
 */
export default function PlatformConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Configurações da plataforma"
        description="Kill-switch global de canais (Google Wallet, Apple Wallet, Web Push) e outras preferências que valem para todos os estabelecimentos."
      />
      <EmptyState
        icon={<IconWrench className="h-6 w-6" />}
        title="Nada para configurar ainda"
        description="Os flags globais de plataforma_settings vão aparecer aqui — o efetivo de cada canal é sempre plataforma E organização, nunca só um dos dois."
      />
    </div>
  );
}
