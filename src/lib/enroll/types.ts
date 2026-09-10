import type { CardStyle, ProgramType } from "@/lib/card/types";

/**
 * Contrato de dados da tela de cadastro público (`/join/[token]`, ETAPA 5.0C).
 *
 * Assim como `PublicCardData`, é DELIBERADAMENTE mais estreito que qualquer
 * `Row` de `database.types.ts`: representa só o que a function
 * `public.get_program_entry` devolve para um visitante anônimo — nome da
 * organização, nome/tipo do programa, branding e o bloco de consentimento.
 * Nunca ids internos, nunca dado de cliente.
 */

export type ProgramEntryBranding = {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  cardStyle: CardStyle;
  headline: string | null;
  description: string | null;
};

export type ProgramEntry = {
  organization: { name: string };
  program: { name: string; type: ProgramType };
  branding: ProgramEntryBranding | null;
  consent: {
    termVersion: string;
    dataProcessingRequired: boolean;
    marketingWhatsappAvailable: boolean;
    marketingEmailAvailable: boolean;
  };
};

/**
 * Resultado tipado da resolução do token — todo estado da rota pública
 * nasce daqui, nunca de um erro genérico do Supabase.
 */
export type ProgramEntryOutcome =
  | { status: "ok"; entry: ProgramEntry }
  /**
   * Resposta NEUTRA da function: token ausente/malformado, link
   * inexistente/desativado/expirado, organização ou programa não-ACTIVE.
   * O visitante nunca distingue a causa (anti-enumeração de links).
   */
  | { status: "unavailable" }
  /** Falha de rede/infra — nunca expõe detalhe técnico ao visitante. */
  | { status: "error" };

/**
 * Retorno tipado do fluxo de inscrição (server action `enrollInProgram`).
 * Espelha `enroll_customer` no banco: em `ok` o cliente é redirecionado
 * para `/c/[cardToken]`; os demais viram mensagens específicas na UI.
 */
export type EnrollResult =
  | { ok: true; cardToken: string; alreadyEnrolled: boolean }
  | {
      ok: false;
      reason:
        | "invalid_link"
        | "link_unavailable"
        | "invalid_name"
        | "invalid_phone"
        | "invalid_email"
        | "rate_limited"
        | "unavailable"
        | "network";
    };
