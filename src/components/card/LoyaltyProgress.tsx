import type { Json } from "@/types/database.types";
import type { PublicCardData } from "@/lib/card/types";

/**
 * Lê um número de um JSONB de regras pela primeira chave presente. Mesma
 * convenção usada no Fidelize Admin (`src/lib/admin/format.ts` →
 * `jsonNumber`) — duplicado aqui de propósito: esta é a superfície
 * PÚBLICA do produto, e não deve depender de nada sob `@/lib/admin`, ainda
 * que a lógica seja idêntica.
 */
function ruleNumber(rules: Json, keys: string[]): number | null {
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
    return null;
  }
  const record = rules as Record<string, Json | undefined>;
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (
      typeof raw === "string" &&
      raw.trim() !== "" &&
      Number.isFinite(Number(raw))
    ) {
      return Number(raw);
    }
  }
  return null;
}

const numberFmt = new Intl.NumberFormat("pt-BR");

/** Linha de resumo "X de Y" + quanto falta — sempre visível, não só em aria. */
function GoalSummary({
  current,
  target,
  unit,
}: {
  current: number;
  target: number;
  unit: string;
}) {
  const remaining = Math.max(0, target - current);
  const reached = remaining === 0;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="font-display text-[color:var(--card-text)]">
        <span className="text-3xl font-bold tabular-nums group-data-[card-style=bold]/card:text-4xl">
          {numberFmt.format(Math.min(current, target))}
        </span>
        <span className="text-lg font-semibold text-[color:var(--card-text)]/60">
          {" "}
          / {numberFmt.format(target)}
        </span>
      </p>
      <p className="text-right text-xs font-medium text-[color:var(--card-text)]/75">
        {reached
          ? "Meta atingida 🎉"
          : `Faltam ${numberFmt.format(remaining)} ${unit}`}
      </p>
    </div>
  );
}

/** Grade de selos/visitas — até 20 posições; acima disso vira barra. */
function StepGrid({
  current,
  target,
  unit,
}: {
  current: number;
  target: number;
  unit: string;
}) {
  const slots = Array.from({ length: target }, (_, index) => index < current);

  return (
    <div className="space-y-3">
      <GoalSummary current={current} target={target} unit={unit} />
      <div
        className="flex flex-wrap gap-1.5"
        role="img"
        aria-label={`${current} de ${target} ${unit} completos`}
      >
        {slots.map((filled, index) => (
          <span
            key={index}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors group-data-[card-style=bold]/card:h-9 group-data-[card-style=bold]/card:w-9",
              filled
                ? "animate-stamp-in bg-[color:var(--card-text)] text-[color:var(--card-bg)] shadow-sm motion-reduce:animate-none"
                : "bg-[color:var(--card-text)]/[0.06] text-[color:var(--card-text)]/55 ring-1 ring-inset ring-[color:var(--card-text)]/30 group-data-[card-style=minimal]/card:bg-transparent",
            ].join(" ")}
            style={filled ? { animationDelay: `${160 + index * 45}ms` } : undefined}
          >
            {filled ? "✓" : index + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({
  current,
  target,
  unit,
}: {
  current: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="space-y-3">
      <GoalSummary current={current} target={target} unit={unit} />
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--card-text)]/20"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
      >
        <div
          className="h-full origin-left animate-card-in rounded-full bg-[color:var(--card-text)] transition-[width] motion-reduce:animate-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BigStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-display text-[2.75rem] font-bold leading-none tabular-nums text-[color:var(--card-text)] group-data-[card-style=bold]/card:text-[3.25rem]">
        {numberFmt.format(value)}
      </p>
      <p className="mt-1.5 text-sm font-medium text-[color:var(--card-text)]/80">
        {label}
      </p>
    </div>
  );
}

/**
 * Visão principal do progresso — a peça central do cartão. Interpreta
 * `program.rules` (JSONB livre) sem nunca fixar uma regra fictícia: sem
 * meta configurada, mostra o saldo cru em vez de inventar um alvo.
 */
export function LoyaltyProgress({
  program,
  membership,
}: {
  program: PublicCardData["program"];
  membership: PublicCardData["membership"];
}) {
  switch (program.type) {
    case "STAMP": {
      const target = ruleNumber(program.rules, ["stamps_target", "target"]);
      if (target && target > 0 && target <= 20) {
        return (
          <StepGrid current={membership.stamps} target={target} unit="selos" />
        );
      }
      if (target && target > 0) {
        return (
          <ProgressBar current={membership.stamps} target={target} unit="selos" />
        );
      }
      return <BigStat value={membership.stamps} label="selos acumulados" />;
    }

    case "VISIT": {
      const target = ruleNumber(program.rules, ["visits_target", "target"]);
      if (target && target > 0 && target <= 20) {
        return (
          <StepGrid current={membership.visits} target={target} unit="visitas" />
        );
      }
      if (target && target > 0) {
        return (
          <ProgressBar
            current={membership.visits}
            target={target}
            unit="visitas"
          />
        );
      }
      return <BigStat value={membership.visits} label="visitas registradas" />;
    }

    case "POINTS":
      return <BigStat value={membership.points} label="pontos disponíveis" />;

    case "TIER": {
      const metric = membership.points || membership.visits || membership.stamps;
      return (
        <div>
          <BigStat value={metric} label="pontuação atual" />
          <p className="mt-3 text-xs leading-relaxed text-[color:var(--card-text)]/70">
            Seu nível é calculado a partir da sua atividade neste programa.
          </p>
        </div>
      );
    }

    case "CUSTOM":
    default: {
      const stats = [
        { value: membership.points, label: "pontos" },
        { value: membership.stamps, label: "selos" },
        { value: membership.visits, label: "visitas" },
      ].filter((stat) => stat.value > 0);

      if (stats.length === 0) {
        return (
          <p className="text-sm font-medium text-[color:var(--card-text)]/85">
            Sua jornada começa na próxima visita.
          </p>
        );
      }

      return (
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl font-bold tabular-nums text-[color:var(--card-text)]">
                {numberFmt.format(stat.value)}
              </p>
              <p className="text-xs font-medium text-[color:var(--card-text)]/80">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      );
    }
  }
}
