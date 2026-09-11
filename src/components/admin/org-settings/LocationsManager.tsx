"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/admin/Badge";
import { InlineEmpty } from "@/components/admin/SectionCard";
import {
  createLocation,
  setLocationStatus,
  updateLocation,
} from "@/lib/admin/org-settings/actions";
import { statusView } from "@/lib/admin/status";
import { IconMapPin } from "@/components/ui/Icons";

import {
  FormFeedback,
  GhostButton,
  PrimaryButton,
  inputClass,
} from "./formKit";

export type LocationRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  addressLabel: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Corpo do card "Unidades". Leitura para todos; criar / editar / ativar /
 * desativar para OWNER, MANAGER e platform admin (`canEdit`). A RPC
 * (`admin_create_location` / `admin_update_location` /
 * `admin_set_location_status`) é a autoridade de RBAC e registra
 * `audit_logs`.
 */
export function LocationsManager({
  organizationId,
  locations,
  canEdit,
}: {
  organizationId: string;
  locations: LocationRow[];
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
      {locations.length === 0 && !creating ? (
        <InlineEmpty icon={<IconMapPin className="h-4 w-4" />}>
          Nenhuma unidade cadastrada ainda.
        </InlineEmpty>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {locations.map((location) =>
            editingId === location.id ? (
              <li key={location.id} className="p-4">
                <LocationForm
                  submitLabel="Salvar"
                  pending={pending}
                  initial={location}
                  onCancel={() => {
                    setEditingId(null);
                    setError(null);
                  }}
                  onSubmit={(values) =>
                    run(
                      () =>
                        updateLocation({
                          organizationId,
                          locationId: location.id,
                          name: values.name,
                          slug: values.slug,
                          address: values.address
                            ? { linha: values.address }
                            : null,
                        }),
                      () => setEditingId(null),
                    )
                  }
                />
              </li>
            ) : (
              <li
                key={location.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-brand-950">{location.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-ink-muted">
                    {location.slug}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {location.addressLabel}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    tone={statusView.location(location.status).tone}
                    dot={location.status === "ACTIVE"}
                  >
                    {statusView.location(location.status).label}
                  </Badge>
                  {canEdit ? (
                    <>
                      <GhostButton
                        disabled={pending}
                        onClick={() => {
                          setEditingId(location.id);
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
                              setLocationStatus({
                                organizationId,
                                locationId: location.id,
                                status:
                                  location.status === "ACTIVE"
                                    ? "INACTIVE"
                                    : "ACTIVE",
                              }),
                            () => {},
                          )
                        }
                      >
                        {location.status === "ACTIVE" ? "Desativar" : "Ativar"}
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
              <LocationForm
                submitLabel="Criar unidade"
                pending={pending}
                onCancel={() => {
                  setCreating(false);
                  setError(null);
                }}
                onSubmit={(values) =>
                  run(
                    () =>
                      createLocation({
                        organizationId,
                        name: values.name,
                        slug: values.slug,
                        address: values.address
                          ? { linha: values.address }
                          : null,
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
              Nova unidade
            </PrimaryButton>
          )}
        </div>
      ) : null}

      <FormFeedback error={error} />
    </div>
  );
}

function LocationForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: LocationRow;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: { name: string; slug: string; address: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [address, setAddress] = useState(
    initial && initial.addressLabel !== "—" ? initial.addressLabel : "",
  );

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effectiveSlug);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim(), slug: effectiveSlug, address: address.trim() });
      }}
      noValidate
      className="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label className="block text-sm font-medium text-brand-950">
          Nome da unidade
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
          Identificador (slug)
          <input
            type="text"
            value={effectiveSlug}
            disabled={pending}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={inputClass}
          />
        </label>
        {!slugValid && effectiveSlug.length > 0 ? (
          <p className="mt-1 text-xs text-red-700">
            Só letras minúsculas, números e hífens.
          </p>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-brand-950">
          Endereço{" "}
          <span className="font-normal text-ink-muted">(opcional)</span>
          <input
            type="text"
            value={address}
            disabled={pending}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex items-center gap-1 sm:col-span-2">
        <PrimaryButton
          disabled={pending || name.trim().length < 2 || !slugValid}
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
