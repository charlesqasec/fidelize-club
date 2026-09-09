import type { ReactNode } from "react";

/**
 * Tabela simples (desktop-first) do Fidelize Admin. Rola horizontalmente
 * dentro do próprio contêiner — o body da página nunca rola na horizontal.
 *
 * Para listas que precisam ficar legíveis no celular, prefira `DataTable`
 * (`./DataTable.tsx`), que vira cards abaixo de `md`.
 */
export function AdminTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-soft/70 text-left">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

/** Célula de dados com o padding padrão da `AdminTable`. */
export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-top text-brand-950 ${className}`}>
      {children}
    </td>
  );
}
