"use client";

import type { ReactNode } from "react";

/** Classe compartilhada dos inputs de texto do painel (mesma do JoinCard). */
export const inputClass =
  "mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-brand-950 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60";

export function PrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-soft hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** Linha de feedback do formulário: erro (vermelho) ou sucesso (verde). */
export function FormFeedback({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (error) {
    return (
      <p className="mt-3 text-xs text-red-700" role="alert">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="mt-3 text-xs text-emerald-700" role="status">
        {success}
      </p>
    );
  }
  return null;
}
