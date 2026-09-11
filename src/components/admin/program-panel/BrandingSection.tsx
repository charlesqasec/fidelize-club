"use client";

import { useState, useTransition } from "react";

import { DefinitionList, InlineEmpty } from "@/components/admin/SectionCard";
import { upsertProgramBranding } from "@/lib/admin/program-panel/actions";
import { cardStyleLabel } from "@/lib/admin/status";
import { IconPalette } from "@/components/ui/Icons";

import {
  FormFeedback,
  GhostButton,
  PrimaryButton,
  inputClass,
} from "@/components/admin/formKit";

const CARD_STYLES = ["CLASSIC", "MINIMAL", "BOLD"] as const;

export type BrandingData = {
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  text_color: string | null;
  card_style: string;
  headline: string | null;
  description: string | null;
};

const EMPTY_BRANDING: BrandingData = {
  logo_url: null,
  primary_color: null,
  secondary_color: null,
  background_color: null,
  text_color: null,
  card_style: "CLASSIC",
  headline: null,
  description: null,
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

function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  const swatch = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  return (
    <label className="block text-sm font-medium text-brand-950">
      {label}
      <span className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (seletor)`}
          value={swatch}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-line disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input
          type="text"
          placeholder="#RRGGBB"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass.replace("mt-1.5 ", "")}
        />
      </span>
    </label>
  );
}

/**
 * Identidade visual do programa (1:1 com `program_branding`). Formulário
 * único que envia o conjunto completo — a RPC `admin_upsert_program_branding`
 * cria a linha se ainda não existir. `logo_url` é só texto (colar um link
 * já hospedado); não há upload nesta etapa.
 */
export function BrandingSection({
  organizationId,
  programId,
  branding,
  canEdit,
}: {
  organizationId: string;
  programId: string;
  branding: BrandingData | null;
  canEdit: boolean;
}) {
  const current = branding ?? EMPTY_BRANDING;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [logoUrl, setLogoUrl] = useState(current.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(current.primary_color ?? "");
  const [secondaryColor, setSecondaryColor] = useState(current.secondary_color ?? "");
  const [backgroundColor, setBackgroundColor] = useState(current.background_color ?? "");
  const [textColor, setTextColor] = useState(current.text_color ?? "");
  const [cardStyle, setCardStyle] = useState(current.card_style ?? "CLASSIC");
  const [headline, setHeadline] = useState(current.headline ?? "");
  const [description, setDescription] = useState(current.description ?? "");

  function resetDraft() {
    setLogoUrl(current.logo_url ?? "");
    setPrimaryColor(current.primary_color ?? "");
    setSecondaryColor(current.secondary_color ?? "");
    setBackgroundColor(current.background_color ?? "");
    setTextColor(current.text_color ?? "");
    setCardStyle(current.card_style ?? "CLASSIC");
    setHeadline(current.headline ?? "");
    setDescription(current.description ?? "");
  }

  function cancel() {
    setEditing(false);
    resetDraft();
    setError(null);
  }

  function save() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await upsertProgramBranding({
        organizationId,
        programId,
        logoUrl,
        primaryColor,
        secondaryColor,
        backgroundColor,
        textColor,
        cardStyle: cardStyle as (typeof CARD_STYLES)[number],
        headline,
        description,
      });
      if (result.ok) {
        setEditing(false);
        setSuccess("Identidade visual atualizada.");
      } else {
        setError(result.error);
      }
    });
  }

  if (!editing) {
    return (
      <div>
        {!branding ? (
          <InlineEmpty icon={<IconPalette className="h-4 w-4" />}>
            Nenhuma identidade visual configurada — a prévia do cartão usa as
            cores padrão da Fidelize.
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
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ColorField
          label="Primária"
          value={primaryColor}
          disabled={pending}
          onChange={setPrimaryColor}
        />
        <ColorField
          label="Secundária"
          value={secondaryColor}
          disabled={pending}
          onChange={setSecondaryColor}
        />
        <ColorField
          label="Fundo"
          value={backgroundColor}
          disabled={pending}
          onChange={setBackgroundColor}
        />
        <ColorField
          label="Texto"
          value={textColor}
          disabled={pending}
          onChange={setTextColor}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-brand-950">
          Estilo do cartão
          <select
            value={cardStyle}
            disabled={pending}
            onChange={(e) => setCardStyle(e.target.value)}
            className={inputClass}
          >
            {CARD_STYLES.map((style) => (
              <option key={style} value={style}>
                {cardStyleLabel(style)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-brand-950">
          Logo (link)
          <input
            type="url"
            placeholder="https://…"
            value={logoUrl}
            disabled={pending}
            onChange={(e) => setLogoUrl(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="block text-sm font-medium text-brand-950">
          Headline{" "}
          <span className="font-normal text-ink-muted">(até 120 caracteres)</span>
          <input
            type="text"
            maxLength={120}
            value={headline}
            disabled={pending}
            onChange={(e) => setHeadline(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-brand-950">
          Descrição{" "}
          <span className="font-normal text-ink-muted">(até 500 caracteres)</span>
          <textarea
            maxLength={500}
            rows={3}
            value={description}
            disabled={pending}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex items-center gap-1">
        <PrimaryButton disabled={pending}>
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
