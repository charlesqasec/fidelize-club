import type { Metadata } from "next";

import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatCard } from "@/components/admin/StatCard";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  shortId,
} from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import { programTypeLabel, statusView } from "@/lib/admin/status";
import { IconCheck, IconClock, IconUsers } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Clientes",
  robots: { index: false, follow: false },
};

function CustomerAvatar({ name }: { name: string | null }) {
  const initial = name?.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        initial
          ? "bg-brand-100 text-brand-800"
          : "bg-surface-soft text-ink-muted ring-1 ring-inset ring-line",
      ].join(" ")}
    >
      {initial ?? "#"}
    </span>
  );
}

/**
 * Clientes da organização = `customer_memberships` filtrado por
 * `organization_id` (RLS: `is_org_member` ou `is_platform_admin`).
 *
 * O NOME do cliente vive em `public.customers`, que é entidade global e
 * **não tem policy de leitura para a equipe do estabelecimento** nesta
 * etapa (docs/BANCO_DE_DADOS.md, seção 5.1). Então o embed `customers(name)`
 * volta preenchido para o platform_admin e `null` para OWNER/MANAGER/STAFF —
 * neste caso mostramos um identificador curto e não secreto da adesão. A
 * listagem com nome para o próprio estabelecimento depende da view/function
 * dedicada da ETAPA 7 — não de afrouxar a RLS aqui.
 */
export default async function ClientesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase, access } = await requireOrgAccess(organizationId);

  const { data: memberships } = await supabase
    .from("customer_memberships")
    .select(
      "id, status, current_points, current_stamps, current_visits, joined_at, last_activity_at, customer:customers(name), program:loyalty_programs(name, type)",
    )
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: false })
    .limit(200);

  const rows = memberships ?? [];
  const canSeeNames = access.viewerRole === "PLATFORM_ADMIN";

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

      {!canSeeNames ? (
        <AdminNotice variant="restricted" title="Nomes não exibidos para o seu perfil">
          Nesta etapa os nomes dos clientes ficam visíveis apenas para a
          equipe Fidelize. Cada adesão aparece com um identificador curto —
          o isolamento entre estabelecimentos não é enfraquecido para isso.
        </AdminNotice>
      ) : null}

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
            description="Ordenadas da mais recente para a mais antiga."
            flush
            footer={
              rows.length >= 200
                ? "Mostrando as 200 adesões mais recentes."
                : `${formatNumber(rows.length)} ${rows.length === 1 ? "adesão" : "adesões"}.`
            }
          >
            <DataTable
              caption="Clientes com adesão a programas deste estabelecimento"
              rows={rows}
              rowKey={(row) => row.id}
              minWidth={860}
              columns={[
                {
                  id: "customer",
                  header: "Cliente",
                  mobile: "title",
                  cell: (row) => {
                    const name = row.customer?.name ?? null;
                    return (
                      <div className="flex min-w-0 items-center gap-3">
                        <CustomerAvatar name={name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-brand-950">
                            {name ?? `Adesão ${shortId(row.id)}`}
                          </p>
                          <p className="truncate text-xs text-ink-muted">
                            {row.program?.name ?? "—"}
                            {row.program?.type
                              ? ` · ${programTypeLabel(row.program.type)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  id: "joined",
                  header: "Adesão",
                  className: "whitespace-nowrap text-ink-soft",
                  cell: (row) => formatDate(row.joined_at),
                },
                {
                  id: "points",
                  header: "Pontos",
                  align: "right",
                  className: "tabular-nums",
                  cell: (row) => formatNumber(row.current_points),
                },
                {
                  id: "visits",
                  header: "Visitas",
                  align: "right",
                  className: "tabular-nums",
                  cell: (row) => formatNumber(row.current_visits),
                },
                {
                  id: "stamps",
                  header: "Selos",
                  align: "right",
                  className: "tabular-nums",
                  cell: (row) => formatNumber(row.current_stamps),
                },
                {
                  id: "last",
                  header: "Última atividade",
                  className: "whitespace-nowrap text-ink-soft",
                  cell: (row) =>
                    row.last_activity_at ? (
                      formatDateTime(row.last_activity_at)
                    ) : (
                      <span className="text-ink-muted">Sem atividade</span>
                    ),
                },
                {
                  id: "status",
                  header: "Status",
                  mobile: "badge",
                  cell: (row) => {
                    const view = statusView.membership(row.status);
                    return (
                      <Badge tone={view.tone} dot={row.status === "ACTIVE"}>
                        {view.label}
                      </Badge>
                    );
                  },
                },
              ]}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
