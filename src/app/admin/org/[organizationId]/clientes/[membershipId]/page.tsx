import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { DataTable } from "@/components/admin/DataTable";
import { InlineEmpty, SectionCard } from "@/components/admin/SectionCard";
import { StatCard } from "@/components/admin/StatCard";
import { formatDateTime, formatNumber } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import {
  programTypeLabel,
  statusView,
  transactionTypeLabel,
} from "@/lib/admin/status";
import {
  IconArrowLeft,
  IconClock,
  IconGift,
  IconRepeat,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Detalhe do cliente",
  robots: { index: false, follow: false },
};

type CustomerDetail = {
  membership_id: string;
  name: string | null;
  status: string;
  current_points: number;
  current_stamps: number;
  current_visits: number;
  joined_at: string;
  last_activity_at: string | null;
  program_name: string | null;
  program_type: string | null;
};

type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  source: string;
  created_at: string;
};

/**
 * Detalhe de UMA adesão — PAINEL DO ESTABELECIMENTO (ETAPA 4.6F). Fonte:
 * RPC `admin_get_customer_detail` (SECURITY DEFINER, só leitura), que
 * revalida `p_membership_id` contra `p_organization_id` no servidor —
 * isolamento multi-tenant preservado mesmo que alguém tente adivinhar o id
 * de uma adesão de outro estabelecimento (volta `not_found`, nunca vaza
 * dado de outra organização). Mostra o histórico do ledger
 * (`loyalty_transactions`) que a listagem não traz, por menor privilégio —
 * nunca e-mail/telefone. Sem edição: esta página é só consulta.
 */
export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ organizationId: string; membershipId: string }>;
}) {
  const { organizationId, membershipId } = await params;
  const { supabase } = await requireOrgAccess(organizationId);

  const { data } = await supabase.rpc("admin_get_customer_detail", {
    p_organization_id: organizationId,
    p_membership_id: membershipId,
  });
  const payload = data as
    | { ok?: boolean; customer?: CustomerDetail; history?: TransactionRow[] }
    | null;

  if (!payload?.ok || !payload.customer) {
    notFound();
  }

  const customer = payload.customer;
  const history = payload.history ?? [];
  const view = statusView.membership(customer.status);

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/org/${organizationId}/clientes`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
      >
        <IconArrowLeft className="h-4 w-4" />
        Voltar para Clientes
      </Link>

      <AdminPageHeader
        eyebrow="Base de clientes"
        title={customer.name ?? "Cliente sem nome"}
        description={
          customer.program_name
            ? `${customer.program_name}${customer.program_type ? ` · ${programTypeLabel(customer.program_type)}` : ""}`
            : "Adesão a um programa deste estabelecimento."
        }
        actions={
          <Badge tone={view.tone} dot={customer.status === "ACTIVE"}>
            {view.label}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          accent
          label="Pontos"
          value={formatNumber(customer.current_points)}
          icon={<IconGift className="h-5 w-5" />}
        />
        <StatCard
          label="Visitas"
          value={formatNumber(customer.current_visits)}
          icon={<IconRepeat className="h-5 w-5" />}
        />
        <StatCard
          label="Selos"
          value={formatNumber(customer.current_stamps)}
          icon={<IconClock className="h-5 w-5" />}
        />
      </div>

      <SectionCard
        title="Histórico"
        description="Lançamentos do ledger de fidelidade desta adesão, mais recentes primeiro."
        flush
        footer={
          history.length >= 100
            ? "Mostrando os 100 lançamentos mais recentes."
            : `${formatNumber(history.length)} ${history.length === 1 ? "lançamento" : "lançamentos"}.`
        }
      >
        {history.length === 0 ? (
          <InlineEmpty icon={<IconClock className="h-4 w-4" />}>
            Nenhum lançamento registrado ainda para esta adesão.
          </InlineEmpty>
        ) : (
          <DataTable
            caption="Histórico de lançamentos de fidelidade"
            rows={history}
            rowKey={(row) => row.id}
            minWidth={640}
            columns={[
              {
                id: "type",
                header: "Lançamento",
                mobile: "title",
                cell: (row) => (
                  <span className="font-medium text-brand-950">
                    {transactionTypeLabel(row.type)}
                  </span>
                ),
              },
              {
                id: "amount",
                header: "Quantidade",
                align: "right",
                className: "tabular-nums",
                cell: (row) => formatNumber(row.amount),
              },
              {
                id: "source",
                header: "Origem",
                className: "whitespace-nowrap text-ink-soft",
                cell: (row) => row.source,
              },
              {
                id: "when",
                header: "Quando",
                className: "whitespace-nowrap text-ink-soft",
                cell: (row) => formatDateTime(row.created_at),
              },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
