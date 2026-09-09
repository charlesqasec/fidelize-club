import type { ReactNode } from "react";

/**
 * Card de métrica. Sem `value` (ou `null`/`undefined`) mostra "—" + a
 * explicação — para números cuja fonte ainda não existe. Com `value`
 * mostra o dado real (que pode legitimamente ser `0`).
 *
 * `icon` é opcional e puramente decorativo; `accent` pinta o card com a
 * cor da marca para a métrica principal da tela (usar em no máximo um).
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = false,
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  const isEmpty = value === null || value === undefined;

  return (
    <div
      className={[
        "admin-card relative flex flex-col overflow-hidden rounded-2xl border p-5",
        accent
          ? "border-brand-700 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white shadow-lg shadow-brand-900/25"
          : "border-line bg-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-sm font-medium ${accent ? "text-brand-100" : "text-ink-muted"}`}
        >
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden="true"
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              accent
                ? "bg-white/15 text-white"
                : "bg-brand-50 text-brand-600",
            ].join(" ")}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={[
          "mt-3 font-display text-3xl font-bold tabular-nums tracking-tight sm:text-[2rem]",
          accent ? "text-white" : "text-brand-950",
          isEmpty ? "opacity-60" : "",
        ].join(" ")}
      >
        {isEmpty ? "—" : value}
      </p>
      {hint ? (
        <p
          className={`mt-1.5 text-xs leading-relaxed ${accent ? "text-brand-200" : "text-ink-muted"}`}
        >
          {hint}
        </p>
      ) : null}
      {accent ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        />
      ) : null}
    </div>
  );
}
