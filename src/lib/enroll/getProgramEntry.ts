import { createPublicClient } from "@/lib/supabase/publicClient";

import type {
  ProgramEntry,
  ProgramEntryBranding,
  ProgramEntryOutcome,
} from "./types";

/**
 * Resolve a tela de entrada de um programa a partir do `token` da URL
 * (`/join/[token]`).
 *
 * Chama `public.get_program_entry(p_token)` — function `SECURITY DEFINER`
 * criada em `supabase/migrations/20260910134846_public_enrollment_rpcs.sql`
 * (ETAPA 5.0B). Mesma postura de `getPublicCardByToken`: a function é o
 * ÚNICO ponto de leitura pública, resolve tudo a partir do token do
 * `program_join_links`, nunca aceita ids do chamador, e a resposta é
 * NEUTRA (`outcome: "unavailable"`) para qualquer falha de token/link/
 * organização/programa.
 *
 * Este arquivo nunca lança para o chamador: erro de rede/infra vira
 * `{ status: "error" }`, nunca expõe detalhe técnico do Postgres/PostgREST.
 */

/**
 * A coluna `program_join_links.token` é `text` livre (o default é 48 hex,
 * mas não há CHECK). Só evita um round-trip com lixo óbvio — a validação
 * real é da function.
 */
const JOIN_TOKEN_FORMAT = /^[A-Za-z0-9._-]{16,128}$/;

export async function getProgramEntry(
  token: string,
): Promise<ProgramEntryOutcome> {
  if (!JOIN_TOKEN_FORMAT.test(token)) {
    return { status: "unavailable" };
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("get_program_entry", {
      p_token: token,
    });

    if (error) {
      return { status: "error" };
    }

    return mapRpcResult(data);
  } catch {
    return { status: "error" };
  }
}

/** Traduz o JSON da function para `ProgramEntryOutcome`. */
function mapRpcResult(data: unknown): ProgramEntryOutcome {
  if (!data || typeof data !== "object") {
    return { status: "unavailable" };
  }

  const payload = data as { outcome?: string; entry?: unknown };

  if (payload.outcome !== "ok" || !payload.entry || typeof payload.entry !== "object") {
    return { status: "unavailable" };
  }

  const raw = payload.entry as {
    organization?: { name?: unknown };
    program?: { name?: unknown; type?: unknown };
    branding?: Record<string, unknown> | null;
    consent?: {
      termVersion?: unknown;
      dataProcessingRequired?: unknown;
      marketingWhatsappAvailable?: unknown;
      marketingEmailAvailable?: unknown;
    };
  };

  const organizationName =
    typeof raw.organization?.name === "string" ? raw.organization.name : null;
  const programName =
    typeof raw.program?.name === "string" ? raw.program.name : null;

  if (!organizationName || !programName) {
    return { status: "unavailable" };
  }

  const entry: ProgramEntry = {
    organization: { name: organizationName },
    program: {
      name: programName,
      type: normalizeProgramType(raw.program?.type),
    },
    branding: mapBranding(raw.branding),
    consent: {
      termVersion:
        typeof raw.consent?.termVersion === "string"
          ? raw.consent.termVersion
          : "",
      dataProcessingRequired: raw.consent?.dataProcessingRequired !== false,
      marketingWhatsappAvailable:
        raw.consent?.marketingWhatsappAvailable !== false,
      marketingEmailAvailable: raw.consent?.marketingEmailAvailable !== false,
    },
  };

  return { status: "ok", entry };
}

function normalizeProgramType(value: unknown): ProgramEntry["program"]["type"] {
  return value === "STAMP" ||
    value === "VISIT" ||
    value === "POINTS" ||
    value === "TIER" ||
    value === "CUSTOM"
    ? value
    : "CUSTOM";
}

function mapBranding(
  raw: Record<string, unknown> | null | undefined,
): ProgramEntryBranding | null {
  if (!raw || typeof raw !== "object") return null;

  const str = (key: string) =>
    typeof raw[key] === "string" && raw[key] !== "" ? (raw[key] as string) : null;

  const cardStyle = raw.cardStyle;

  return {
    logoUrl: str("logoUrl"),
    primaryColor: str("primaryColor"),
    secondaryColor: str("secondaryColor"),
    backgroundColor: str("backgroundColor"),
    textColor: str("textColor"),
    cardStyle:
      cardStyle === "MINIMAL" || cardStyle === "BOLD" ? cardStyle : "CLASSIC",
    headline: str("headline"),
    description: str("description"),
  };
}
