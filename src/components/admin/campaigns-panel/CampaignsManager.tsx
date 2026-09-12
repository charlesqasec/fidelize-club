"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AdminNotice } from "@/components/admin/AdminNotice";
import { Badge } from "@/components/admin/Badge";
import { InlineEmpty } from "@/components/admin/SectionCard";
import {
  createCampaign,
  setCampaignStatus,
  updateCampaign,
} from "@/lib/admin/campaigns-panel/actions";
import { formatDateRange, formatDate } from "@/lib/admin/format";
import { statusView } from "@/lib/admin/status";
import { IconMegaphone } from "@/components/ui/Icons";

import {
  FormFeedback,
  GhostButton,
  PrimaryButton,
  inputClass,
} from "@/components/admin/formKit";

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  approved_at: string | null;
  program_id: string | null;
};

export type ProgramOption = { id: string; name: string };

/** yyyy-mm-dd (input type="date") a partir de um ISO, ou "" quando ausente. */
function toDateInput(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

/**
 * Corpo do card "Campanhas padrão". Leitura para todos; criar / editar /
 * ativar / desativar para OWNER e platform admin (`canEdit`) — só
 * campanhas type=STANDARD (a página não passa ADVANCED para cá). As RPCs
 * `admin_create_campaign` / `admin_update_campaign` /
 * `admin_set_campaign_status` são a autoridade de RBAC, do limite de 5
 * campanhas ACTIVE por organização (`activeCount`, contado na página a
 * partir de TODAS as campanhas, inclusive ADVANCED) e de `audit_logs`.
 * "Ativar" já é o ato de aprovação (docs/ARQUITETURA.md, seção 6) — a RPC
 * grava approved_by/approved_at do próprio ator.
 */
export function CampaignsManager({
  organizationId,
  campaigns,
  programs,
  activeCount,
  canEdit,
  autoOpenCreate = false,
  initialCreateName = "",
}: {
  organizationId: string;
  campaigns: CampaignRow[];
  programs: ProgramOption[];
  activeCount: number;
  canEdit: boolean;
  /** Abre o formulário de criação já aberto (vindo do Agente de IA). */
  autoOpenCreate?: boolean;
  /** Nome sugerido para pré-preencher a criação — só um rascunho, editável. */
  initialCreateName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [creating, setCreating] = useState(autoOpenCreate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Limpa `?novaCampanha=1&nome=...` da URL depois de abrir o formulário —
  // um recarregamento da página não deve reabrir sozinho o formulário de
  // criação.
  useEffect(() => {
    if (autoOpenCreate) router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atLimit = activeCount >= 5;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        done();
      } else {
        setError(result.error ?? "Não foi possível concluir.");
      }
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-ink-muted">
        {activeCount} de 5 campanhas ativas neste estabelecimento (conta
        todas as campanhas no ar, padrão e personalizadas).
      </p>

      {atLimit && canEdit ? (
        <div className="mb-4">
          <AdminNotice title="Limite de 5 campanhas ativas atingido">
            Desative uma campanha para ativar outra. Para aumentar o limite,
            entre em contato com a Fidelize.club.
          </AdminNotice>
        </div>
      ) : null}

      {campaigns.length === 0 && !creating ? (
        <InlineEmpty icon={<IconMegaphone className="h-4 w-4" />}>
          Nenhuma campanha padrão cadastrada ainda.
        </InlineEmpty>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {campaigns.map((campaign) =>
            editingId === campaign.id ? (
              <li key={campaign.id} className="p-4">
                <CampaignForm
                  submitLabel="Salvar"
                  pending={pending}
                  programs={programs}
                  initial={campaign}
                  onCancel={() => {
                    setEditingId(null);
                    setError(null);
                  }}
                  onSubmit={(values) =>
                    run(
                      () =>
                        updateCampaign({
                          organizationId,
                          campaignId: campaign.id,
                          name: values.name,
                          programId: values.programId,
                          startAt: values.startAt,
                          endAt: values.endAt,
                        }),
                      () => setEditingId(null),
                    )
                  }
                />
              </li>
            ) : (
              <li
                key={campaign.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-brand-950">{campaign.name}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {formatDateRange(campaign.start_at, campaign.end_at)}
                  </p>
                  {campaign.approved_at ? (
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Aprovada em {formatDate(campaign.approved_at)}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    tone={statusView.campaign(campaign.status).tone}
                    dot={campaign.status === "ACTIVE"}
                  >
                    {statusView.campaign(campaign.status).label}
                  </Badge>
                  {canEdit ? (
                    <>
                      <GhostButton
                        disabled={pending}
                        onClick={() => {
                          setEditingId(campaign.id);
                          setCreating(false);
                          setError(null);
                        }}
                      >
                        Editar
                      </GhostButton>
                      <GhostButton
                        disabled={
                          pending ||
                          (campaign.status !== "ACTIVE" && atLimit)
                        }
                        onClick={() =>
                          run(
                            () =>
                              setCampaignStatus({
                                organizationId,
                                campaignId: campaign.id,
                                status:
                                  campaign.status === "ACTIVE"
                                    ? "PAUSED"
                                    : "ACTIVE",
                              }),
                            () => {},
                          )
                        }
                      >
                        {campaign.status === "ACTIVE" ? "Desativar" : "Ativar"}
                      </GhostButton>
                    </>
                  ) : null}
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {canEdit ? (
        <div className="mt-4">
          {creating ? (
            <div className="rounded-xl border border-line p-4">
              <CampaignForm
                submitLabel="Criar campanha"
                pending={pending}
                programs={programs}
                initialName={initialCreateName}
                onCancel={() => {
                  setCreating(false);
                  setError(null);
                }}
                onSubmit={(values) =>
                  run(
                    () =>
                      createCampaign({
                        organizationId,
                        name: values.name,
                        programId: values.programId,
                        startAt: values.startAt,
                        endAt: values.endAt,
                      }),
                    () => setCreating(false),
                  )
                }
              />
            </div>
          ) : (
            <PrimaryButton
              type="button"
              disabled={pending}
              onClick={() => {
                setCreating(true);
                setEditingId(null);
                setError(null);
              }}
            >
              Nova campanha
            </PrimaryButton>
          )}
        </div>
      ) : null}

      <FormFeedback error={error} />
    </div>
  );
}

function CampaignForm({
  initial,
  initialName,
  programs,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: CampaignRow;
  /** Rascunho de nome para uma campanha nova (ex.: vindo do Agente de IA). */
  initialName?: string;
  programs: ProgramOption[];
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: {
    name: string;
    programId: string | null;
    startAt: string | null;
    endAt: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? initialName ?? "");
  const [programId, setProgramId] = useState(initial?.program_id ?? "");
  const [startAt, setStartAt] = useState(toDateInput(initial?.start_at ?? null));
  const [endAt, setEndAt] = useState(toDateInput(initial?.end_at ?? null));

  const periodValid = !startAt || !endAt || endAt > startAt;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim(),
          programId: programId === "" ? null : programId,
          startAt: startAt === "" ? null : startAt,
          endAt: endAt === "" ? null : endAt,
        });
      }}
      noValidate
      className="grid gap-3 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-brand-950">
          Nome da campanha
          <input
            type="text"
            value={name}
            autoFocus
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-950">
          Programa{" "}
          <span className="font-normal text-ink-muted">(opcional)</span>
          <select
            value={programId}
            disabled={pending}
            onChange={(e) => setProgramId(e.target.value)}
            className={inputClass}
          >
            <option value="">Vale para todos os programas</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-950">
          Início <span className="font-normal text-ink-muted">(opcional)</span>
          <input
            type="date"
            value={startAt}
            disabled={pending}
            onChange={(e) => setStartAt(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-950">
          Término <span className="font-normal text-ink-muted">(opcional)</span>
          <input
            type="date"
            value={endAt}
            disabled={pending}
            onChange={(e) => setEndAt(e.target.value)}
            className={inputClass}
          />
        </label>
        {!periodValid ? (
          <p className="mt-1 text-xs text-red-700">
            O término deve ser depois do início.
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1 sm:col-span-2">
        <PrimaryButton
          disabled={pending || name.trim().length < 2 || !periodValid}
        >
          {pending ? "Salvando…" : submitLabel}
        </PrimaryButton>
        <GhostButton disabled={pending} onClick={onCancel}>
          Cancelar
        </GhostButton>
      </div>
    </form>
  );
}
