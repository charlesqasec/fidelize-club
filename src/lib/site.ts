/**
 * Conteúdo e configuração da landing pública.
 *
 * REGRA DE CONTEÚDO: nada aqui pode ser inventado.
 * Sem métricas, depoimentos, clientes, parceiros ou integrações fictícias.
 * Dados que aparecem em mockups pertencem a um estabelecimento DEMO fictício
 * e devem estar sempre rotulados como tal na interface.
 */

export const site = {
  name: "Fidelize.club",
  tagline: "Clientes que voltam sempre",
  domain: "fidelize.club",
  url: "https://fidelize.club",
  title: "Fidelize.club | Clientes que voltam sempre",
  description:
    "Programa de fidelidade digital para transformar visitas em relacionamento, recorrência e vendas.",
} as const;

/**
 * Canal comercial de contato.
 *
 * Enquanto não existir um endereço/número REAL confirmado, mantemos `null`:
 * os CTAs então apontam para a seção de planos (link real e funcional) em vez
 * de um mailto/WhatsApp inventado que quebraria para o usuário.
 *
 * Para ativar: preencha um dos campos abaixo. Nada mais precisa mudar.
 */
export const contact: { email: string | null; whatsapp: string | null } = {
  email: null,
  whatsapp: null,
};

/**
 * Posicionamento comercial: o Fidelize.club não vende apenas software.
 * A equipe ajuda a configurar o programa junto com o estabelecimento.
 * Usado com moderação (seção Kit) — não é uma seção nova da landing.
 */
export const positioning = {
  tagline: "Seu programa de fidelidade, do seu jeito.",
  description:
    "Você não recebe apenas uma placa NFC. A equipe Fidelize.club ajuda a configurar o programa ideal para o seu negócio.",
} as const;

/**
 * Personalização padrão (inclusa no plano) vs. avançada (sob orçamento,
 * sem preço fixo). Ver docs/ARQUITETURA.md, seção 4.
 */
export const personalization = {
  standard: "Personalização padrão inclusa.",
  advanced: "Projetos e campanhas avançadas sob orçamento.",
} as const;

/** Destino dos CTAs comerciais, resolvido a partir do contato configurado. */
export function commercialHref(): string {
  if (contact.whatsapp) {
    return `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`;
  }
  if (contact.email) {
    return `mailto:${contact.email}?subject=${encodeURIComponent(
      "Quero fidelizar meu negócio",
    )}`;
  }
  return "#planos";
}

export const nav = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Cartão digital", href: "#cartao-digital" },
  { label: "Campanhas", href: "#campanhas" },
  { label: "Painel", href: "#painel" },
  { label: "Segurança", href: "#seguranca" },
  { label: "Planos", href: "#planos" },
] as const;

export const heroBenefits = [
  "Mais clientes recorrentes",
  "Dados sob seu controle",
  "Campanhas que fazem voltar",
] as const;

export const steps = [
  {
    number: "01",
    title: "Encosta",
    description: "Cliente aproxima o celular da placa NFC.",
  },
  {
    number: "02",
    title: "Cadastra",
    description: "Em poucos segundos, cria seu cadastro.",
  },
  {
    number: "03",
    title: "Acessa",
    description:
      "O cartão digital fica disponível no celular. Quando disponível, poderá adicioná-lo também à carteira digital.",
  },
  {
    number: "04",
    title: "Volta",
    description: "Acumula visitas e pontos e recebe recompensas.",
  },
] as const;

export const campaignExamples = [
  "Oferta da semana",
  "Ponto em dobro",
  "Recompensa especial",
  "Aniversário",
  "Volte e ganhe",
  "Campanha personalizada",
] as const;

export const segments = [
  "Barbearias",
  "Cafeterias",
  "Restaurantes",
  "Academias",
  "Lojas",
  "Salões de beleza",
  "Comércios",
  "Shoppings",
  "E muito mais",
] as const;

export const kitItems = [
  {
    title: "Placa NFC",
    description: "Personalizada com a identidade do seu negócio.",
  },
  {
    title: "Configuração",
    description: "Seu programa de fidelidade pronto para usar.",
  },
  {
    title: "Suporte",
    description: "Orientação inicial e acompanhamento.",
  },
] as const;

export const specialCampaigns = [
  "Black Friday",
  "Dia das Mães",
  "Dia dos Pais",
  "Natal",
  "Aniversário",
  "Clientes inativos",
  "Campanhas por produto",
] as const;

export const securityPillars = [
  {
    title: "Proteção de dados",
    description:
      "Separação entre estabelecimentos e acesso restrito por perfil desde o desenho do sistema.",
  },
  {
    title: "Privacidade",
    description:
      "Consentimento explícito do consumidor e finalidade clara para cada dado coletado.",
  },
  {
    title: "Boas práticas de segurança",
    description:
      "LGPD tratada como requisito de projeto, não como ajuste posterior.",
  },
] as const;

/** Certificação do responsável técnico — NÃO é certificação da empresa. */
export const certification = {
  title: "ISO/IEC 27001:2022 Information Security Associate™",
  issuer: "SkillFront",
  holder: "Charles Santos Cerqueira",
  image: "/certificacao/iso-iec-27001-2022-skillfront.png",
  alt: "Certificado original SkillFront de ISO/IEC 27001:2022 Information Security Associate emitido para Charles Santos Cerqueira.",
} as const;

export const plan = {
  name: "Plano Fidelize",
  price: "97",
  period: "/mês",
  features: [
    "Programa personalizado",
    "Configuração inicial com a equipe Fidelize",
    "Placa NFC",
    "Cartão Digital Fidelize",
    "Carteiras digitais quando disponíveis",
    "Painel completo",
    "Clientes ilimitados",
    "Recompensas",
    "Suporte e acompanhamento",
  ],
} as const;

/**
 * Estabelecimento DEMO usado nos mockups da landing.
 * Fictício. Nunca apresentar como cliente real da Fidelize.club.
 */
export const demoCard = {
  business: "Barbearia do Lucas",
  program: "Clube de Fidelidade",
  customer: "Carlos",
  visits: 6,
  target: 10,
  reward: "Corte grátis",
  campaigns: [
    {
      title: "Semana do Cliente",
      description: "Volte até sexta-feira e ganhe ponto em dobro.",
    },
    {
      title: "Indique um amigo",
      description: "Vocês dois recebem uma visita bônus.",
    },
  ],
} as const;
