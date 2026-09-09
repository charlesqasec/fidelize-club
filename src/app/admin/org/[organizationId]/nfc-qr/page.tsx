import type { Metadata } from "next";

import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { InlineEmpty, SectionCard } from "@/components/admin/SectionCard";
import { StatCard } from "@/components/admin/StatCard";
import { formatDate, formatDateTime, formatNumber } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import { qrTypeLabel, statusView } from "@/lib/admin/status";
import { IconMapPin, IconNfc, IconQr } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "NFC & QR",
  robots: { index: false, follow: false },
};

function LocationCell({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-ink-muted">Sem unidade</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-brand-950">
      <IconMapPin className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
      {name}
    </span>
  );
}

function MonoChip({ children }: { children: string }) {
  return (
    <code className="inline-block max-w-full truncate rounded-md bg-surface-soft px-2 py-1 font-mono text-xs text-brand-950 ring-1 ring-inset ring-line">
      {children}
    </code>
  );
}

/**
 * Dispositivos NFC e tokens QR da organização. Estas tabelas guardam
 * segredo (`nfc_devices.secret_hash`, `qr_tokens.token`) e por isso, nesta
 * etapa, só têm policy de leitura para `platform_admin`
 * (docs/BANCO_DE_DADOS.md, seção 5.2) — a equipe do estabelecimento vê a
 * lista vazia até existir uma view sem as colunas sensíveis (ETAPA 10).
 *
 * Mesmo para quem pode ler, esta tela **não seleciona** `secret_hash` nem
 * `token`: mostra apenas identificadores públicos e metadados.
 */
export default async function NfcQrPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase, access } = await requireOrgAccess(organizationId);

  const [devicesResult, tokensResult] = await Promise.all([
    supabase
      .from("nfc_devices")
      .select(
        "id, public_identifier, status, secret_version, created_at, location:locations(name)",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("qr_tokens")
      .select(
        "id, type, status, usage_count, usage_limit, expires_at, created_at, location:locations(name)",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
  ]);

  const devices = devicesResult.data ?? [];
  const tokens = tokensResult.data ?? [];
  const restrictedForRole = access.viewerRole !== "PLATFORM_ADMIN";

  const nothing = devices.length === 0 && tokens.length === 0;
  const activeDevices = devices.filter((device) => device.status === "ACTIVE").length;
  const activeTokens = tokens.filter((token) => token.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Check-in físico"
        title="NFC & QR"
        description="Tags NFC e QR Codes usados para check-in nas unidades. Segredos e tokens completos nunca são exibidos."
      />

      {restrictedForRole ? (
        <AdminNotice variant="restricted" title="Visível apenas para a equipe Fidelize">
          Nesta etapa, dispositivos NFC e tokens QR carregam segredos e por
          isso só a equipe Fidelize os consulta. A visão para o estabelecimento
          chega junto com o check-in físico e o antifraude.
        </AdminNotice>
      ) : null}

      {nothing ? (
        restrictedForRole ? (
          <EmptyState
            variant="restricted"
            title="Seu perfil não consulta esta área ainda"
            description="Quando a visão do estabelecimento estiver disponível, os dispositivos e QR Codes das suas unidades aparecem aqui — sem expor nenhum segredo."
          />
        ) : (
          <EmptyState
            icon={<IconNfc className="h-6 w-6" />}
            title="Nenhum dispositivo ou token ainda"
            description="Tags NFC e QR Codes por unidade aparecem aqui quando forem provisionados para este estabelecimento."
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              accent
              label="Dispositivos NFC"
              value={formatNumber(devices.length)}
              hint={`${formatNumber(activeDevices)} ativos.`}
              icon={<IconNfc className="h-5 w-5" />}
            />
            <StatCard
              label="Tokens QR"
              value={formatNumber(tokens.length)}
              hint={`${formatNumber(activeTokens)} ativos.`}
              icon={<IconQr className="h-5 w-5" />}
            />
          </div>

          <SectionCard
            title="Dispositivos NFC"
            description="Tags físicas por unidade — identificador público, sem o hash do segredo."
            icon={<IconNfc className="h-5 w-5" />}
            flush={devices.length > 0}
          >
            {devices.length === 0 ? (
              <InlineEmpty icon={<IconNfc className="h-4 w-4" />}>
                Nenhum dispositivo NFC neste estabelecimento.
              </InlineEmpty>
            ) : (
              <DataTable
                caption="Dispositivos NFC deste estabelecimento"
                rows={devices}
                rowKey={(device) => device.id}
                minWidth={720}
                columns={[
                  {
                    id: "identifier",
                    header: "Identificador",
                    mobile: "title",
                    cell: (device) => (
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
                        >
                          <IconNfc className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <MonoChip>{device.public_identifier}</MonoChip>
                          <p className="mt-1 text-xs text-ink-muted">Tag NFC</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: "location",
                    header: "Unidade",
                    cell: (device) => <LocationCell name={device.location?.name} />,
                  },
                  {
                    id: "version",
                    header: "Versão do segredo",
                    className: "tabular-nums text-ink-soft",
                    cell: (device) => `v${device.secret_version}`,
                  },
                  {
                    id: "created",
                    header: "Criado em",
                    className: "whitespace-nowrap text-ink-soft",
                    cell: (device) => formatDate(device.created_at),
                  },
                  {
                    id: "status",
                    header: "Status",
                    mobile: "badge",
                    cell: (device) => {
                      const view = statusView.device(device.status);
                      return (
                        <Badge tone={view.tone} dot={device.status === "ACTIVE"}>
                          {view.label}
                        </Badge>
                      );
                    },
                  },
                ]}
              />
            )}
          </SectionCard>

          <SectionCard
            title="Tokens QR"
            description="QR Codes por unidade — o valor do token nunca é exibido."
            icon={<IconQr className="h-5 w-5" />}
            flush={tokens.length > 0}
          >
            {tokens.length === 0 ? (
              <InlineEmpty icon={<IconQr className="h-4 w-4" />}>
                Nenhum token QR neste estabelecimento.
              </InlineEmpty>
            ) : (
              <DataTable
                caption="Tokens QR deste estabelecimento"
                rows={tokens}
                rowKey={(token) => token.id}
                minWidth={760}
                columns={[
                  {
                    id: "token",
                    header: "Token",
                    mobile: "title",
                    cell: (token) => (
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
                        >
                          <IconQr className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <MonoChip>{`${token.id.slice(0, 8)}…`}</MonoChip>
                          <p className="mt-1 text-xs text-ink-muted">
                            QR {qrTypeLabel(token.type).toLowerCase()}
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: "type",
                    header: "Tipo",
                    mobile: "hidden",
                    cell: (token) => qrTypeLabel(token.type),
                  },
                  {
                    id: "location",
                    header: "Unidade",
                    cell: (token) => <LocationCell name={token.location?.name} />,
                  },
                  {
                    id: "usage",
                    header: "Uso",
                    className: "tabular-nums",
                    cell: (token) => (
                      <span>
                        {formatNumber(token.usage_count)}
                        {token.usage_limit != null ? (
                          <span className="text-ink-muted">
                            {" "}
                            / {formatNumber(token.usage_limit)}
                          </span>
                        ) : null}
                      </span>
                    ),
                  },
                  {
                    id: "expires",
                    header: "Expira em",
                    className: "whitespace-nowrap text-ink-soft",
                    cell: (token) =>
                      token.expires_at ? (
                        formatDateTime(token.expires_at)
                      ) : (
                        <span className="text-ink-muted">Sem expiração</span>
                      ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    mobile: "badge",
                    cell: (token) => {
                      const view = statusView.qrToken(token.status);
                      return (
                        <Badge tone={view.tone} dot={token.status === "ACTIVE"}>
                          {view.label}
                        </Badge>
                      );
                    },
                  },
                ]}
              />
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
