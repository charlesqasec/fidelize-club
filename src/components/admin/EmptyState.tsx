import type { ReactNode } from "react";

import { IconLock } from "@/components/ui/Icons";

/**
 * Estado vazio padrão dos módulos do Fidelize Admin — nunca dado fictício.
 *
 * Duas situações diferentes, com visual diferente de propósito:
 * - `empty` (padrão): "ainda não há dados" — neutro, convidativo.
 * - `restricted`: "seu perfil não vê este dado" — cadeado, tom sóbrio,
 *   sem parecer erro nem falha do sistema.
 *
 * `compact` reduz a altura para uso dentro de um `SectionCard`.
 */
export function EmptyState({
  icon,
  title,
  description,
  variant = "empty",
  compact = false,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  variant?: "empty" | "restricted";
  compact?: boolean;
  action?: ReactNode;
}) {
  const restricted = variant === "restricted";
  const glyph = icon ?? (restricted ? <IconLock className="h-6 w-6" /> : null);

  return (
    <div
      className={[
        "admin-reveal flex flex-col items-center rounded-2xl border border-dashed px-6 text-center",
        compact ? "py-10" : "py-14 sm:py-16",
        restricted
          ? "border-line bg-surface-soft/70"
          : "border-brand-200 bg-white",
      ].join(" ")}
    >
      {glyph ? (
        <div
          aria-hidden="true"
          className={[
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            restricted
              ? "bg-white text-ink-muted ring-1 ring-inset ring-line"
              : "bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100",
          ].join(" ")}
        >
          {glyph}
        </div>
      ) : null}
      <p className="mt-4 font-display text-base font-semibold text-brand-950">
        {title}
      </p>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
