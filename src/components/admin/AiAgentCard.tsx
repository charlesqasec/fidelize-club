import Link from "next/link";

import { formatNumber } from "@/lib/admin/format";
import {
  IconBot,
  IconCheck,
  IconClock,
  IconSparkle,
} from "@/components/ui/Icons";

export type AiAgentOverview = {
  hasEnoughData: boolean;
  evaluatedCount: number;
  noReturnCount: number;
};

/**
 * Card premium "Agente de IA" da Visão geral do Painel do Estabelecimento
 * (bloco final do MVP, ETAPA 4.6G). Regra de produto: o usuário nunca vê
 * "Claude", "OpenAI" ou nome de modelo — só "Agente de IA". O MVP não chama
 * LLM nenhuma: `overview` vem de `admin_org_ai_agent_overview`, uma RPC
 * somente leitura que calcula tudo por SQL determinístico sobre os dados
 * reais desta organização (isolamento multi-tenant garantido pela própria
 * RPC, não por este componente).
 *
 * Três estados, nunca um insight inventado:
 * - `!hasEnoughData`  -> ainda não há histórico suficiente (estado vazio).
 * - `hasEnoughData` e `noReturnCount === 0` -> insight real, tom positivo.
 * - `hasEnoughData` e `noReturnCount > 0`   -> insight + CTA "Criar
 *   campanha", que só NAVEGA e pré-preenche o formulário de campanha
 *   (`campaignHref`) — nunca cria ou dispara nada sozinho. A aprovação do
 *   usuário continua obrigatória (fluxo normal de Campanhas).
 */
export function AiAgentCard({
  overview,
  campaignHref,
  canCreateCampaign,
}: {
  overview: AiAgentOverview | null;
  campaignHref: string;
  canCreateCampaign: boolean;
}) {
  const hasEnoughData = overview?.hasEnoughData ?? false;
  const noReturnCount = overview?.noReturnCount ?? 0;
  const hasAlert = hasEnoughData && noReturnCount > 0;

  return (
    <section
      aria-label="Agente de IA"
      className="admin-card relative overflow-hidden rounded-2xl border border-brand-800 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 p-6 text-white shadow-lg shadow-brand-900/25 sm:p-7"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white"
        >
          <IconBot className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-white">
              Agente de IA
            </h2>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-100">
              Novo
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-brand-100/90">
            Análises automáticas sobre os dados reais deste estabelecimento.
          </p>
        </div>
      </div>

      <div className="relative mt-5 rounded-2xl bg-white/10 p-4 sm:p-5">
        {!hasEnoughData ? (
          <div className="flex items-start gap-3">
            <IconSparkle
              className="mt-0.5 h-5 w-5 shrink-0 text-brand-100"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                Ainda reunindo dados suficientes
              </p>
              <p className="mt-1 text-sm leading-relaxed text-brand-100/90">
                Assim que houver histórico de visitas suficiente, o Agente de
                IA passa a trazer insights reais sobre a operação aqui.
              </p>
            </div>
          </div>
        ) : hasAlert ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <IconClock
                className="mt-0.5 h-5 w-5 shrink-0 text-brand-100"
                aria-hidden="true"
              />
              <p className="min-w-0 text-sm leading-relaxed text-white">
                Identificamos{" "}
                <strong className="font-semibold">
                  {formatNumber(noReturnCount)}
                </strong>{" "}
                {noReturnCount === 1
                  ? "cliente que não retorna"
                  : "clientes que não retornam"}{" "}
                há mais de 30 dias.
              </p>
            </div>
            {canCreateCampaign ? (
              <Link
                href={campaignHref}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50"
              >
                Criar campanha
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <IconCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-brand-100"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-white">
              Nenhum cliente parado há mais de 30 dias no momento.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
