import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "positive"
  | "warning"
  | "danger"
  | "info"
  | "brand";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-soft text-ink-soft ring-1 ring-inset ring-line",
  positive: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200",
  info: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200",
  brand: "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-ink-muted/60",
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  brand: "bg-brand-500",
};

/**
 * Pílula de status — texto curto + tom semântico. `dot` acrescenta um
 * ponto colorido (bom para status "vivo": ativo, no ar, novo).
 */
export function Badge({
  children,
  tone = "neutral",
  dot = false,
  size = "sm",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  size?: "sm" | "md";
}) {
  const sizing =
    size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${sizing} ${TONE_CLASSES[tone]}`}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`}
        />
      ) : null}
      {children}
    </span>
  );
}
