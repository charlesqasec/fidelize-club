import type { ReactNode } from "react";

/**
 * Coluna de uma `DataTable`. `cell` renderiza o valor da linha; a mesma
 * função alimenta a tabela (desktop) e o card (mobile), então o conteúdo é
 * sempre o mesmo — só a disposição muda.
 *
 * `mobile` decide onde a coluna aparece no card:
 * - `title`  → cabeçalho do card (padrão para a primeira coluna);
 * - `badge`  → canto direito do cabeçalho (status);
 * - `field`  → par rótulo/valor no corpo (padrão para as demais);
 * - `hidden` → não aparece no mobile.
 */
export type DataColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  mobile?: "title" | "badge" | "field" | "hidden";
  /** Classes extras da célula desktop (ex.: `whitespace-nowrap`). */
  className?: string;
};

/**
 * Tabela responsiva do Fidelize Admin. No desktop (md+) é uma tabela
 * legível que rola dentro do próprio contêiner; abaixo disso vira uma lista
 * de cards, para nunca haver scroll horizontal da página nem célula
 * ilegível no 390px.
 *
 * Somente leitura: não há seleção, ordenação nem ação por linha.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 640,
  caption,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Largura mínima da tabela desktop antes de rolar horizontalmente. */
  minWidth?: number;
  /** Descrição acessível da tabela (visualmente oculta). */
  caption: string;
}) {
  const titleColumn =
    columns.find((column) => column.mobile === "title") ?? columns[0];
  const badgeColumn = columns.find((column) => column.mobile === "badge");
  const fieldColumns = columns.filter(
    (column) =>
      column !== titleColumn &&
      column !== badgeColumn &&
      column.mobile !== "hidden",
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-surface-soft/70">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={[
                    "px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
                    column.align === "right" ? "text-right" : "text-left",
                  ].join(" ")}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="transition-colors hover:bg-brand-50/40"
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={[
                      "px-5 py-3.5 align-top text-brand-950 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
                      column.align === "right" ? "text-right" : "",
                      column.className ?? "",
                    ].join(" ")}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-line md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-sm text-brand-950">
                {titleColumn.cell(row)}
              </div>
              {badgeColumn ? (
                <div className="shrink-0">{badgeColumn.cell(row)}</div>
              ) : null}
            </div>
            {fieldColumns.length > 0 ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                {fieldColumns.map((column) => (
                  <div key={column.id} className="min-w-0">
                    <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
                      {column.header}
                    </dt>
                    <dd className="mt-0.5 break-words text-sm text-brand-950">
                      {column.cell(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
