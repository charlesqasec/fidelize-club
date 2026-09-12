import type { BadgeTone } from "@/components/admin/Badge";

export type StatusView = { label: string; tone: BadgeTone };

const FALLBACK: StatusView = { label: "—", tone: "neutral" };

function lookup(
  map: Record<string, StatusView>,
  value: string | null | undefined,
): StatusView {
  if (!value) return FALLBACK;
  return map[value] ?? { label: value, tone: "neutral" };
}

/** organizations.status */
const ORGANIZATION: Record<string, StatusView> = {
  ACTIVE: { label: "Ativo", tone: "positive" },
  SUSPENDED: { label: "Suspenso", tone: "warning" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
};

/** loyalty_programs.status */
const PROGRAM: Record<string, StatusView> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  ACTIVE: { label: "Ativo", tone: "positive" },
  PAUSED: { label: "Pausado", tone: "warning" },
  ARCHIVED: { label: "Arquivado", tone: "neutral" },
};

/** customer_memberships.status */
const MEMBERSHIP: Record<string, StatusView> = {
  ACTIVE: { label: "Ativo", tone: "positive" },
  INACTIVE: { label: "Inativo", tone: "neutral" },
  BLOCKED: { label: "Bloqueado", tone: "danger" },
};

/** campaigns.status */
const CAMPAIGN: Record<string, StatusView> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  PENDING_APPROVAL: { label: "Aguardando aprovação", tone: "warning" },
  APPROVED: { label: "Aprovada", tone: "info" },
  ACTIVE: { label: "No ar", tone: "positive" },
  PAUSED: { label: "Pausada", tone: "warning" },
  COMPLETED: { label: "Concluída", tone: "neutral" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
};

/** campaign_messages.status */
const CAMPAIGN_MESSAGE: Record<string, StatusView> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  SCHEDULED: { label: "Agendada", tone: "info" },
  SENT: { label: "Enviada", tone: "positive" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
};

/** nfc_devices.status */
const DEVICE: Record<string, StatusView> = {
  ACTIVE: { label: "Ativo", tone: "positive" },
  INACTIVE: { label: "Inativo", tone: "neutral" },
  REVOKED: { label: "Revogado", tone: "danger" },
};

/** qr_tokens.status */
const QR_TOKEN: Record<string, StatusView> = {
  ACTIVE: { label: "Ativo", tone: "positive" },
  EXPIRED: { label: "Expirado", tone: "warning" },
  REVOKED: { label: "Revogado", tone: "danger" },
};

/** customer_feedback.status */
const FEEDBACK: Record<string, StatusView> = {
  NEW: { label: "Novo", tone: "info" },
  REVIEWED: { label: "Analisado", tone: "positive" },
  ARCHIVED: { label: "Arquivado", tone: "neutral" },
};

/** review_requests.status */
const REVIEW_REQUEST: Record<string, StatusView> = {
  REQUESTED: { label: "Enviado", tone: "info" },
  CLICKED: { label: "Clicado", tone: "positive" },
  DISMISSED: { label: "Dispensado", tone: "neutral" },
};

/** review_channels.status */
const REVIEW_CHANNEL: Record<string, StatusView> = {
  ACTIVE: { label: "Ativo", tone: "positive" },
  INACTIVE: { label: "Inativo", tone: "neutral" },
};

/** organization_members.status */
const MEMBER: Record<string, StatusView> = {
  ACTIVE: { label: "Ativo", tone: "positive" },
  INVITED: { label: "Convidado", tone: "info" },
  SUSPENDED: { label: "Suspenso", tone: "danger" },
};

/** locations.status */
const LOCATION: Record<string, StatusView> = {
  ACTIVE: { label: "Ativa", tone: "positive" },
  INACTIVE: { label: "Inativa", tone: "neutral" },
};

/** admin_org_nfc_qr_overview: nfc_status / qr_status por unidade. */
const NFC_QR_CHANNEL: Record<string, StatusView> = {
  ACTIVE: { label: "Ativo", tone: "positive" },
  INACTIVE: { label: "Inativo", tone: "neutral" },
  NONE: { label: "Não configurado", tone: "neutral" },
};

/** admin_org_nfc_qr_overview: overall_status. */
const NFC_QR_OVERALL: Record<string, StatusView> = {
  OPERATIONAL: { label: "Operacional", tone: "positive" },
  PARTIAL: { label: "Parcial", tone: "warning" },
  NOT_CONFIGURED: { label: "Não configurado", tone: "neutral" },
};

export const statusView = {
  organization: (v: string | null | undefined) => lookup(ORGANIZATION, v),
  program: (v: string | null | undefined) => lookup(PROGRAM, v),
  membership: (v: string | null | undefined) => lookup(MEMBERSHIP, v),
  campaign: (v: string | null | undefined) => lookup(CAMPAIGN, v),
  campaignMessage: (v: string | null | undefined) => lookup(CAMPAIGN_MESSAGE, v),
  device: (v: string | null | undefined) => lookup(DEVICE, v),
  qrToken: (v: string | null | undefined) => lookup(QR_TOKEN, v),
  feedback: (v: string | null | undefined) => lookup(FEEDBACK, v),
  reviewRequest: (v: string | null | undefined) => lookup(REVIEW_REQUEST, v),
  reviewChannel: (v: string | null | undefined) => lookup(REVIEW_CHANNEL, v),
  member: (v: string | null | undefined) => lookup(MEMBER, v),
  location: (v: string | null | undefined) => lookup(LOCATION, v),
  nfcQrChannel: (v: string | null | undefined) => lookup(NFC_QR_CHANNEL, v),
  nfcQrOverall: (v: string | null | undefined) => lookup(NFC_QR_OVERALL, v),
};

const PROGRAM_TYPE: Record<string, string> = {
  STAMP: "Selos",
  VISIT: "Visitas",
  POINTS: "Pontos",
  TIER: "Níveis",
  CUSTOM: "Personalizado",
};

export function programTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return PROGRAM_TYPE[type] ?? type;
}

const CARD_STYLE: Record<string, string> = {
  CLASSIC: "Clássico",
  MINIMAL: "Minimalista",
  BOLD: "Marcante",
};

export function cardStyleLabel(style: string | null | undefined): string {
  if (!style) return "—";
  return CARD_STYLE[style] ?? style;
}

const REWARD_TYPE: Record<string, string> = {
  FREE_ITEM: "Item grátis",
  DISCOUNT: "Desconto",
  CASHBACK: "Cashback",
  CUSTOM: "Personalizado",
};

export function rewardTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return REWARD_TYPE[type] ?? type;
}

const CAMPAIGN_TYPE: Record<string, string> = {
  STANDARD: "Padrão",
  ADVANCED: "Personalizada",
};

export function campaignTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return CAMPAIGN_TYPE[type] ?? type;
}

const QR_TYPE: Record<string, string> = {
  STATIC: "Estático",
  DYNAMIC: "Dinâmico",
  SINGLE_USE: "Uso único",
};

export function qrTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return QR_TYPE[type] ?? type;
}

const CHANNEL: Record<string, string> = {
  WEB_CARD: "Cartão web",
  WEB_PUSH: "Web Push",
  GOOGLE_WALLET: "Google Wallet",
  APPLE_WALLET: "Apple Wallet",
};

export function channelLabel(channel: string | null | undefined): string {
  if (!channel) return "—";
  return CHANNEL[channel] ?? channel;
}

const REVIEW_PROVIDER: Record<string, string> = {
  GOOGLE: "Google",
  TRIPADVISOR: "TripAdvisor",
  FACEBOOK: "Facebook",
  CUSTOM: "Personalizado",
};

export function reviewProviderLabel(provider: string | null | undefined): string {
  if (!provider) return "—";
  return REVIEW_PROVIDER[provider] ?? provider;
}

const ORG_ROLE: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  STAFF: "Equipe",
};

export function orgRoleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ORG_ROLE[role] ?? role;
}

const TRANSACTION_TYPE: Record<string, string> = {
  VISIT: "Visita",
  STAMP_ADD: "Selo adicionado",
  POINTS_ADD: "Pontos adicionados",
  POINTS_REMOVE: "Pontos removidos",
  REWARD_REDEEM: "Recompensa resgatada",
  ADJUSTMENT: "Ajuste",
  BONUS: "Bônus",
  REVERSAL: "Estorno",
};

export function transactionTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return TRANSACTION_TYPE[type] ?? type;
}

/**
 * Rótulos legíveis para as chaves conhecidas de `loyalty_programs.rules`
 * (JSONB livre, validado pela aplicação). Chave desconhecida vira texto
 * "humanizado" (snake_case -> "Snake case") — nunca é escondida.
 */
const RULE_KEY: Record<string, string> = {
  target: "Meta",
  stamps_target: "Meta de selos",
  visits_target: "Meta de visitas",
  points_target: "Meta de pontos",
  points_per_visit: "Pontos por visita",
  points_per_currency: "Pontos por real gasto",
  min_interval_minutes: "Intervalo mínimo entre visitas (min)",
  max_per_day: "Máximo por dia",
  expires_days: "Validade (dias)",
  tiers: "Níveis",
};

export function ruleKeyLabel(key: string): string {
  if (RULE_KEY[key]) return RULE_KEY[key];
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
