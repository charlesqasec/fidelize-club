"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/admin/Badge";
import { DefinitionList } from "@/components/admin/SectionCard";
import { updateOrganizationName } from "@/lib/admin/org-settings/actions";

import {
  FormFeedback,
  GhostButton,
  PrimaryButton,
  inputClass,
} from "@/components/admin/formKit";

/**
 * Corpo do card "Estabelecimento" — leitura por padrão, edição do nome para
 * OWNER / platform admin (`canEdit`). Slug e data de entrada continuam
 * somente leitura (identidade / fato). A autoridade de permissão é a RPC
 * `admin_update_organization`; `canEdit` só decide o que a UI oferece.
 */
export function OrganizationSection({
  organizationId,
  name,
  slug,
  createdAtLabel,
  accessLabel,
  canEdit,
}: {
  organizationId: string;
  name: string;
  slug: string;
  createdAtLabel: string;
  accessLabel: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setEditing(false);
    setDraft(name);
    setError(null);
  }

  function save() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateOrganizationName({
        organizationId,
        name: draft,
      });
      if (result.ok) {
        setEditing(false);
        setSuccess("Nome atualizado.");
      } else {
        setError(result.error);
      }
    });
  }

  if (!editing) {
    return (
      <>
        <DefinitionList
          columns={3}
          items={[
            { term: "Nome", value: name },
            {
              term: "Slug",
              value: (
                <code className="rounded-md bg-surface-soft px-1.5 py-0.5 font-mono text-xs ring-1 ring-inset ring-line">
                  {slug}
                </code>
              ),
            },
            { term: "Na plataforma desde", value: createdAtLabel },
            { term: "Seu acesso", value: accessLabel },
          ]}
        />
        {canEdit ? (
          <div className="mt-4 flex items-center gap-1">
            <PrimaryButton type="button" onClick={() => setEditing(true)}>
              Editar
            </PrimaryButton>
          </div>
        ) : null}
        <FormFeedback success={success} />
      </>
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
      <div className="max-w-md">
        <label
          htmlFor="org-name"
          className="block text-sm font-medium text-brand-950"
        >
          Nome do estabelecimento
        </label>
        <input
          id="org-name"
          type="text"
          value={draft}
          autoFocus
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
        />
        <p className="mt-2 text-xs text-ink-muted">
          Slug{" "}
          <code className="font-mono">{slug}</code> não é editável nesta tela.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-1">
        <PrimaryButton disabled={pending || draft.trim().length < 2}>
          {pending ? "Salvando…" : "Salvar"}
        </PrimaryButton>
        <GhostButton disabled={pending} onClick={cancel}>
          Cancelar
        </GhostButton>
      </div>

      <FormFeedback error={error} />
      {!canEdit ? (
        <p className="mt-3 text-xs text-ink-muted">
          <Badge tone="neutral">Sem permissão</Badge>
        </p>
      ) : null}
    </form>
  );
}
