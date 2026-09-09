import type { ReactNode } from "react";

/**
 * Bloco de conteúdo com título — usado para agrupar cada área de um módulo.
 * `icon` (opcional) dá identidade visual ao bloco; `footer` recebe notas
 * curtas (ex.: "Mostrando os 100 mais recentes"). `flush` remove o padding
 * interno do corpo para tabelas ocuparem a largura toda do card.
 */
export function SectionCard({
  title,
  description,
  actions,
  icon,
  footer,
  flush = false,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="admin-card overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        {icon ? (
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 font-display text-base font-semibold text-brand-950 sm:text-lg">
              {title}
            </h2>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {actions}
              </div>
            ) : null}
          </div>
          {description ? (
            <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className={flush ? "mt-4" : "px-5 pb-5 pt-4 sm:px-6 sm:pb-6"}>
        {children}
      </div>
      {footer ? (
        <div className="border-t border-line bg-surface-soft px-5 py-3 text-xs text-ink-muted sm:px-6">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Estado vazio de uma subseção dentro de um `SectionCard`: discreto, não
 * parece erro. Use `EmptyState` (variante `restricted`) quando o motivo
 * for permissão, não ausência de dados.
 */
export function InlineEmpty({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-line bg-surface-soft/60 px-4 py-4">
      {icon ? (
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-brand-500 ring-1 ring-inset ring-line"
        >
          {icon}
        </span>
      ) : null}
      <p className="text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}

/** Lista de definição (rótulo + valor) para dados somente leitura. */
export function DefinitionList({
  items,
  columns = 2,
}: {
  items: { term: string; value: ReactNode; wide?: boolean }[];
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";
  return (
    <dl className={`grid gap-x-8 gap-y-5 ${grid}`}>
      {items.map((item) => (
        <div
          key={item.term}
          className={item.wide ? "min-w-0 sm:col-span-full" : "min-w-0"}
        >
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {item.term}
          </dt>
          <dd className="mt-1.5 break-words text-sm leading-relaxed text-brand-950">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
