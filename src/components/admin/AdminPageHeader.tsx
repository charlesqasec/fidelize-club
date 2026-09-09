import type { ReactNode } from "react";

/**
 * Cabeçalho de página do Fidelize Admin. `eyebrow` (opcional) é o rótulo
 * pequeno acima do título — usado para situar a tela ("Programa de
 * fidelidade", "Somente leitura"). `actions` recebe badges ou links de
 * contexto; nunca botões que mutam dados nesta etapa.
 */
export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-950 sm:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
