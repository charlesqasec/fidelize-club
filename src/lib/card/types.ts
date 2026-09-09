import type { Json } from "@/types/database.types";

/**
 * Contrato de dados do Web Card público (`/c/[token]`, ETAPA 5/4.0).
 *
 * Este tipo é DELIBERADAMENTE mais estreito que qualquer `Row` de
 * `database.types.ts`: representa só o que é seguro mostrar a um
 * consumidor anônimo que possui o token do próprio cartão — nunca um
 * espelho de tabela. Nenhum UUID interno desnecessário, nenhum dado de
 * outro cliente, nenhum segredo.
 *
 * Ver `src/lib/card/getPublicCard.ts` para como (e por que ainda não) isto
 * é preenchido a partir do Supabase.
 */

export type ProgramType = "STAMP" | "VISIT" | "POINTS" | "TIER" | "CUSTOM";
export type CardStyle = "CLASSIC" | "MINIMAL" | "BOLD";
export type RewardType = "FREE_ITEM" | "DISCOUNT" | "CASHBACK" | "CUSTOM";

export type PublicCardBranding = {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  cardStyle: CardStyle;
  headline: string | null;
  description: string | null;
};

export type PublicCardReward = {
  id: string;
  name: string;
  description: string | null;
  type: RewardType;
  /** Custo em pontos/selos/visitas — a unidade depende de `program.type`. */
  threshold: number;
};

export type PublicCardCampaign = {
  id: string;
  title: string;
  body: string;
};

export type PublicCardReviewChannel = {
  label: string;
  url: string;
};

export type PublicCardData = {
  organization: {
    name: string;
  };
  program: {
    name: string;
    type: ProgramType;
    /** ARCHIVED nunca chega aqui — vira o estado `program_inactive` antes. */
    status: "ACTIVE" | "PAUSED";
    /** Parâmetros crus da mecânica (`loyalty_programs.rules`) — chaves variam por `type`. */
    rules: Json;
  };
  branding: PublicCardBranding | null;
  customer: {
    /** Só o primeiro nome — nunca o cadastro completo do cliente. */
    firstName: string | null;
  };
  membership: {
    status: "ACTIVE" | "INACTIVE" | "BLOCKED";
    points: number;
    stamps: number;
    visits: number;
    joinedAt: string;
    lastActivityAt: string | null;
  };
  /** Só recompensas com status ACTIVE, ordenadas por `threshold` crescente. */
  rewards: PublicCardReward[];
  /**
   * Só campanhas com status ACTIVE (aprovadas) e uma mensagem de canal
   * WEB_CARD dentro do período vigente — nunca DRAFT/PENDING_APPROVAL.
   */
  campaigns: PublicCardCampaign[];
  /**
   * Só quando a organização tem `organization_feature_flags.reviews_enabled`
   * e um `review_channels` com status ACTIVE. `null` = seção não aparece.
   */
  reviewChannel: PublicCardReviewChannel | null;
  /** Reflete `organization_feature_flags.internal_feedback_enabled`. */
  feedbackEnabled: boolean;
};

/**
 * Resultado tipado da resolução do token — todo estado da rota pública
 * nasce daqui, nunca de um erro genérico do Supabase.
 */
export type CardLookupOutcome =
  | { status: "ok"; card: PublicCardData }
  /** Token não corresponde a nenhum cartão conhecido. */
  | { status: "not_found" }
  /**
   * Cartão existe mas foi revogado (`customer_cards.status = 'REVOKED'`).
   * `organizationName` é opcional — só usado para uma mensagem mais gentil
   * quando a function conseguir resolvê-lo com segurança.
   */
  | { status: "card_inactive"; organizationName?: string }
  /** Programa arquivado (`loyalty_programs.status = 'ARCHIVED'`). */
  | { status: "program_inactive"; organizationName?: string }
  /**
   * Infraestrutura indisponível — hoje sempre este estado em produção real,
   * porque a function pública ainda não existe (ver getPublicCard.ts).
   * Nunca revela detalhe técnico do Supabase ao consumidor.
   */
  | { status: "unavailable" };
