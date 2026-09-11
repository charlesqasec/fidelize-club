/**
 * Chaves editáveis de `loyalty_programs.rules`, por `type` — espelha a
 * whitelist validada em `admin_update_program`
 * (20260911120000_program_branding_rewards_admin_rpcs.sql). O rótulo de
 * cada chave vem de `ruleKeyLabel` (@/lib/admin/status), nunca duplicado
 * aqui.
 *
 * `target` (chave genérica lida por `ProgramCardPreview`/`get_public_card`)
 * é aceito pela RPC por compatibilidade com dados existentes, mas não é
 * oferecido no formulário — o formulário sempre grava na chave específica
 * do tipo (`stamps_target`, `visits_target`, `points_target`).
 *
 * TIER e CUSTOM não têm campo estruturado nesta etapa: a mecânica de
 * níveis/personalizada ainda não tem um editor definido, então `rules`
 * desses tipos fica somente leitura no painel (ver limitação registrada no
 * plano da ETAPA 4.6C).
 */
export const RULE_FIELDS_BY_TYPE: Record<string, string[]> = {
  STAMP: ["stamps_target", "max_per_day", "expires_days"],
  VISIT: ["visits_target", "min_interval_minutes", "max_per_day", "expires_days"],
  POINTS: ["points_target", "points_per_visit", "points_per_currency", "expires_days"],
  TIER: [],
  CUSTOM: [],
};

export function ruleFieldsForType(type: string): string[] {
  return RULE_FIELDS_BY_TYPE[type] ?? [];
}
