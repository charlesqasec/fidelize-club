"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/admin/Badge";
import { InlineEmpty } from "@/components/admin/SectionCard";
import {
  createReward,
  setRewardStatus,
  updateReward,
} from "@/lib/admin/program-panel/actions";
import { rewardTypeLabel, statusView } from "@/lib/admin/status";
import { IconGift } from "@/components/ui/Icons";

import {
  FormFeedback,
  GhostButton,
  PrimaryButton,
  inputClass,
} from "@/components/admin/formKit";

const REWARD_TYPES = ["FREE_ITEM", "DISCOUNT", "CASHBACK", "CUSTOM"] as const;

export type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  threshold: number;
  status: string;
};

/**
 * Corpo do card "Recompensas". Leitura para todos; criar / editar / ativar
 * / desativar para OWNER e platform admin (`canEdit`). As RPCs
 * `admin_create_reward` / `admin_update_reward` / `admin_set_reward_status`
 * são a autoridade de RBAC e registram `audit_logs`.
 */
export function RewardsManager({
  organizationId,
  programId,
  rewards,
  canEdit,
}: {
  organizationId: string;
  programId: string;
  rewards: RewardRow[];
  canEdit: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      {rewards.length === 0 && !creating ? (
        <InlineEmpty icon={<IconGift className="h-4 w-4" />}>
          Nenhuma recompensa cadastrada para este programa.
        </InlineEmpty>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rewards.map((reward) =>
            editingId === reward.id ? (
              <li key={reward.id} className="p-4">
                <RewardForm
                  submitLabel="Salvar"
                  pending={pending}
                  initial={reward}
                  onCancel={() => {
                    setEditingId(null);
                    setError(null);
                  }}
                  onSubmit={(values) =>
                    run(
                      () =>
                        updateReward({
                          organizationId,
                          rewardId: reward.id,
                          name: values.name,
                          description: values.description,
                          rewardType: values.rewardType,
                          threshold: values.threshold,
                        }),
                      () => setEditingId(null),
                    )
                  }
                />
              </li>
            ) : (
              <li
                key={reward.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-brand-950">{reward.name}</p>
                  {reward.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                      {reward.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-ink-soft">
                    {rewardTypeLabel(reward.reward_type)} · meta{" "}
                    {reward.threshold}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    tone={statusView.program(reward.status).tone}
                    dot={reward.status === "ACTIVE"}
                  >
                    {statusView.program(reward.status).label}
                  </Badge>
                  {canEdit ? (
                    <>
                      <GhostButton
                        disabled={pending}
                        onClick={() => {
                          setEditingId(reward.id);
                          setCreating(false);
                          setError(null);
                        }}
                      >
                        Editar
                      </GhostButton>
                      <GhostButton
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              setRewardStatus({
                                organizationId,
                                rewardId: reward.id,
                                status:
                                  reward.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                              }),
                            () => {},
                          )
                        }
                      >
                        {reward.status === "ACTIVE" ? "Desativar" : "Ativar"}
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
              <RewardForm
                submitLabel="Criar recompensa"
                pending={pending}
                onCancel={() => {
                  setCreating(false);
                  setError(null);
                }}
                onSubmit={(values) =>
                  run(
                    () =>
                      createReward({
                        organizationId,
                        programId,
                        name: values.name,
                        description: values.description,
                        rewardType: values.rewardType,
                        threshold: values.threshold,
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
              Nova recompensa
            </PrimaryButton>
          )}
        </div>
      ) : null}

      <FormFeedback error={error} />
    </div>
  );
}

function RewardForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: RewardRow;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: {
    name: string;
    description: string | null;
    rewardType: (typeof REWARD_TYPES)[number];
    threshold: number;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [rewardType, setRewardType] = useState<(typeof REWARD_TYPES)[number]>(
    (initial?.reward_type as (typeof REWARD_TYPES)[number]) ?? "FREE_ITEM",
  );
  const [threshold, setThreshold] = useState(String(initial?.threshold ?? 0));

  const thresholdValue = Number(threshold);
  const thresholdValid = Number.isFinite(thresholdValue) && thresholdValue >= 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim(),
          description: description.trim() === "" ? null : description.trim(),
          rewardType,
          threshold: thresholdValue,
        });
      }}
      noValidate
      className="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label className="block text-sm font-medium text-brand-950">
          Nome da recompensa
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
          Tipo
          <select
            value={rewardType}
            disabled={pending}
            onChange={(e) =>
              setRewardType(e.target.value as (typeof REWARD_TYPES)[number])
            }
            className={inputClass}
          >
            {REWARD_TYPES.map((type) => (
              <option key={type} value={type}>
                {rewardTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-950">
          Meta{" "}
          <span className="font-normal text-ink-muted">
            (pontos/selos/visitas necessários)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={threshold}
            disabled={pending}
            onChange={(e) => setThreshold(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-brand-950">
          Descrição{" "}
          <span className="font-normal text-ink-muted">(opcional)</span>
          <input
            type="text"
            value={description}
            disabled={pending}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex items-center gap-1 sm:col-span-2">
        <PrimaryButton
          disabled={pending || name.trim().length < 2 || !thresholdValid}
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
