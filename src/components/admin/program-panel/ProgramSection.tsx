"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/admin/Badge";
import { updateProgram } from "@/lib/admin/program-panel/actions";
import { ruleFieldsForType } from "@/lib/admin/program-panel/ruleFields";
import { programTypeLabel, ruleKeyLabel, statusView } from "@/lib/admin/status";
import { IconMapPin, IconWrench } from "@/components/ui/Icons";

import {
  FormFeedback,
  GhostButton,
  PrimaryButton,
  inputClass,
} from "@/components/admin/formKit";

const PROGRAM_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const;

export type ProgramData = {
  id: string;
  name: string;
  status: string;
  type: string;
  rules: Record<string, unknown>;
};

/**
 * Cabeçalho editável do programa: nome, status e as chaves de `rules`
 * conhecidas para o `type` atual (`ruleFieldsForType` — whitelist espelhada
 * da RPC `admin_update_program`). `type` nunca é exibido como campo
 * editável — decisão da ETAPA 4.6C (mecânica imutável depois de criada).
 * Chaves de `rules` fora da whitelist do tipo continuam listadas, só que
 * somente leitura — nunca escondidas.
 */
export function ProgramSection({
  organizationId,
  program,
  locationLabel,
  canEdit,
}: {
  organizationId: string;
  program: ProgramData;
  locationLabel: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editableKeys = ruleFieldsForType(program.type);
  const otherEntries = Object.entries(program.rules ?? {}).filter(
    ([key]) => !editableKeys.includes(key),
  );

  const [name, setName] = useState(program.name);
  const [status, setStatus] = useState(program.status);
  const [ruleValues, setRuleValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      editableKeys.map((key) => [key, rawNumber(program.rules?.[key])]),
    ),
  );

  function cancel() {
    setEditing(false);
    setName(program.name);
    setStatus(program.status);
    setRuleValues(
      Object.fromEntries(
        editableKeys.map((key) => [key, rawNumber(program.rules?.[key])]),
      ),
    );
    setError(null);
  }

  function save() {
    setError(null);
    setSuccess(null);
    const rules: Record<string, number> | undefined =
      editableKeys.length === 0
        ? undefined
        : Object.fromEntries(
            editableKeys.map((key) => [key, Number(ruleValues[key] || 0)]),
          );

    startTransition(async () => {
      const result = await updateProgram({
        organizationId,
        programId: program.id,
        name: name.trim(),
        status: status as (typeof PROGRAM_STATUSES)[number],
        rules,
      });
      if (result.ok) {
        setEditing(false);
        setSuccess("Programa atualizado.");
      } else {
        setError(result.error);
      }
    });
  }

  const view = statusView.program(program.status);

  if (!editing) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={view.tone} dot={program.status === "ACTIVE"} size="md">
            {view.label}
          </Badge>
          <Badge tone="neutral" size="md">
            {programTypeLabel(program.type)}
          </Badge>
        </div>
        <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-brand-950 sm:text-2xl">
          {program.name}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <IconMapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {locationLabel}
        </p>

        <RulesReadout
          editableKeys={editableKeys}
          rules={program.rules}
          otherEntries={otherEntries}
        />

        {canEdit ? (
          <div className="mt-4">
            <PrimaryButton type="button" onClick={() => setEditing(true)}>
              Editar
            </PrimaryButton>
          </div>
        ) : null}
        <FormFeedback success={success} />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-brand-950">
            Nome do programa
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
            Status
            <select
              value={status}
              disabled={pending}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              {PROGRAM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusView.program(s).label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Tipo de mecânica ({programTypeLabel(program.type)}) não pode ser
        alterado após a criação do programa.
      </p>

      {editableKeys.length > 0 ? (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <IconWrench className="h-3.5 w-3.5" aria-hidden="true" />
            Regras da mecânica
          </h3>
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {editableKeys.map((key) => (
              <label key={key} className="block text-sm font-medium text-brand-950">
                {ruleKeyLabel(key)}
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={ruleValues[key] ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    setRuleValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </div>
      ) : otherEntries.length > 0 ? (
        <RulesReadout editableKeys={[]} rules={program.rules} otherEntries={otherEntries} />
      ) : null}

      <div className="mt-4 flex items-center gap-1">
        <PrimaryButton disabled={pending || name.trim().length < 2}>
          {pending ? "Salvando…" : "Salvar"}
        </PrimaryButton>
        <GhostButton disabled={pending} onClick={cancel}>
          Cancelar
        </GhostButton>
      </div>

      <FormFeedback error={error} />
    </form>
  );
}

function RulesReadout({
  editableKeys,
  rules,
  otherEntries,
}: {
  editableKeys: string[];
  rules: Record<string, unknown>;
  otherEntries: [string, unknown][];
}) {
  const entries: [string, unknown][] =
    editableKeys.length > 0
      ? editableKeys.map((key) => [key, rules?.[key]])
      : otherEntries;

  if (entries.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <IconWrench className="h-3.5 w-3.5" aria-hidden="true" />
          Regras da mecânica
        </h3>
        <p className="mt-2 text-sm text-ink-muted">
          Sem parâmetros configurados para esta mecânica.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <IconWrench className="h-3.5 w-3.5" aria-hidden="true" />
        Regras da mecânica
      </h3>
      <dl className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-soft px-3.5 py-2.5"
          >
            <dt className="text-sm text-ink-soft">{ruleKeyLabel(key)}</dt>
            <dd className="max-w-[60%] truncate text-right font-mono text-sm font-semibold tabular-nums text-brand-950">
              {formatRuleValue(value)}
            </dd>
          </div>
        ))}
      </dl>
      {editableKeys.length > 0 && otherEntries.length > 0 ? (
        <dl className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {otherEntries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-soft/60 px-3.5 py-2.5"
            >
              <dt className="text-sm text-ink-soft">{ruleKeyLabel(key)}</dt>
              <dd className="max-w-[60%] truncate text-right font-mono text-sm font-semibold tabular-nums text-brand-950">
                {formatRuleValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function formatRuleValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function rawNumber(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return value;
  }
  return "0";
}
