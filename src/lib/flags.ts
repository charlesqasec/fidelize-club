/**
 * Feature flags de canal de experiência.
 *
 * PRINCÍPIO DE ARQUITETURA (não alterar sem revisão):
 * o núcleo do produto é o backend Fidelize.club. Apple Wallet e Google Wallet
 * são CANAIS opcionais sobre o mesmo cadastro/programa — nunca a fonte de verdade.
 * O Cartão Digital Web permanece disponível independentemente das carteiras.
 *
 * Enquanto uma carteira estiver desligada aqui, a landing NÃO deve exibir
 * botão "Adicionar à ...", nem afirmar que a integração está ativa em produção.
 * Ela é apresentada apenas como integração opcional "quando disponível".
 *
 * Na ETAPA 2+ estes valores passarão a vir da configuração do estabelecimento
 * (por tenant), lidos no servidor. Por enquanto são constantes de build.
 */
export const featureFlags = {
  /** Cartão Digital Web Fidelize — fallback universal, sempre ativo. */
  webCardEnabled: true,
  /** Integração Google Wallet — ETAPA 6. */
  googleWalletEnabled: false,
  /** Integração Apple Wallet — ETAPA 7. */
  appleWalletEnabled: false,
} as const;

/** Alguma carteira digital já operacional em produção? */
export const anyWalletEnabled =
  featureFlags.googleWalletEnabled || featureFlags.appleWalletEnabled;
