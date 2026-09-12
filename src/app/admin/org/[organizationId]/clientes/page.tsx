import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatCard } from "@/components/admin/StatCard";
import {
  CustomersTable,
  type OrgCustomerRow,
} from "@/components/admin/clientes-panel/CustomersTable";
import { formatNumber } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import { IconCheck, IconClock, IconUsers } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Clientes",
  robots: { index: false, follow: false },
};

/**
 * Clientes da organização — PAINEL DO ESTABELECIMENTO (ETAPA 4.6F, regra do
 * MVP pós-homologação: "estabelecimento pode identificar e consultar
 * somente seus próprios clientes, saldo/progresso, visitas/selos, última
 * atividade e histórico"). Fonte: RPC `admin_list_org_customers`
 * (SECURITY DEFINER, só leitura) — não um SELECT direto em
 * `public.customers`, que é entidade GLOBAL sem `organization_id` e por
 * isso nunca ganha policy de leitura ampla para a equipe do
 * estabelecimento (docs/BANCO_DE_DADOS.md, seção 5.1). A RPC faz o join
 * com `customer_memberships` e filtra por `organization_id` sempre a
 * partir do parâmetro — isolamento multi-tenant preservado, nada de RLS
 * enfraquecida. Retorna só os campos de listagem (nunca e-mail/telefone/
 * histórico) — o histórico completo fica em `admin_get_customer_detail`,
 * usado pela página de detalhe (`[membershipId]/page.tsx`). Sem
 * criar/excluir/exportar: não há RPC alguma para isso.
 */
export default async function ClientesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase } = await requireOrgAccess(organizationId);

  const { data } = await supabase.rpc("admin_list_org_customers", {
    p_organization_id: organizationId,
  });
  const payload = data as { ok?: boolean; customers?: OrgCustomerRow[] } | null;
  const rows = payload?.ok ? (payload.customers ?? []) : [];

  // Derivados apenas das linhas carregadas (até 200) — nunca extrapolados.
  const activeRows = rows.filter((row) => row.status === "ACTIVE").length;
  const withActivity = rows.filter((row) => Boolean(row.last_activity_at)).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Base de clientes"
        title="Clientes"
        description="Consumidores que aderiram a um programa deste estabelecimento, com saldo e última atividade reais."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<IconUsers className="h-6 w-6" />}
          title="Nenhum cliente com adesão ainda"
          description="Assim que consumidores aderirem a um programa deste estabelecimento, cada adesão aparece aqui com pontos, visitas e última atividade."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              accent
              label="Adesões listadas"
              value={formatNumber(rows.length)}
              hint={rows.length >= 200 ? "As 200 mais recentes." : "Todas as adesões."}
              icon={<IconUsers className="h-5 w-5" />}
            />
            <StatCard
              label="Com adesão ativa"
              value={formatNumber(activeRows)}
              hint="Entre as adesões listadas."
              icon={<IconCheck className="h-5 w-5" />}
            />
            <StatCard
              label="Com atividade registrada"
              value={formatNumber(withActivity)}
              hint="Já tiveram ao menos um lançamento."
              icon={<IconClock className="h-5 w-5" />}
            />
          </div>

          <SectionCard
            title="Adesões"
            description="Busque por nome ou navegue pela lista, ordenada da mais recente para a mais antiga."
            flush
            footer={
              rows.length >= 200
                ? "Mostrando as 200 adesões mais recentes."
                : `${formatNumber(rows.length)} ${rows.length === 1 ? "adesão" : "adesões"}.`
            }
          >
            <CustomersTable organizationId={organizationId} rows={rows} />
          </SectionCard>
        </>
      )}
    </div>
  );
}
