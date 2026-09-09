import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ProgramCardPreview } from "@/components/admin/ProgramCardPreview";
import {
  DefinitionList,
  InlineEmpty,
  SectionCard,
} from "@/components/admin/SectionCard";
import { formatNumber, jsonEntries, jsonNumber } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import {
  cardStyleLabel,
  programTypeLabel,
  rewardTypeLabel,
  ruleKeyLabel,
  statusView,
} from "@/lib/admin/status";
import {
  IconGift,
  IconMapPin,
  IconPalette,
  IconRepeat,
  IconWrench,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Programa",
  robots: { index: false, follow: false },
};

function ColorTile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
      <span
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-inset ring-black/10"
        style={{
          backgroundColor: value ?? undefined,
          backgroundImage: value
            ? undefined
            : "repeating-linear-gradient(45deg, #ece7fe 0 6px, #ffffff 6px 12px)",
        }}
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </p>
        <p className="mt-0.5 truncate font-mono text-sm text-brand-950">
          {value ?? "Não definida"}
        </p>
      </div>
    </div>
  );
}

/**
 * Programa de fidelidade — somente leitura nesta etapa. Mostra a mecânica,
 * o branding e o catálogo de recompensas reais (RLS: membro da organização
 * ou platform_admin). Nenhuma escrita: as tabelas não têm policy de
 * INSERT/UPDATE para `authenticated`, então ajuste real fica para a etapa
 * do painel de negócio.
 */
export default async function ProgramaPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase, access } = await requireOrgAccess(organizationId);

  const { data: programs } = await supabase
    .from("loyalty_programs")
    .select(
      "id, name, type, status, rules, location:locations(name), branding:program_branding(logo_url, primary_color, secondary_color, background_color, text_color, card_style, headline, description)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  const programList = programs ?? [];

  if (programList.length === 0) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Fidelidade"
          title="Programa"
          description="A mecânica de fidelidade deste estabelecimento — selos, visitas, pontos, níveis ou personalizada."
        />
        <EmptyState
          icon={<IconRepeat className="h-6 w-6" />}
          title="Nenhum programa de fidelidade ainda"
          description="Quando este estabelecimento tiver um programa configurado, ele aparece aqui com regras, identidade visual e recompensas."
        />
      </div>
    );
  }

  const { data: rewards } = await supabase
    .from("rewards")
    .select("id, program_id, name, description, reward_type, threshold, status")
    .eq("organization_id", organizationId)
    .order("threshold", { ascending: true });

  const rewardList = rewards ?? [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Fidelidade"
        title="Programa"
        description="Configuração atual do programa de fidelidade deste estabelecimento."
        actions={<Badge tone="brand">Somente leitura</Badge>}
      />

      {programList.map((program) => {
        const view = statusView.program(program.status);
        const branding = program.branding;
        const rules = jsonEntries(program.rules);
        const target = jsonNumber(program.rules, [
          "target",
          "stamps_target",
          "visits_target",
          "points_target",
        ]);
        const programRewards = rewardList.filter(
          (reward) => reward.program_id === program.id,
        );
        const firstReward = programRewards[0] ?? null;

        return (
          <article
            key={program.id}
            aria-labelledby={`program-${program.id}`}
            className="space-y-4"
          >
            {/* Cabeçalho do programa + prévia do cartão */}
            <section className="admin-card overflow-hidden rounded-2xl border border-line bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-5">
                <div className="p-5 sm:p-6 lg:col-span-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={view.tone} dot={program.status === "ACTIVE"} size="md">
                      {view.label}
                    </Badge>
                    <Badge tone="neutral" size="md">
                      {programTypeLabel(program.type)}
                    </Badge>
                  </div>
                  <h2
                    id={`program-${program.id}`}
                    className="mt-3 font-display text-xl font-bold tracking-tight text-brand-950 sm:text-2xl"
                  >
                    {program.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                    <IconMapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {program.location?.name ?? "Vale para todas as unidades"}
                  </p>

                  <div className="mt-6">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <IconWrench className="h-3.5 w-3.5" aria-hidden="true" />
                      Regras da mecânica
                    </h3>
                    {rules.length === 0 ? (
                      <p className="mt-2 text-sm text-ink-muted">
                        Sem parâmetros configurados para esta mecânica.
                      </p>
                    ) : (
                      <dl className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {rules.map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-soft px-3.5 py-2.5"
                          >
                            <dt className="text-sm text-ink-soft">
                              {ruleKeyLabel(key)}
                            </dt>
                            <dd className="max-w-[60%] truncate text-right font-mono text-sm font-semibold tabular-nums text-brand-950">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center border-t border-line bg-[radial-gradient(ellipse_at_top,_var(--color-brand-100),_var(--color-surface-soft)_70%)] p-5 sm:p-6 lg:col-span-2 lg:border-l lg:border-t-0">
                  <ProgramCardPreview
                    organizationName={access.organizationName}
                    programName={program.name}
                    typeLabel={programTypeLabel(program.type)}
                    branding={
                      branding ?? {
                        primary_color: null,
                        secondary_color: null,
                        background_color: null,
                        text_color: null,
                        headline: null,
                        description: null,
                      }
                    }
                    target={target}
                    rewardName={firstReward?.name ?? null}
                  />
                </div>
              </div>
            </section>

            <SectionCard
              title="Identidade visual"
              description="Cores e textos usados no Cartão Digital deste programa."
              icon={<IconPalette className="h-5 w-5" />}
            >
              {!branding ? (
                <InlineEmpty icon={<IconPalette className="h-4 w-4" />}>
                  Nenhuma identidade visual configurada — a prévia acima usa
                  as cores padrão da Fidelize.
                </InlineEmpty>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ColorTile label="Primária" value={branding.primary_color} />
                    <ColorTile label="Secundária" value={branding.secondary_color} />
                    <ColorTile label="Fundo" value={branding.background_color} />
                    <ColorTile label="Texto" value={branding.text_color} />
                  </div>
                  <DefinitionList
                    columns={3}
                    items={[
                      {
                        term: "Estilo do cartão",
                        value: cardStyleLabel(branding.card_style),
                      },
                      {
                        term: "Headline",
                        value: branding.headline ?? (
                          <span className="text-ink-muted">Não definida</span>
                        ),
                      },
                      {
                        term: "Logo",
                        value: branding.logo_url ? (
                          <a
                            href={branding.logo_url}
                            className="break-all text-brand-700 underline-offset-2 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir arquivo
                          </a>
                        ) : (
                          <span className="text-ink-muted">Não enviada</span>
                        ),
                      },
                      {
                        term: "Descrição",
                        value: branding.description ?? (
                          <span className="text-ink-muted">Não definida</span>
                        ),
                        wide: true,
                      },
                    ]}
                  />
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Recompensas"
              description="O que o cliente ganha ao atingir cada meta."
              icon={<IconGift className="h-5 w-5" />}
              flush={programRewards.length > 0}
            >
              {programRewards.length === 0 ? (
                <InlineEmpty icon={<IconGift className="h-4 w-4" />}>
                  Nenhuma recompensa cadastrada para este programa.
                </InlineEmpty>
              ) : (
                <DataTable
                  caption={`Recompensas do programa ${program.name}`}
                  rows={programRewards}
                  rowKey={(reward) => reward.id}
                  minWidth={560}
                  columns={[
                    {
                      id: "name",
                      header: "Recompensa",
                      mobile: "title",
                      cell: (reward) => (
                        <div className="min-w-0">
                          <p className="font-medium text-brand-950">{reward.name}</p>
                          {reward.description ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                              {reward.description}
                            </p>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      id: "type",
                      header: "Tipo",
                      cell: (reward) => rewardTypeLabel(reward.reward_type),
                    },
                    {
                      id: "threshold",
                      header: "Meta",
                      align: "right",
                      className: "tabular-nums font-semibold",
                      cell: (reward) => formatNumber(reward.threshold),
                    },
                    {
                      id: "status",
                      header: "Status",
                      mobile: "badge",
                      cell: (reward) => {
                        const rewardStatus = statusView.program(reward.status);
                        return (
                          <Badge tone={rewardStatus.tone}>
                            {rewardStatus.label}
                          </Badge>
                        );
                      },
                    },
                  ]}
                />
              )}
            </SectionCard>
          </article>
        );
      })}
    </div>
  );
}
