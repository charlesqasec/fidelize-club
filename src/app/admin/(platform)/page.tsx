import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatCard } from "@/components/admin/StatCard";
import { IconChart } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Visão geral",
  description: "Resumo da operação do Fidelize.club.",
  robots: { index: false, follow: false },
};

/**
 * Visão geral da PLATAFORMA — cross-tenant, só para platform_admin (ver
 * `../layout.tsx`). Nenhum número aqui é real: os cards mostram "—" porque
 * as fontes (cadastro de estabelecimento, motor de fidelidade, check-in)
 * ainda não existem.
 */
export default function AdminHomePage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Visão geral"
        description="Resumo da operação em todos os estabelecimentos. Ainda sem dados — os números aparecem aqui assim que houver estabelecimentos, clientes e campanhas cadastrados."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Estabelecimentos ativos"
          hint="Aparece quando houver estabelecimentos cadastrados."
        />
        <StatCard
          label="Clientes com cartão"
          hint="Aparece quando o Cartão Digital existir (ETAPA 5)."
        />
        <StatCard
          label="Check-ins (30 dias)"
          hint="Aparece quando o motor de fidelidade existir (ETAPA 6)."
        />
        <StatCard
          label="Campanhas ativas"
          hint="Aparece quando houver campanhas aprovadas."
        />
      </div>

      <EmptyState
        icon={<IconChart className="h-6 w-6" />}
        title="Nenhuma atividade ainda"
        description="Check-ins, novos cadastros e campanhas enviadas vão aparecer aqui, em ordem cronológica, assim que a operação começar."
      />
    </div>
  );
}
