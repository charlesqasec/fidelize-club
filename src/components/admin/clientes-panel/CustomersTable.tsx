"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/admin/Badge";
import { DataTable } from "@/components/admin/DataTable";
import { InlineEmpty } from "@/components/admin/SectionCard";
import { formatDateTime, formatNumber } from "@/lib/admin/format";
import { programTypeLabel, statusView } from "@/lib/admin/status";
import { IconSearch, IconUsers } from "@/components/ui/Icons";

export type OrgCustomerRow = {
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
 * Corpo do card "Adesões" — busca simples por nome (client-side, sobre as
 * linhas já carregadas pela página) + a mesma `DataTable` de antes. Os
 * `StatCard`s da página continuam calculados sobre o total real, não sobre
 * o filtro.
 */
export function CustomersTable({
  organizationId,
  rows,
}: {
  organizationId: string;
  rows: OrgCustomerRow[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      (row.name ?? "cliente sem nome").toLowerCase().includes(normalized),
    );
  }, [query, rows]);

  return (
    <div>
      <div className="px-5 pb-4 pt-1 sm:px-6">
        <label className="relative block max-w-sm">
          <span className="sr-only">Buscar cliente pelo nome</span>
          <IconSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-full rounded-lg border border-line py-2.5 pl-9 pr-3.5 text-sm text-brand-950 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 sm:px-6">
          <InlineEmpty icon={<IconUsers className="h-4 w-4" />}>
            Nenhum cliente encontrado para “{query}”.
          </InlineEmpty>
        </div>
      ) : (
        <DataTable
          caption="Clientes com adesão a programas deste estabelecimento"
          rows={filtered}
          rowKey={(row) => row.membership_id}
          minWidth={860}
          columns={[
            {
              id: "customer",
              header: "Cliente",
              mobile: "title",
              cell: (row) => (
                <Link
                  href={`/admin/org/${organizationId}/clientes/${row.membership_id}`}
                  className="flex min-w-0 items-center gap-3 hover:underline"
                >
                  <CustomerAvatar name={row.name} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-brand-950">
                      {row.name ?? "Cliente sem nome"}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {row.program_name ?? "—"}
                      {row.program_type
                        ? ` · ${programTypeLabel(row.program_type)}`
                        : ""}
                    </p>
                  </div>
                </Link>
              ),
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
      )}
    </div>
  );
}
