# Fidelize.club — Arquitetura

> Documento vivo. Registra as decisões tomadas até aqui e os requisitos das
> próximas etapas. Implementado até aqui: **ETAPA 1** (landing pública),
> **ETAPA 1.1** (revisão conceitual de produto), **ETAPA 1.2** (avaliação,
> feedback e reputação) e **ETAPA 2** (fundação de schema Supabase —
> multi-tenant, RLS, migrations; ver `docs/BANCO_DE_DADOS.md`). Ainda sem
> autenticação funcional (login/telas/middleware), painel, cartão
> funcional, Wallet, integrações externas ou pagamento.

---

## 1. Princípio de produto: tecnologia + implantação + acompanhamento

O Fidelize.club **não é um software self-service**. É um produto entregue com
apoio da própria equipe:

```
TECNOLOGIA  +  IMPLANTAÇÃO  +  ACOMPANHAMENTO
```

O estabelecimento não configura tudo sozinho. A equipe Fidelize conversa com o
proprietário e ajuda a definir o tipo de programa, a lógica de
pontos/visitas/selos, a recompensa, a identidade visual, a experiência do
cartão e as campanhas. **O estabelecimento decide a experiência; a Fidelize
fornece a tecnologia e ajuda a implantar.**

Consequência para o texto comercial (já refletida na landing):

> "Seu programa de fidelidade, do seu jeito." — `src/lib/site.ts` → `positioning`

Isso aparece na seção de Kit (`Kit.tsx`) como um destaque discreto, não como
uma seção nova.

---

## 2. O núcleo é o backend Fidelize — Wallets são canais, não fallback

O núcleo do produto **não** é Apple Wallet nem Google Wallet.
O núcleo é o **backend Fidelize.club** (a partir da ETAPA 2, com Supabase como
fonte primária de verdade).

```
CLIENTE
   ↓
FIDELIZE.CLUB  (fonte de verdade)
   ↓
CADASTRO · PROGRAMA · VISITAS · PONTOS · RECOMPENSAS · CAMPANHAS · FEEDBACK
   ↓
CANAIS DE EXPERIÊNCIA
   ├── Cartão Digital Web Fidelize   (canal oficial e permanente do produto)
   ├── Google Wallet                  (extensão opcional — ETAPA 8)
   └── Apple Wallet                   (extensão opcional — ETAPA 9)
```

**Regra dura:** nenhum dado essencial pode existir somente dentro de uma Wallet.
Se o cliente remover o passe, trocar de celular, não usar Wallet, ou se Google
Wallet/Apple Wallet estiverem indisponíveis, os dados, visitas, pontos,
recompensas e feedback continuam existindo e acessíveis no Fidelize.club.

### Consequência já aplicada (`src/lib/flags.ts`)

```ts
webCardEnabled       = true   // canal oficial — nunca desligar
googleWalletEnabled  = false  // ETAPA 8
appleWalletEnabled   = false  // ETAPA 9
```

A landing lê essas flags. Enquanto uma carteira estiver `false`, a página:

- não exibe botão "Adicionar à …";
- não simula integração;
- não mostra erro artificial;
- apresenta as carteiras como integração **opcional, quando disponível**.

Quando uma flag virar `true`, nada do programa de fidelidade precisa ser
reconstruído nem migrado.

---

## 3. Modelo conceitual de programas de fidelidade

Cada estabelecimento pode ter um **programa diferente**. O produto não deve ser
modelado com uma regra fixa como "10 visitas = 1 recompensa" — essa é apenas
uma configuração possível entre várias.

### Tipos de programa (conceitual — nada disso é implementado ainda)

| Tipo | Lógica | Exemplo |
| --- | --- | --- |
| `STAMP` | selos por compra/serviço específico | Cafeteria: 10 cafés → 1 café grátis |
| `VISIT` | contagem de visitas, com múltiplos degraus | Barbearia: 5 cortes → desconto; 10 cortes → corte grátis |
| `POINTS` | pontos acumulados, resgatáveis por catálogo | Loja: pontos → recompensas variadas |
| `TIER` | níveis com benefícios progressivos | Restaurante: visitas → benefícios por nível |
| `CUSTOM` | mecânica própria, definida sob personalização avançada | campanha ou regra fora dos modelos padrão |

### Abstração conceitual da entidade `PROGRAM`

```
PROGRAM
  id
  establishment_id
  type              // STAMP | VISIT | POINTS | TIER | CUSTOM
  name
  status
  rules             // parâmetros da mecânica (ex.: meta, degraus, pontos por real)
  branding          // logo, cores, textos do estabelecimento
  reward_rules      // catálogo de recompensas e condições de resgate
```

O **Cartão Digital** deve refletir visualmente a lógica escolhida — um
programa `STAMP` mostra selos, um `TIER` mostra o nível atual, etc. Nenhuma
lógica de programa foi implementada nesta etapa; `CartaoDemo.tsx` continua
ilustrando apenas um exemplo (`VISIT`, barbearia fictícia).

---

## 4. Personalização: padrão vs. avançada

### Personalização padrão (inclusa no plano de R$ 97/mês)

Baseada em **componentes e modelos reutilizáveis** — a Fidelize não constrói um
sistema novo para cada cliente:

- logo, cores e nome do estabelecimento;
- textos e recompensa;
- configuração do programa (dentro dos tipos `STAMP`/`VISIT`/`POINTS`/`TIER`);
- escolha entre modelos de cartão disponíveis;
- configuração básica de avaliação/feedback (canal principal, texto do
  pedido, ativar/desativar — ver seção 7);
- ajustes simples, suporte e acompanhamento inicial.

### Personalização avançada (sob orçamento — sem preço fixo na landing)

Qualquer pedido fora da configuração padrão:

- design totalmente exclusivo;
- mecânica de fidelidade nova (`CUSTOM`);
- campanha com lógica própria;
- integração específica;
- QR por produto;
- fluxos de avaliação/feedback muito específicos ou integrações avançadas
  (ex.: múltiplos canais externos simultâneos, categorização avançada);
- desenvolvimento sob demanda.

Refletido em `src/lib/site.ts` → `personalization` e na seção
`CampanhasEspeciais.tsx` (eyebrow "Personalização avançada"), sem valor
numérico exibido.

---

## 5. Comunicação com o cliente final

O Fidelize.club é também um canal contínuo de relacionamento — não depende
exclusivamente de WhatsApp. Canais planejados, em ordem de maturidade:

1. **Mensagens e campanhas dentro do próprio cartão** — já ilustrado na landing
   (`Campanhas.tsx`, bloco "Campanhas para você").
2. **Web Push / PWA** — só após consentimento explícito e suporte do
   dispositivo/navegador (ETAPA 11). Nunca presumir autorização.
3. **Atualizações via Google Wallet** — quando o passe suportar (ETAPA 8).
4. **Atualizações via Apple Wallet** — quando o passe suportar (ETAPA 9).

---

## 6. Campanhas: padrão vs. personalizadas

**Campanhas padrão** (incluídas na operação do programa): ponto em dobro,
recompensa liberada, retorno, aniversário, indicação, promoção da semana.

**Campanhas personalizadas** (podem ser cobradas separadamente, sob
orçamento): Black Friday, Dia das Mães, Dia dos Pais, Natal, aniversário do
estabelecimento, campanhas por produto, recuperação de clientes inativos,
campanhas sob demanda.

Regra permanente, em ambos os casos: **o proprietário sempre aprova antes de a
campanha ir ao ar.** Nenhuma campanha é publicada automaticamente no cartão do
cliente. `CampanhasEspeciais.tsx` e `Campanhas.tsx` já declaram isso em texto.

---

## 7. Avaliação, feedback e reputação (ETAPA 1.2)

### 7.1 Novo pilar do produto

O Fidelize.club não entrega apenas fidelização + recorrência + campanhas.
Também ajuda o estabelecimento com **reputação** e **feedback do cliente**.
Visão de produto (não é uma cadeia literal a expor na landing):

```
Fidelização → Recorrência → Reputação → Campanhas → Inteligência
```

### 7.2 Dois tipos de avaliação

**A) Avaliação pública externa.** O estabelecimento cadastra o link do seu
canal oficial (principal: Google Reviews / Perfil da Empresa no Google). O
Cartão Digital pode exibir um convite neutro — "Como foi sua experiência?" —
com um botão que leva ao canal configurado. A arquitetura é extensível a
outros provedores futuros (TripAdvisor, Facebook, canal específico do
segmento, canal customizado) sem mudar o modelo. Nenhuma integração real
existe nesta etapa.

**B) Feedback interno Fidelize.** Pergunta privada (ex.: nota de 1 a 5 +
comentário opcional), armazenada no Fidelize.club e exibida apenas no painel
do próprio estabelecimento. **Nunca é publicada automaticamente** no canal
externo. Alimenta, no futuro, indicadores como nota média interna, volume de
respostas, categorias, tendências, pontos positivos e pontos de atenção
(seção 7.6).

### 7.3 Experiência no Cartão Digital

Área discreta e opcional, para não poluir o cartão:

```
⭐ Conte como foi sua experiência
Sua opinião ajuda este estabelecimento a melhorar.
[ Avaliar no Google ]   [ Enviar feedback ]
```

Pode futuramente aparecer após uma visita, após uma recompensa, em momentos
configurados pelo estabelecimento, ou dentro de uma campanha — nenhuma lógica
temporal foi implementada; nesta etapa o bloco é estático e sempre visível em
`CartaoDemo.tsx`, com os dois botões **desabilitados** (`disabled`,
`aria-label` explicando que é demonstrativo). Eles não apontam para nenhuma
URL, real ou fictícia.

### 7.4 Regras de integridade (permanentes, não negociáveis)

O Fidelize.club **nunca**:

- condiciona recompensa a avaliação positiva ("ganhe 1 ponto deixando 5
  estrelas");
- pede nota específica ("avalie com 5 estrelas");
- premia somente avaliações positivas;
- impede cliente insatisfeito de acessar o canal público (sem *review
  gating*: nunca desviar quem daria nota baixa para o canal privado e só
  deixar quem daria nota alta seguir para o canal público);
- manipula ou infla nota;
- escreve avaliação em nome do cliente;
- publica comentário automaticamente sem autorização explícita do cliente.

O pedido é sempre neutro: **"Como foi sua experiência?"**, nunca **"Ganhe 1
ponto deixando 5 estrelas."** Avaliação pública é sempre independente de
recompensa. Se uma campanha futura envolver pesquisa de satisfação, deve
respeitar as políticas da plataforma externa (ex.: diretrizes do Google sobre
solicitação de avaliações) e a legislação aplicável.

### 7.5 Configuração pelo estabelecimento (futuro — Fidelize Admin / Painel)

Não implementado; documentado para a ETAPA 3/7:

- canal de avaliação principal e URL (ex.: link do Google Review);
- ativar/desativar o pedido de avaliação;
- texto do pedido, dentro de limites que preservem a neutralidade (seção 7.4);
- ativar/desativar feedback interno e sua pergunta principal;
- categorias de feedback;
- momento em que o pedido aparece.

### 7.6 Painel do estabelecimento — área conceitual "Reputação e Feedback"

Adicionada ao roadmap do painel (ETAPA 7), sem métricas reais nesta etapa:

- média de satisfação interna;
- quantidade de feedbacks;
- evolução ao longo do tempo;
- principais elogios e principais reclamações;
- taxa de resposta;
- cliques em "Avaliar no Google".

### 7.7 Entidades conceituais

Nenhuma tabela foi criada. Nomes e campos são provisórios:

```
REVIEW_CHANNEL
  id
  establishment_id
  provider          // GOOGLE | TRIPADVISOR | FACEBOOK | CUSTOM
  url
  status
  label

CUSTOMER_FEEDBACK
  id
  establishment_id
  customer_id
  membership_id
  visit_id
  rating
  comment
  created_at
  status

REVIEW_REQUEST
  id
  establishment_id
  customer_id
  visit_id
  channel_id
  requested_at
  clicked_at
  status

FEEDBACK_CATEGORY     // classificação do comentário (ex.: atendimento, preço, ambiente)
FEEDBACK_RESPONSE      // resposta do estabelecimento a um feedback interno
```

Essas entidades entram no vocabulário multi-tenant da seção 9.

### 7.8 Privacidade

Feedback interno pode conter dados pessoais e opinião sensível sobre o
atendimento. A arquitetura futura deve considerar, sem exceção:

- minimização de dados coletados;
- retenção com prazo definido por tipo de dado;
- acesso restrito (RBAC) e nunca cruzado entre estabelecimentos;
- exclusão e exportação a pedido do titular;
- trilha de auditoria sobre quem acessou ou respondeu um feedback;
- segregação multi-tenant estrita — feedback de um estabelecimento nunca é
  visível a outro.

### 7.9 Agente de IA e feedback (ver também seção 8; "Claude" só aqui, como tecnologia interna)

Quando implementado (ETAPA 13), Claude AI pode analisar feedback interno já
coletado pelo backend: resumir comentários, identificar temas e tendências,
agrupar reclamações, sugerir melhorias e campanhas relacionadas — por exemplo,
"clientes elogiam o atendimento" ou "aumentaram reclamações sobre tempo de
espera".

Claude AI **nunca**: altera uma avaliação, escreve avaliação pública em nome
do cliente, publica em nome do cliente, ou manipula reputação de qualquer
forma. Sugestão de IA é sempre um rascunho para o proprietário decidir — nunca
uma publicação automática (mesma regra da seção 6 para campanhas).

### 7.10 Diferencial comercial (uso futuro em vendas/proposta — não é headline)

> "O Fidelize.club ajuda você a trazer o cliente de volta, conhecer quem está
> comprando e facilita para seus clientes avaliarem sua empresa."

> "Fidelize clientes e fortaleça sua reputação."

### 7.11 O que mudou na landing e no cartão demonstrativo nesta etapa

- `CartaoDigital.tsx`: quarto item na lista de capacidades do cartão —
  "Também é o lugar onde o cliente avalia a experiência e envia feedback ao
  estabelecimento."
- `CartaoDemo.tsx`: novo bloco opcional (`withReview`, `true` por padrão) com
  o convite neutro e dois botões **reais, porém `disabled`** — nunca links
  funcionais, nunca apontam para um Google real ou fictício.
- Nenhuma nova seção foi criada na landing.

---

## 8. Agente de IA — camada futura de inteligência (ETAPA 13)

### 8.1 Nomenclatura (decisão da ETAPA 1.3)

Na experiência comercial, na landing e no painel do estabelecimento a
funcionalidade chama-se **"Agente de IA"** — nunca o nome do modelo ou do
fornecedor. Claude é **tecnologia de infraestrutura interna**: o
estabelecimento não precisa saber qual modelo está por trás, e a marca do
produto não deve depender comercialmente da marca de um fornecedor.

Não usar na interface: "Claude AI", "Powered by Claude", "Anthropic AI",
"Claude Agent". Esses nomes só aparecem em documentação técnica interna (como
este arquivo) quando necessário. O badge "Com Claude AI" do mockup do painel
foi removido da imagem; o destaque demonstrativo `AgenteIA.tsx` usa apenas
"Agente de IA".

### 8.2 Escopo

Não implementado. Quando existir, o Agente de IA analisa dados já coletados
pelo backend Fidelize (nunca é a fonte de dados) — incluindo feedback interno
(detalhes específicos na seção 7.9):

**Pode analisar:** frequência, recorrência, churn, clientes inativos,
recompensas, segmentos, comportamento, oportunidades, feedback.

**Pode sugerir:** público-alvo, campanha, benefício, mensagem, momento ideal,
melhorias a partir de feedback.

**Não pode:** disparar uma ação comercial sozinho, nem alterar/publicar
avaliações. O proprietário sempre aprova — a sugestão da IA é um rascunho,
nunca uma publicação automática.

---

## 9. Multi-tenancy — modelo conceitual de entidades

> **Implementado na ETAPA 2.** O vocabulário abaixo foi a base para o schema
> físico — nomes definitivos e mapeamento completo em `docs/BANCO_DE_DADOS.md`.
> `organization`→`organizations`, `card`→`customer_cards`,
> `transaction`→`loyalty_transactions`, `staff_user`→`organization_members` +
> `platform_admins`, `feedback_response`→`feedback_category_links` (o
> conceito de "resposta do estabelecimento a um feedback" ficou para quando
> o painel existir). `notification` segue conceitual (ETAPA 11, Web Push).

```
organization / establishment
program            (ver seção 3 — PROGRAM)
program_type
customer
customer_membership
card
visit
transaction
stamp
points_balance
reward
campaign
campaign_message
notification
staff_user
audit_log
wallet_pass
nfc_device
qr_token
review_channel       (ver seção 7.7)
review_request
customer_feedback
feedback_category
feedback_response
```

Requisito não negociável desde o desenho: **isolamento lógico estrito por
estabelecimento** (RLS no Supabase/PostgreSQL) — nenhuma consulta pode
retornar dado de outro tenant, mesmo com bug de aplicação. Isso vale
integralmente para `customer_feedback` e demais entidades de reputação.

---

## 10. Quatro planos de experiência do produto

Distintos entre si — não implementados nesta etapa, exceto o (D):

| Plano | Quem usa | Função |
| --- | --- | --- |
| **A) Fidelize Admin** | equipe Fidelize | cadastrar estabelecimento, escolher tipo de programa, configurar recompensa, identidade visual, campanhas, canal de avaliação e feedback, suporte (ETAPA 3) |
| **B) Painel do Estabelecimento** | proprietário/operador | acompanhar clientes, visitas, recompensas, campanhas e a área "Reputação e Feedback" (seção 7.6) (ETAPA 7) |
| **C) Cartão do Consumidor** | cliente final | cartão digital web, histórico, recompensas, avaliação/feedback (ETAPA 5) |
| **D) Site público** | visitante | landing institucional | **existe — ETAPA 1** |

O Fidelize Admin é conceitualmente diferente do Painel do Estabelecimento: um
configura o programa, o outro opera o dia a dia do negócio.

### 10.1 Modelo de acesso: Platform Admin vs. Organization Member (ETAPA 3.2.1)

A partir da ETAPA 3.2.1, o Fidelize Admin (app em `src/app/admin/`) passou a
servir os dois públicos abaixo pelo mesmo shell/rotas — a distinção entre
"quem sou eu" e "o que posso ver" é decidida inteiramente no servidor, nunca
por esconder um botão na UI.

**Platform Admin** — `public.platform_admins`, equipe Fidelize
(`FIDELIZE_SUPER_ADMIN`/`FIDELIZE_SUPPORT`, status `ACTIVE`). Identificado
pela função `is_platform_admin()` (`SECURITY DEFINER`, chamada via `rpc` —
a tabela não tem policy de `SELECT` para `authenticated`, de propósito).
Acessa a plataforma inteira: todos os estabelecimentos, sem exceção, com a
própria sessão. Nunca precisa da senha do estabelecimento.

**Organization Member** — `public.organization_members`, equipe do
estabelecimento (`OWNER`/`MANAGER`/`STAFF`, status `ACTIVE`). Identificado
por um `SELECT` direto (a tabela TEM policy `user_id = auth.uid()`, ao
contrário de `platform_admins`). Só acessa as organizações onde tem
membership ativa — reforçado tanto pela query quanto pela RLS de cada
tabela de negócio (`is_org_member(organization_id)`).

**Camada de contexto** — `src/lib/admin/context.ts`:
- `getAdminContext(supabase)`: resolve `userId`, `email`, `isPlatformAdmin`
  e a lista de `memberships` (organização + papel) do usuário autenticado.
  Retorna `null` só quando não há sessão.
- `resolveOrganizationAccess(supabase, context, organizationId)`: decide se
  aquele contexto pode administrar aquela organização específica.
  `platform_admin` pode qualquer uma; um membro de estabelecimento só a(s)
  sua(s). Organização alheia (ou inexistente) responde `404` — nunca
  confirma para quem pergunta que aquele id existe.

**Dois contextos de navegação, nunca misturados**:
- **Contexto de plataforma** (`/admin`, `/admin/estabelecimentos`,
  `/admin/configuracoes`) — só `platform_admin`; grupo de rotas
  `src/app/admin/(platform)/`. Um membro de estabelecimento que tentar
  chegar aqui é redirecionado direto para a própria organização — nunca vê
  este menu.
- **Contexto de organização** (`/admin/org/[organizationId]/...`) — o
  mesmo shell, navegação de "Visão geral / Programa / Clientes /
  Campanhas / NFC & QR / Feedback / Configurações" de uma organização por
  vez. Acessível por `platform_admin` (qualquer organização) ou por um
  Organization Member (só a(s) sua(s)). `src/app/admin/org/[organizationId]/layout.tsx`
  garante isso a cada requisição — nunca confia só na navegação renderizada.

**Acesso administrativo da Fidelize a um estabelecimento — sem
impersonação.** Um `platform_admin` entra em `/admin/estabelecimentos`
(lista real, RLS já libera `SELECT` em `organizations` pra ele), escolhe
uma organização e é levado para `/admin/org/[id]`, que mostra a faixa
"Administrando: **[nome do estabelecimento]**" com um link "← Voltar à
plataforma". Em nenhum momento a sessão Auth troca de usuário, nem a senha
do estabelecimento é usada, lida ou armazenada — é a própria sessão do
`platform_admin`, com uma URL que diz em qual organização ele está
operando. `resolveOrganizationAccess` é o único ponto que decide isso; se
o RLS de alguma tabela de negócio precisar mudar para viabilizar esse
suporte (hoje ele já cobre leitura via `is_platform_admin()` nas policies
existentes — ver `docs/BANCO_DE_DADOS.md`, seção 4), isso exige decisão e
revisão explícitas antes de qualquer alteração — nunca `USING (true)`,
nunca enfraquecer o isolamento multi-tenant.

**Auditoria (documentado, não implementado ainda)**: toda ação que um
`platform_admin` realizar dentro do contexto de uma organização deve, no
futuro, registrar em `audit_logs` — já existe, append-only, ETAPA 2 —
`actor_user_id`, `organization_id`, a ação em si, data/hora e o contexto
("platform_admin administrando organização X"). Nunca registrar senha ou
token, em nenhuma hipótese.

**Nota sobre o roadmap (seção 15)**: esta etapa adianta parte da
*infraestrutura* de acesso que originalmente seria só da ETAPA 7 (Painel do
Estabelecimento, plano B) — Organization Member já consegue entrar no
Fidelize Admin e ver seu próprio contexto. Isso não antecipa nenhuma tela
ou funcionalidade de negócio da ETAPA 7 (CRUD, campanhas, NFC, Wallet
continuam não implementados) — só o modelo de identidade e roteamento.

---

## 11. Stack desta etapa

| Camada | Escolha | Motivo |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | SEO/OG no servidor hoje; rotas dinâmicas (`/c/[token]`), Route Handlers e PWA depois, sem troca de stack |
| Linguagem | TypeScript (strict) | Contratos de dados explícitos desde o início |
| Estilo | Tailwind CSS 4 | Tokens de marca em `globals.css`, sem framework de UI |
| Imagens | `next/image` | Converte os PNGs de referência para WebP/AVIF sob demanda |
| Dependências extras | nenhuma | Sem animação, sem UI kit, sem ícones de terceiros |

**Sem** backend, banco, autenticação, pagamento ou integração externa nesta etapa.

---

## 12. Estrutura

```
src/
  app/
    layout.tsx            metadata, fontes, skip link
    page.tsx              composição da landing
    globals.css           design tokens
    opengraph-image.tsx   OG gerado no build
    robots.ts, sitemap.ts
    termos/, privacidade/ documentos (em elaboração jurídica)
  components/
    SiteHeader.tsx        client — menu mobile
    SiteFooter.tsx
    CartaoDemo.tsx        cartão digital em HTML/CSS — base visual da ETAPA 5,
                           inclui bloco demonstrativo de avaliação (seção 7.3)
    CertificadoModal.tsx  client — <dialog> nativo com a imagem original
    PaginaDocumento.tsx
    sections/             uma seção da landing por arquivo
    motion/               Reveal, ParallaxScene, TiltCard, StepsJourney,
                           AgenteIA, useInView, useReducedMotion (seção 12.1)
    ui/                   Logo, Button (CTA magnético), Section, Icons
  lib/
    site.ts               conteúdo e configuração (fonte única de texto)
    flags.ts              feature flags de canal
    supabase/
      client.ts           cliente Supabase para o navegador (não usado ainda)
      server.ts            cliente Supabase para servidor (não usado ainda)
public/
  marca/  mockups/  certificacao/
_referencias/             imagens originais de referência (fora do build)
supabase/
  config.toml            configuração do projeto (Supabase CLI)
  migrations/             schema versionado — ver docs/BANCO_DE_DADOS.md
  seed.sql                dados de demonstração para `db reset` local
```

### Por que `CartaoDemo` é HTML e não imagem

O cartão exibido na landing é a base visual do futuro cartão real em
`fidelize.club/c/[identificador-seguro]` (ETAPA 5). Renderizá-lo em HTML/CSS
mantém texto real, acessível, responsivo e reaproveitável — em vez de texto
ilegível embutido em imagem. Ele ilustra apenas **um** tipo de programa
(`VISIT`); o cartão real variará por `program.type` (seção 3). O bloco de
avaliação (seção 7.3) segue o mesmo princípio: HTML real, botões
`disabled` em vez de links falsos.

---

## 12.1 Motion design da landing (ETAPA 1.3)

Camada puramente de apresentação: **não interfere na arquitetura funcional**
(dados, flags, Supabase, rotas). Objetivo: a landing transmitir "o
Fidelize.club está funcionando diante de mim" — movimento com propósito, que
conta a jornada NFC → cadastro → cartão → fidelização → recompensa →
campanha → retorno. Nada decorativo.

**Implementação — zero dependências.** CSS (`transform`/`opacity`) +
`IntersectionObserver` + `requestAnimationFrame`. Framer Motion/GSAP foram
avaliados e descartados: nenhuma animação aqui justifica a dependência.

| Onde | O quê | Mecanismo |
| --- | --- | --- |
| Hero | Entrada curta em sequência (eyebrow → título → texto → CTAs → celular → placa); parallax por cursor em três profundidades (fundo −8px, celular 5px + rotação 1,5°, placa 9px); 3 ondas NFC na placa, uma vez | `hero-in` (CSS keyframes), `ParallaxScene` (listener no próprio elemento, rAF), `.nfc-waves` |
| Como funciona | Passos em cascata; linha violeta que avança com o scroll (horizontal no desktop, vertical no mobile) com um pulso de luz que a percorre 2×; anel único no ícone "Encosta" | `StepsJourney` (scroll listener só enquanto visível, rAF, `--progress`), `.journey-line` |
| Cartão digital | Toca a jornada uma vez: 6→10 visitas (cada selo "pop"), "Recompensa liberada!" com glow (2×), campanha chega como notificação com badge "Nova", avaliação aparece por último | `CartaoDemo` (client, timers com cleanup) |
| Campanhas | Cards entram como notificação (deslizam da direita, em cascata) | `Reveal variant="notify" stagger` |
| Painel | Chips em cascata → imagem com profundidade → "Analisando recorrência…" → insight do Agente de IA | `Reveal`, `AgenteIA` |
| Segmentos | Hover: sobe 4px, ícone ×1,12, glow violeta — só com `(hover: hover)` | CSS |
| Kit | Inclinação 3D ≤2,5° seguindo o cursor; a imagem não muda | `TiltCard` |
| Preço | Elevação + glow ao entrar em vista | `.price-card[data-inview]` |
| CTAs | Magnético (conteúdo acompanha o cursor até 3px), brilho no hover, escala 0,97 no clique | `Button.tsx` (`useMagnetic`) |
| Header | Compacta e ganha sombra leve ao rolar; navegação inteira permanece | `SiteHeader` |
| Segurança / certificado | Só revelação suave. Nada gira, flutua ou brilha; a imagem do certificado nunca é animada | `Reveal` |

**Reduced motion (`prefers-reduced-motion: reduce`) — obrigatório.** CSS força
`opacity: 1` / `transform: none` em todo elemento revelável; hero, parallax,
tilt, magnetismo, ondas NFC, pulso da linha e shimmer do Agente são
desligados; o cartão fica no estado estático aprovado (6 de 10) com todos os
blocos visíveis; o Agente mostra o insight direto. `useReducedMotion` usa
`useSyncExternalStore` com snapshot de servidor `true` — o HTML inicial sai
sem nada oculto.

**Sem JavaScript.** Estados iniciais ocultos existem apenas sob
`html[data-js]` (script inline no `layout.tsx`). Sem JS, tudo é visível.

**Mobile / touch.** Parallax, tilt e magnetismo só existem com
`(hover: hover) and (pointer: fine)`. Ficam: entradas, cascatas, cartão,
campanha, recompensa, linha vertical da jornada.

**Performance.** Só `transform`/`opacity`; nenhum listener global de mouse
(cada efeito escuta no próprio elemento); scroll listener apenas em
`StepsJourney`, ativo só com a seção visível, passivo e throttled por rAF;
todos os listeners/timers são removidos no cleanup; nenhuma animação
infinita (ondas 3×, pulso 2×, glow 2×; o shimmer do Agente dura 1,7 s e o
elemento é removido).

**Acessibilidade.** Nenhuma informação depende de animação; `aria-live`
polite na recompensa e no insight do Agente; botões demonstrativos continuam
`disabled` com `aria-label`; foco visível e teclado inalterados.

---

## 13. Regras de conteúdo (aplicadas e permanentes)

- Sem métricas, depoimentos, clientes, parceiros ou certificações inventadas.
- Dados de mockup pertencem a um estabelecimento **fictício** e estão sempre
  rotulados como demonstração na interface.
- A certificação **ISO/IEC 27001:2022 Information Security Associate™ (SkillFront)**
  pertence ao **responsável técnico**, não à empresa. A imagem exibida é o arquivo
  original, servido sem reencodificação (`unoptimized`). Não recriar, redesenhar,
  recortar nem gerar selo ISO artificial.
- LGPD é citada como princípio e requisito de conformidade — nunca como auditoria
  concluída.
- Sem links para redes sociais enquanto não houver URLs reais confirmadas.
- Nenhuma funcionalidade ainda não implementada é apresentada como ativa em
  produção (Wallets, painel funcional, avaliação real, IA, Web Push).
- Personalização avançada e campanhas personalizadas nunca exibem preço fixo
  ("sob orçamento").
- Pedidos de avaliação são sempre neutros (seção 7.4): nunca condicionam
  recompensa a nota positiva, nunca fazem *review gating*, nunca publicam em
  nome do cliente. Botões de avaliação/feedback na landing e no cartão
  demonstrativo são sempre não funcionais (`disabled`), nunca links reais ou
  fictícios.

---

## 14. Referências de UX (benchmark — não copiar)

Usadas apenas como parâmetro de qualidade de produto, nunca como fonte de
layout, texto, código ou identidade visual:

- **Highlightcards** — referência de limpeza visual, clareza de cartões e
  experiência do usuário.
- **PunchPass** — referência de simplicidade comercial e proposta de valor direta.
- **Fidelize.club** — identidade própria (roxo/violeta/branco) e estratégia de
  atendimento acompanhado (seção 1), que nenhum dos benchmarks acima oferece.

---

## 15. Roadmap

| Etapa | Escopo | Situação |
| --- | --- | --- |
| 1 | Landing pública | **concluída** |
| 1.1 | Revisão conceitual (produto assistido, tipos de programa, personalização, multi-tenancy conceitual) | **concluída** |
| 1.2 | Avaliação, feedback e reputação (conceitual) | **concluída** |
| 1.3 | Refinamento premium + motion design + nomenclatura "Agente de IA" (seções 8.1 e 12.1) | **concluída** |
| 2 | Supabase + multi-tenant + RLS (fundação de schema) | **concluída** — ver `docs/BANCO_DE_DADOS.md`. Autenticação funcional (login, telas, middleware) ainda não existe |
| 3 | Fidelize Admin (plano A, seção 10) — login, shell visual e modelo de acesso Platform Admin/Organization Member (seção 10.1) | **em andamento**: 3.1 (auth) e 3.2/3.2.1 (shell + contexto) concluídas; CRUD/telas de negócio ainda não |
| 4 | Cadastro do consumidor | — (proposta de arquitetura registrada em `docs/BANCO_DE_DADOS.md`, seção 6.1 — token de entrada público + `enroll_customer`, nada implementado) |
| 5 | Cartão Digital Web / PWA (`/c/[token]`) | **em andamento**: 4.0 (UI completa, todos os estados) e 4.0.1 (backend público seguro — `get_public_card`/`submit_card_feedback`, RLS intocada) concluídas; motor de fidelidade real, resgate funcional e cadastro público ainda não |
| 6 | Motor de fidelidade (visitas, pontos, recompensas, por `program.type`) | — |
| 7 | Painel do estabelecimento (plano B, seção 10, inclui Reputação e Feedback) — infraestrutura de acesso (Organization Member) já adiantada na ETAPA 3.2.1, seção 10.1; telas/CRUD de negócio continuam aqui | — |
| 8 | Google Wallet | — |
| 9 | Apple Wallet | — |
| 10 | NFC + QR + antifraude | — |
| 11 | Notificações Web Push | — |
| 12 | Avaliação pública + feedback interno (implementação real, seção 7) | — |
| 13 | Claude AI (camada de sugestão, seção 8) | — |
| 14 | Campanhas avançadas | — |

A ordem pode ser ajustada conforme dependências técnicas. Nenhuma etapa avança
sem autorização explícita.

---

## 16. Requisitos de segurança das próximas etapas

### 16.1 Dados e acesso (ETAPA 2 — implementado)

- PostgreSQL via Supabase; **RLS habilitado em toda tabela** — feito em
  `supabase/migrations/..._rls_policies.sql`. Ver matriz completa em
  `docs/BANCO_DE_DADOS.md`, seção 4.
- Multi-tenancy com segregação estrita entre estabelecimentos: nenhuma consulta
  pode retornar dados de outro tenant, mesmo com bug de aplicação. Reforçado
  por triggers de integridade (`check_location_belongs_to_org`,
  `check_membership_program_org`), não só por RLS.
- RBAC: `platform_admins` (`FIDELIZE_SUPER_ADMIN`/`FIDELIZE_SUPPORT`) separado
  de `organization_members` (`OWNER`/`MANAGER`/`STAFF` — seção 10A).
- `service_role` **jamais** no frontend. `src/lib/supabase/server.ts` e
  `client.ts` usam só a chave `anon`; `.env.example` documenta a
  `SUPABASE_SERVICE_ROLE_KEY` como server-only e não a utiliza em nenhum
  código nesta etapa.
- `audit_logs` criada e append-only (trigger bloqueia UPDATE/DELETE). Ainda
  sem nenhum ponto do código escrevendo nela — entra junto com a
  funcionalidade que precisar de auditoria (ETAPA 6+).
- Escrita (INSERT/UPDATE) nas tabelas de negócio ainda não é liberada por RLS
  para `authenticated` — só `service_role`, até a etapa que implementa cada
  fluxo. Ver `docs/BANCO_DE_DADOS.md`, seção 5, para as exceções que exigem
  atenção (`customers`, `nfc_devices`, `qr_tokens`, `customer_cards`).

### 16.1.1 Web Card público (ETAPA 4.0.1)

O único acesso sem login do produto (`/c/[token]`) não abriu nenhuma
policy de RLS nova. `public.get_public_card` e `public.submit_card_feedback`
(`SECURITY DEFINER`, `search_path` fixo, `REVOKE ALL FROM PUBLIC` +
`GRANT EXECUTE` só para `anon`/`authenticated`) resolvem tudo a partir do
`public_token` de `customer_cards` — nunca aceitam
`organization_id`/`customer_id`/`membership_id` do chamador. Detalhamento
completo (campos expostos, por que `SECURITY DEFINER`, proteção contra
abuso do feedback, e a proposta ainda não implementada de token de
entrada para cadastro público) em `docs/BANCO_DE_DADOS.md`, seção 6.1.

### 16.2 NFC e QR (ETAPA 10)

**A tag NFC não pode conter uma URL que, sozinha, credita ponto.**
Copiar a URL da placa não pode significar pontos infinitos.

A validação acontece no backend e considera, no mínimo:

- estabelecimento e cliente identificados;
- token de sessão com validade curta e uso único;
- frequência e janela mínima entre visitas;
- detecção de duplicidade;
- regras antifraude por estabelecimento (limites diários, horário de funcionamento);
- regras do `program.type` ativo (ex.: um `STAMP` não credita duas vezes na
  mesma compra);
- rastro de auditoria para contestação.

O motor antifraude **não** foi implementado — este item é o registro formal do
requisito. NFC e QR são tratados como **canais de entrada**, nunca como fonte
de verdade do saldo de pontos/visitas.

**Decisão (ETAPA 4.0.1): `qr_tokens`/`nfc_devices` nunca servem de token de
cadastro público.** Carregam segredo (`token`/`secret_hash`), são
restritos a `platform_admin`, e o modelo (`checkin_events`) pressupõe um
cliente que já existe. Um mecanismo de entrada para consumidor novo
precisa de um token público **próprio**, sem segredo — proposta completa
em `docs/BANCO_DE_DADOS.md`, seção 6.1.

### 16.3 Privacidade (LGPD)

- Consentimento explícito no cadastro do consumidor, com finalidade declarada.
- Web Push só após permissão do usuário **e** suporte do dispositivo/navegador.
  Nunca presumir autorização.
- Direitos do titular: acesso, correção, exportação e exclusão de dados.
- Políticas de retenção definidas por tipo de dado.
- Campanha comercial nunca é disparada automaticamente — nem por um humano sem
  aprovação do proprietário, nem por sugestão de IA (seção 8).

### 16.4 Privacidade do feedback (ETAPA 12)

Ver seção 7.8 para o detalhamento completo. Resumo: minimização de dados,
retenção definida, acesso restrito por RBAC, exclusão/exportação a pedido do
titular, trilha de auditoria, e segregação multi-tenant estrita — feedback de
um estabelecimento nunca é exposto a outro.

---

## 17. Contato comercial

`src/lib/site.ts` expõe `contact = { email, whatsapp }`, ambos `null` por padrão.
Enquanto estiverem nulos, os CTAs apontam para a seção de planos — link real e
funcional. Ao preencher qualquer um dos dois, todos os CTAs passam a usá-lo
automaticamente via `commercialHref()`.
