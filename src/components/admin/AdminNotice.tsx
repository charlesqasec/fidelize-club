import type { ReactNode } from "react";

import { IconLock, IconSparkle } from "@/components/ui/Icons";

/**
 * Aviso contextual de página. Duas intenções distintas:
 * - `info`: contexto útil (ex.: "somente leitura nesta etapa");
 * - `restricted`: o perfil do usuário não enxerga determinado dado por
 *   desenho de segurança (RLS) — não é erro, não é falha, é regra.
 */
export function AdminNotice({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "restricted";
  title?: string;
  children: ReactNode;
}) {
  const restricted = variant === "restricted";
  return (
    <div
      role="note"
      className={[
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm",
        restricted
          ? "border-line bg-surface-soft text-ink-soft"
          : "border-brand-100 bg-brand-50/70 text-brand-900",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          restricted
            ? "bg-white text-ink-muted ring-1 ring-inset ring-line"
            : "bg-white text-brand-600 ring-1 ring-inset ring-brand-100",
        ].join(" ")}
      >
        {restricted ? (
          <IconLock className="h-4 w-4" />
        ) : (
          <IconSparkle className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 leading-relaxed">
        {title ? <p className="font-semibold text-brand-950">{title}</p> : null}
        <p className={title ? "mt-0.5" : ""}>{children}</p>
      </div>
    </div>
  );
}
