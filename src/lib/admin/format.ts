import type { Json } from "@/types/database.types";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const numberFmt = new Intl.NumberFormat("pt-BR");

/** Data curta (dd/mm/aaaa) ou "—" quando ausente/inválida. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return dateFmt.format(parsed);
}

/** Data + hora ou "—" quando ausente/inválida. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return dateTimeFmt.format(parsed);
}

/** Intervalo "dd/mm/aaaa – dd/mm/aaaa"; lados ausentes viram "—". */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return "Sem período definido";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatNumber(value: number | null | undefined): string {
  return numberFmt.format(value ?? 0);
}

/**
 * ISO de `days` dias atrás, avaliado no momento da chamada. Fica aqui (e
 * não inline numa página) de propósito: o valor depende do relógio de
 * requisição, então não pode ser calculado no corpo de um componente
 * (regra `react-hooks/purity`).
 */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Primeiros 8 caracteres de um UUID — identificador legível, não secreto. */
export function shortId(id: string): string {
  return id.slice(0, 8);
}

/**
 * Endereço de `locations.address` (JSONB livre) achatado numa linha. Não
 * assume um formato fixo — apenas concatena os valores string presentes.
 */
export function formatAddress(address: Json | null | undefined): string {
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    return "—";
  }
  const parts = Object.values(address).filter(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

/** Pares chave/valor de um JSONB de configuração (`rules`, etc.). */
export function jsonEntries(value: Json | null | undefined): [string, string][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, raw]) => [
    key,
    typeof raw === "object" ? JSON.stringify(raw) : String(raw),
  ]);
}

/**
 * Lê um número de um JSONB de configuração pela primeira chave presente
 * (ex.: `target` em `loyalty_programs.rules`). Aceita número ou string
 * numérica; qualquer outra coisa é `null` — nunca inventa valor.
 */
export function jsonNumber(
  value: Json | null | undefined,
  keys: string[],
): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, Json | undefined>;
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) {
      return Number(raw);
    }
  }
  return null;
}
