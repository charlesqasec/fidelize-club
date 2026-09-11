import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ProgramCardPreview } from "@/components/admin/ProgramCardPreview";
import { SectionCard } from "@/components/admin/SectionCard";
import { BrandingSection } from "@/components/admin/program-panel/BrandingSection";
import { ProgramSection } from "@/components/admin/program-panel/ProgramSection";
import { RewardsManager } from "@/components/admin/program-panel/RewardsManager";
import { jsonNumber } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import { programTypeLabel } from "@/lib/admin/status";
import { IconGift, IconPalette, IconRepeat } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Programa",
  robots: { index: false, follow: false },
};

/**
 * Programa de fidelidade — PAINEL DO ESTABELECIMENTO (ETAPA 4.6C). Leitura
 * para todos os papéis; edição de programa (nome/status/regras
 * whitelisted), identidade visual e recompensas para OWNER / platform
 * admin (`canEdit`). `type` do programa nunca é editável (decisão da
 * ETAPA 4.6C). A UI só decide o que OFERECE — a autoridade de RBAC é o
 * servidor: as Server Actions revalidam o acesso e as RPCs `admin_*`
 * (SECURITY DEFINER) validam `auth.uid()`, `organization_id` e papel
 * dentro da operação, e registram `audit_logs`.
 */
export default async function ProgramaPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase, access } = await requireOrgAccess(organizationId);

  const role = access.viewerRole;
  const canEdit = role === "PLATFORM_ADMIN" || role === "OWNER";

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
        actions={
          !canEdit ? <Badge tone="brand">Somente leitura</Badge> : undefined
        }
      />

      {programList.map((program) => {
        const rules = (program.rules ?? {}) as Record<string, unknown>;
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
        const branding = program.branding;

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
                  <ProgramSection
                    organizationId={organizationId}
                    program={{
                      id: program.id,
                      name: program.name,
                      status: program.status,
                      type: program.type,
                      rules,
                    }}
                    locationLabel={
                      program.location?.name ?? "Vale para todas as unidades"
                    }
                    canEdit={canEdit}
                  />
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
              <BrandingSection
                organizationId={organizationId}
                programId={program.id}
                branding={branding}
                canEdit={canEdit}
              />
            </SectionCard>

            <SectionCard
              title="Recompensas"
              description="O que o cliente ganha ao atingir cada meta."
              icon={<IconGift className="h-5 w-5" />}
            >
              <RewardsManager
                organizationId={organizationId}
                programId={program.id}
                rewards={programRewards}
                canEdit={canEdit}
              />
            </SectionCard>
          </article>
        );
      })}
    </div>
  );
}
