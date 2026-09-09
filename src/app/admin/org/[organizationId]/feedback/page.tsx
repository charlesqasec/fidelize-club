import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { RatingStars } from "@/components/admin/RatingStars";
import { InlineEmpty, SectionCard } from "@/components/admin/SectionCard";
import { StatCard } from "@/components/admin/StatCard";
import { formatDateTime, formatNumber } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import { reviewProviderLabel, statusView } from "@/lib/admin/status";
import {
  IconChat,
  IconExternalLink,
  IconMegaphone,
  IconStar,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Feedback",
  robots: { index: false, follow: false },
};

/**
 * Reputação e feedback da organização (RLS: membro da organização ou
 * platform_admin). `customer_feedback` é dado privado e sensível — nunca
 * sai da própria organização. Estados vazios coerentes por subseção quando
 * não há dados.
 */
export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase } = await requireOrgAccess(organizationId);

  const [feedbackResult, requestsResult, channelsResult] = await Promise.all([
    supabase
      .from("customer_feedback")
      .select(
        "id, rating, comment, status, created_at, links:feedback_category_links(category:feedback_categories(name))",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("review_requests")
      .select(
        "id, status, requested_at, clicked_at, channel:review_channels(provider, label)",
      )
      .eq("organization_id", organizationId)
      .order("requested_at", { ascending: false })
      .limit(100),
    supabase
      .from("review_channels")
      .select("id, provider, label, url, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
  ]);

  const feedback = feedbackResult.data ?? [];
  const requests = requestsResult.data ?? [];
  const channels = channelsResult.data ?? [];

  const feedbackCount = feedback.length;
  const feedbackAvg =
    feedbackCount > 0
      ? feedback.reduce((sum, row) => sum + row.rating, 0) / feedbackCount
      : null;
  const clickedRequests = requests.filter(
    (request) => request.status === "CLICKED",
  ).length;
  const withComment = feedback.filter((row) =>
    Boolean(row.comment?.trim()),
  ).length;

  const nothing =
    feedback.length === 0 && requests.length === 0 && channels.length === 0;

  if (nothing) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Reputação"
          title="Feedback"
          description="Avaliações públicas e feedback interno dos clientes deste estabelecimento."
        />
        <EmptyState
          icon={<IconStar className="h-6 w-6" />}
          title="Nenhuma avaliação ou feedback ainda"
          description="Feedback interno, pedidos de avaliação e canais configurados aparecem aqui assim que existirem."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Reputação"
        title="Feedback"
        description="Feedback interno (privado) e avaliação pública externa deste estabelecimento."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent
          label="Nota média interna"
          value={
            feedbackAvg === null ? null : (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  {feedbackAvg.toFixed(1)}
                  <span className="text-base font-medium text-brand-200"> / 5</span>
                </span>
                <RatingStars
                  value={feedbackAvg}
                  label={`Média ${feedbackAvg.toFixed(1)} de 5`}
                />
              </span>
            )
          }
          hint={
            feedbackAvg === null
              ? "Aparece com o primeiro feedback."
              : `Baseada em ${formatNumber(feedbackCount)} ${feedbackCount === 1 ? "resposta" : "respostas"}.`
          }
          icon={<IconStar className="h-5 w-5" />}
        />
        <StatCard
          label="Feedbacks recebidos"
          value={formatNumber(feedbackCount)}
          hint={`${formatNumber(withComment)} com comentário.`}
          icon={<IconChat className="h-5 w-5" />}
        />
        <StatCard
          label="Pedidos de avaliação"
          value={formatNumber(requests.length)}
          hint={`${formatNumber(clickedRequests)} com clique no convite.`}
          icon={<IconMegaphone className="h-5 w-5" />}
        />
        <StatCard
          label="Canais de avaliação"
          value={formatNumber(channels.length)}
          hint="Links externos configurados."
          icon={<IconExternalLink className="h-5 w-5" />}
        />
      </div>

      <SectionCard
        title="Feedback interno"
        description="Respostas privadas dos clientes — nunca publicadas automaticamente."
        icon={<IconChat className="h-5 w-5" />}
        flush={feedback.length > 0}
        footer={
          feedback.length >= 100
            ? "Mostrando os 100 feedbacks mais recentes."
            : undefined
        }
      >
        {feedback.length === 0 ? (
          <InlineEmpty icon={<IconChat className="h-4 w-4" />}>
            Nenhum feedback interno recebido ainda.
          </InlineEmpty>
        ) : (
          <ul className="divide-y divide-line" aria-label="Feedbacks internos">
            {feedback.map((row) => {
              const view = statusView.feedback(row.status);
              const categories = (row.links ?? [])
                .map((link) => link.category?.name)
                .filter((name): name is string => Boolean(name));
              return (
                <li key={row.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex items-center gap-3">
                      <RatingStars value={row.rating} />
                      <span className="text-sm font-semibold tabular-nums text-brand-950">
                        {row.rating}/5
                      </span>
                      <span className="text-xs text-ink-muted">
                        {formatDateTime(row.created_at)}
                      </span>
                    </div>
                    <Badge tone={view.tone} dot={row.status === "NEW"}>
                      {view.label}
                    </Badge>
                  </div>
                  {row.comment ? (
                    <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-ink-soft">
                      “{row.comment}”
                    </p>
                  ) : (
                    <p className="mt-2.5 text-sm text-ink-muted">Sem comentário.</p>
                  )}
                  {categories.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Categorias">
                      {categories.map((category) => (
                        <li key={category}>
                          <Badge tone="brand">{category}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <SectionCard
            title="Pedidos de avaliação"
            description="Quando o convite neutro foi mostrado e se foi clicado."
            icon={<IconMegaphone className="h-5 w-5" />}
            flush={requests.length > 0}
            footer={
              requests.length >= 100
                ? "Mostrando os 100 pedidos mais recentes."
                : undefined
            }
          >
            {requests.length === 0 ? (
              <InlineEmpty icon={<IconMegaphone className="h-4 w-4" />}>
                Nenhum pedido de avaliação registrado ainda.
              </InlineEmpty>
            ) : (
              <DataTable
                caption="Pedidos de avaliação enviados"
                rows={requests}
                rowKey={(row) => row.id}
                minWidth={520}
                columns={[
                  {
                    id: "requested",
                    header: "Enviado em",
                    mobile: "title",
                    className: "whitespace-nowrap",
                    cell: (row) => (
                      <span className="font-medium text-brand-950">
                        {formatDateTime(row.requested_at)}
                      </span>
                    ),
                  },
                  {
                    id: "channel",
                    header: "Canal",
                    cell: (row) =>
                      row.channel?.label ??
                      reviewProviderLabel(row.channel?.provider),
                  },
                  {
                    id: "clicked",
                    header: "Clicado em",
                    className: "whitespace-nowrap text-ink-soft",
                    cell: (row) =>
                      row.clicked_at ? (
                        formatDateTime(row.clicked_at)
                      ) : (
                        <span className="text-ink-muted">Sem clique</span>
                      ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    mobile: "badge",
                    cell: (row) => {
                      const view = statusView.reviewRequest(row.status);
                      return <Badge tone={view.tone}>{view.label}</Badge>;
                    },
                  },
                ]}
              />
            )}
          </SectionCard>
        </div>

        <div className="xl:col-span-2">
          <SectionCard
            title="Canais de avaliação"
            description="Links externos usados no convite neutro do Cartão Digital."
            icon={<IconExternalLink className="h-5 w-5" />}
          >
            {channels.length === 0 ? (
              <InlineEmpty icon={<IconExternalLink className="h-4 w-4" />}>
                Nenhum canal de avaliação configurado.
              </InlineEmpty>
            ) : (
              <ul className="space-y-3" aria-label="Canais de avaliação">
                {channels.map((row) => {
                  const view = statusView.reviewChannel(row.status);
                  return (
                    <li
                      key={row.id}
                      className="rounded-xl border border-line bg-surface-soft/60 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-950">
                            {reviewProviderLabel(row.provider)}
                          </p>
                          {row.label ? (
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {row.label}
                            </p>
                          ) : null}
                        </div>
                        <Badge tone={view.tone} dot={row.status === "ACTIVE"}>
                          {view.label}
                        </Badge>
                      </div>
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs text-brand-700 underline-offset-2 hover:underline"
                      >
                        <IconExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{row.url}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
