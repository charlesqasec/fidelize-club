"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/admin/Badge";
import { InlineEmpty } from "@/components/admin/SectionCard";
import {
  addMember,
  setMemberStatus,
  updateMemberRole,
} from "@/lib/admin/team-panel/actions";
import { orgRoleLabel, statusView } from "@/lib/admin/status";
import { IconUserPlus, IconUsers } from "@/components/ui/Icons";

import {
  FormFeedback,
  GhostButton,
  PrimaryButton,
  inputClass,
} from "@/components/admin/formKit";

type AssignableRole = "OWNER" | "MANAGER" | "STAFF";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type MemberRow = {
  id: string;
  role: string;
  status: string;
  createdAtLabel: string;
  name: string | null;
  email: string | null;
};

/**
 * Corpo do card "Equipe". Leitura (nome, e-mail, papel, status) para
 * qualquer papel. Adicionar membro / alterar papel / suspender-reativar só
 * para OWNER e platform admin (`canManage`); `assignableRoles` já vem
 * filtrado pelo servidor (OWNER nunca vê a opção OWNER, nem para si mesmo).
 * As RPCs `admin_add_member` / `admin_update_member_role` /
 * `admin_set_member_status` são a autoridade final de RBAC — bloqueiam
 * OWNER mexendo em outro OWNER e protegem o último OWNER ativo — e
 * registram `audit_logs`. A UI só decide o que oferece.
 */
export function TeamManager({
  organizationId,
  members,
  canManage,
  assignableRoles,
}: {
  organizationId: string;
  members: MemberRow[];
  canManage: boolean;
  assignableRoles: AssignableRole[];
}) {
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    onSuccess?: () => void,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        onSuccess?.();
      } else {
        setError(result.error ?? "Não foi possível concluir.");
      }
    });
  }

  return (
    <div>
      {members.length === 0 ? (
        <InlineEmpty icon={<IconUsers className="h-4 w-4" />}>
          Nenhum membro vinculado ainda.
        </InlineEmpty>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {members.map((member) => {
            const editable =
              canManage &&
              (member.role !== "OWNER" || assignableRoles.includes("OWNER"));
            const roleOptions = Array.from(
              new Set([member.role, ...assignableRoles]),
            );

            return (
              <li
                key={member.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
                  >
                    {(member.name ?? member.email ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-brand-950">
                      {member.name ?? "Sem nome cadastrado"}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {member.email ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Desde {member.createdAtLabel}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {editable ? (
                    <select
                      aria-label={`Papel de ${member.name ?? member.email ?? "membro"}`}
                      value={member.role}
                      disabled={pending}
                      onChange={(e) =>
                        run(() =>
                          updateMemberRole({
                            organizationId,
                            memberId: member.id,
                            role: e.target.value as AssignableRole,
                          }),
                        )
                      }
                      className="h-8 rounded-lg border border-line px-2 text-xs font-medium text-brand-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {orgRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone="brand">{orgRoleLabel(member.role)}</Badge>
                  )}

                  <Badge
                    tone={statusView.member(member.status).tone}
                    dot={member.status === "ACTIVE"}
                  >
                    {statusView.member(member.status).label}
                  </Badge>

                  {editable ? (
                    <GhostButton
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setMemberStatus({
                            organizationId,
                            memberId: member.id,
                            status:
                              member.status === "ACTIVE"
                                ? "SUSPENDED"
                                : "ACTIVE",
                          }),
                        )
                      }
                    >
                      {member.status === "ACTIVE" ? "Suspender" : "Reativar"}
                    </GhostButton>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <div className="mt-4">
          {inviting ? (
            <div className="rounded-xl border border-line p-4">
              <InviteForm
                pending={pending}
                assignableRoles={assignableRoles}
                onCancel={() => {
                  setInviting(false);
                  setError(null);
                }}
                onSubmit={(values) =>
                  run(
                    () =>
                      addMember({
                        organizationId,
                        email: values.email,
                        role: values.role,
                      }),
                    () => {
                      setInviting(false);
                      setSuccess("Convite enviado.");
                    },
                  )
                }
              />
            </div>
          ) : (
            <PrimaryButton
              type="button"
              disabled={pending}
              onClick={() => {
                setInviting(true);
                setError(null);
                setSuccess(null);
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <IconUserPlus className="h-4 w-4" />
                Adicionar membro
              </span>
            </PrimaryButton>
          )}
        </div>
      ) : null}

      <FormFeedback error={error} success={success} />
    </div>
  );
}

function InviteForm({
  pending,
  assignableRoles,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  assignableRoles: AssignableRole[];
  onSubmit: (values: { email: string; role: AssignableRole }) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>(
    assignableRoles[0] ?? "STAFF",
  );

  const emailValid = EMAIL_RE.test(email.trim());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ email: email.trim().toLowerCase(), role });
      }}
      noValidate
      className="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label className="block text-sm font-medium text-brand-950">
          E-mail
          <input
            type="email"
            value={email}
            autoFocus
            disabled={pending}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-950">
          Papel
          <select
            value={role}
            disabled={pending}
            onChange={(e) => setRole(e.target.value as AssignableRole)}
            className={inputClass}
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {orgRoleLabel(r)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1 sm:col-span-2">
        <PrimaryButton disabled={pending || !emailValid}>
          {pending ? "Enviando…" : "Enviar convite"}
        </PrimaryButton>
        <GhostButton disabled={pending} onClick={onCancel}>
          Cancelar
        </GhostButton>
      </div>
      <p className="text-xs text-ink-muted sm:col-span-2">
        A pessoa recebe um e-mail para definir a própria senha. Se já tiver
        conta Fidelize, só é vinculada a este estabelecimento — nada é
        duplicado.
      </p>
    </form>
  );
}
