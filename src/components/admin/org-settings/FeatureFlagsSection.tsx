"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/admin/Badge";
import { updateFeatureFlags } from "@/lib/admin/org-settings/actions";
import { IconCheck, IconX } from "@/components/ui/Icons";

import { FormFeedback, GhostButton, PrimaryButton } from "./formKit";

export type OrgFlags = {
  web_card_enabled: boolean;
  reviews_enabled: boolean;
  internal_feedback_enabled: boolean;
  web_push_enabled: boolean;
  google_wallet_enabled: boolean;
  apple_wallet_enabled: boolean;
};

type EditableKey = Exclude<keyof OrgFlags, "web_card_enabled">;

const META: Record<
  keyof OrgFlags,
  { label: string; description: string; platformGated?: boolean }
> = {
  web_card_enabled: {
    label: "Cartão web",
    description: "Cartão Digital no navegador — canal base, sempre disponível.",
  },
  internal_feedback_enabled: {
    label: "Feedback interno",
    description: "Formulário privado de feedback após a visita.",
  },
  reviews_enabled: {
    label: "Avaliação pública",
    description: "Convite neutro para avaliar nos canais externos.",
  },
  web_push_enabled: {
    label: "Web Push",
    description: "Notificações de campanha no navegador.",
    platformGated: true,
  },
  google_wallet_enabled: {
    label: "Google Wallet",
    description: "Cartão salvo na carteira do Android.",
    platformGated: true,
  },
  apple_wallet_enabled: {
    label: "Apple Wallet",
    description: "Cartão salvo na carteira do iPhone.",
    platformGated: true,
  },
};

const ORDER: (keyof OrgFlags)[] = [
  "web_card_enabled",
  "internal_feedback_enabled",
  "reviews_enabled",
  "web_push_enabled",
  "google_wallet_enabled",
  "apple_wallet_enabled",
];

const EDITABLE: EditableKey[] = [
  "internal_feedback_enabled",
  "reviews_enabled",
  "web_push_enabled",
  "google_wallet_enabled",
  "apple_wallet_enabled",
];

function ReadTile({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <li
      className={[
        "flex items-start gap-3 rounded-xl border p-4",
        enabled
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-line bg-surface-soft/60",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          enabled
            ? "bg-emerald-600 text-white"
            : "bg-white text-ink-muted ring-1 ring-inset ring-line",
        ].join(" ")}
      >
        {enabled ? (
          <IconCheck className="h-4 w-4" />
        ) : (
          <IconX className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-950">{label}</p>
          <Badge tone={enabled ? "positive" : "neutral"}>
            {enabled ? "Ativado" : "Desativado"}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          {description}
        </p>
      </div>
    </li>
  );
}

function Switch({
  label,
  description,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line p-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "mt-0.5 relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand-600" : "bg-line",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-950">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          {description}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-amber-700">{hint}</p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Corpo do card "Canais habilitados". Leitura para todos; edição dos flags
 * para OWNER / platform admin (`canEdit`). `web_card_enabled` nunca é
 * editável (canal permanente). Wallet e Web Push dependem também da
 * liberação global da plataforma — a RPC rebaixa o pedido e devolve
 * `clamped`, que vira um aviso aqui.
 */
export function FeatureFlagsSection({
  organizationId,
  flags,
  canEdit,
}: {
  organizationId: string;
  flags: OrgFlags;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(flags);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setEditing(false);
    setDraft(flags);
    setError(null);
  }

  function save() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await updateFeatureFlags({
        organizationId,
        reviews_enabled: draft.reviews_enabled,
        internal_feedback_enabled: draft.internal_feedback_enabled,
        web_push_enabled: draft.web_push_enabled,
        google_wallet_enabled: draft.google_wallet_enabled,
        apple_wallet_enabled: draft.apple_wallet_enabled,
      });
      if (result.ok) {
        setEditing(false);
        if (result.clamped && result.clamped.length > 0) {
          const names = result.clamped
            .map((k) => META[k as keyof OrgFlags]?.label ?? k)
            .join(", ");
          setNotice(
            `Salvo. ${names} continua indisponível: aguardando liberação da plataforma.`,
          );
        } else {
          setNotice("Canais atualizados.");
        }
      } else {
        setError(result.error);
      }
    });
  }

  if (!editing) {
    return (
      <>
        <ul
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          aria-label="Canais"
        >
          {ORDER.map((key) => (
            <ReadTile
              key={key}
              label={META[key].label}
              description={META[key].description}
              enabled={flags[key]}
            />
          ))}
        </ul>
        {canEdit ? (
          <div className="mt-4">
            <PrimaryButton type="button" onClick={() => setEditing(true)}>
              Editar canais
            </PrimaryButton>
          </div>
        ) : null}
        {notice ? (
          <p className="mt-3 text-xs text-emerald-700" role="status">
            {notice}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Canais">
        <ReadTile
          label={META.web_card_enabled.label}
          description={`${META.web_card_enabled.description} Não pode ser desativado.`}
          enabled
        />
        {EDITABLE.map((key) => (
          <Switch
            key={key}
            label={META[key].label}
            description={META[key].description}
            hint={
              META[key].platformGated
                ? "Depende da liberação global da plataforma."
                : undefined
            }
            checked={draft[key]}
            disabled={pending}
            onChange={(next) => setDraft((d) => ({ ...d, [key]: next }))}
          />
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-1">
        <PrimaryButton type="button" disabled={pending} onClick={save}>
          {pending ? "Salvando…" : "Salvar"}
        </PrimaryButton>
        <GhostButton disabled={pending} onClick={cancel}>
          Cancelar
        </GhostButton>
      </div>

      <FormFeedback error={error} />
    </div>
  );
}
