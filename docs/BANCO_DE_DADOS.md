# Fidelize.club — Banco de dados (ETAPA 2)

> Fundação de schema: Supabase/PostgreSQL, multi-tenant, RLS, sem
> autenticação funcional, sem cartão/painel/Wallet funcionando. Ver
> `docs/ARQUITETURA.md` para a visão de produto por trás de cada entidade.

---

## 1. Como rodar localmente

Requer [Docker](https://docs.docker.com/get-docker/) (o Postgres local do
Supabase CLI roda em container — não instalado neste ambiente de
desenvolvimento, por isso as migrations abaixo **não foram executadas contra
um Postgres real**, apenas escritas e revisadas manualmente).

```bash
npx supabase start        # sobe Postgres + Studio local (precisa Docker)
npx supabase db reset      # aplica todas as migrations + supabase/seed.sql
npx supabase status        # mostra URLs e chaves locais (anon, service_role)
```

Copie a `anon key` e a URL da API mostradas por `supabase status` para
`.env.local` (ver `.env.example`).

Para um projeto Supabase real (cloud):

```bash
npx supabase link --project-ref <seu-project-ref>
npx supabase db push        # aplica as migrations no projeto remoto
```

`supabase/seed.sql` só roda em `db reset` (ambiente local) — nunca é
aplicado automaticamente em produção.

---

## 2. Mapa de entidades

```
organizations ──< locations
organizations ──< organization_members >── auth.users
organizations ──< organization_feature_flags (1:1)
platform_admins >── auth.users                    (equipe Fidelize, separado de organization_members)
platform_settings                                  (singleton — kill-switch global)

organizations ──< loyalty_programs ──< program_branding (1:1)
loyalty_programs ──< rewards ──< reward_redemptions

customers (global) ──< customer_memberships >── organizations, loyalty_programs
customer_memberships ──< loyalty_transactions      (ledger imutável)
customer_memberships ──< customer_cards (1:1)
customer_memberships ──< wallet_passes
customer_memberships ──< reward_redemptions

locations ──< nfc_devices
locations ──< qr_tokens
organizations ──< checkin_events >── nfc_devices, qr_tokens, customer_memberships
checkin_events ── resulting_transaction_id ──> loyalty_transactions

organizations ──< campaigns ──< campaign_messages
organizations ──< review_channels ──< review_requests
organizations ──< customer_feedback >── customer_memberships
customer_feedback ──< feedback_category_links >── feedback_categories

customers ──< customer_consents >── organizations
organizations ──< audit_logs (organization_id nullable)
```

`>──` = muitos-para-um · `──<` = um-para-muitos · `(1:1)` = um-para-um

---

## 3. Decisões que exigem contexto (resumo — detalhes em cada migration)

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Organização vs. unidade | `organizations` ≠ `locations` desde o início | Evita remodelar quando o primeiro cliente abrir a segunda unidade |
| Papéis de plataforma vs. organização | `platform_admins` separado de `organization_members` | Equipe Fidelize e equipe do estabelecimento são conceitos diferentes (docs/ARQUITETURA.md, seção 10) |
| Branding do programa | Colunas normalizadas (`program_branding`) | Campos fixos, sempre os mesmos, editados por formulário — JSONB não ajudaria |
| Regras do programa | JSONB (`loyalty_programs.rules`) | Mecânica varia por `type` (STAMP/VISIT/POINTS/TIER/CUSTOM) — formato do JSON difere por tipo |
| Saldo do cliente | Materializado em `customer_memberships`, escrito **só** pelo trigger do ledger | Leitura rápida + auditável (nunca diverge do histórico) |
| Visita | `checkin_events` (tentativa) → gera `loyalty_transactions` (efeito) só se aceita | Permite rejeitar fraude sem contaminar o saldo, e reportar tentativas separadamente de visitas reais |
| Ledger | `loyalty_transactions` é append-only (trigger bloqueia UPDATE/DELETE) | Correção = nova linha `REVERSAL`/`ADJUSTMENT`, nunca edição do passado |
| Token do cartão | `customer_cards.public_token`: 24 bytes aleatórios em hex, **sem policy de leitura pública** | Evita enumeração; acesso futuro via function dedicada (ETAPA 5), não RLS direto |
| Flags de canal | Dois níveis: `platform_settings` (kill-switch global) × `organization_feature_flags` (por organização) | Efetivo = `platform.X AND organization.X` — organização só liga o que a plataforma permite |
| Aprovação de campanha | `CHECK` constraint em `campaigns` impede status `APPROVED`/`ACTIVE` sem `approved_by`/`approved_at` | Regra "nunca automática" garantida pelo banco, não só pela aplicação |

---

## 4. RLS — o que cada papel pode fazer hoje

Postura desta etapa: **RLS habilitado em tudo; a maioria das tabelas só tem
policy de `SELECT`**. Sem policy de `INSERT`/`UPDATE`/`DELETE` para
`authenticated`/`anon` = comando negado por padrão em Postgres. Escrita, por
enquanto, só via `service_role` (bypassa RLS), usado em scripts/seed — não em
nenhuma rota da aplicação ainda.

| Tabela | `SELECT` liberado para | Observação |
| --- | --- | --- |
| `profiles` | o próprio usuário + `platform_admin` | `UPDATE` liberado só para o próprio usuário |
| `organizations`, `locations`, `organization_feature_flags`, `loyalty_programs`, `program_branding`, `customer_memberships`, `checkin_events`, `loyalty_transactions`, `rewards`, `reward_redemptions`, `campaigns`, `campaign_messages`, `review_channels`, `review_requests`, `customer_feedback`, `customer_consents` | membros ativos da organização (`is_org_member`) + `platform_admin` | Nenhuma escrita liberada por RLS ainda |
| `organization_members` | o próprio vínculo + membros da mesma organização + `platform_admin` | — |
| `audit_logs` | membros da própria organização + `platform_admin` | Nunca escrito por `authenticated`/`anon` |
| `feedback_categories` | qualquer autenticado (categorias padrão) + membros da organização (categorias próprias) | Baixa sensibilidade |
| `customers`, `nfc_devices`, `qr_tokens`, `customer_cards`, `platform_admins`, `platform_settings` | **só `platform_admin`** (ou ninguém, no caso de `platform_admins`) | Ver seção 5 — risco sinalizado |

---

## 5. Decisões conservadoras que precisam da sua ciência

1. **`customers` não tem policy de leitura para a equipe do estabelecimento.**
   É uma entidade global (um cliente pode ter memberships em várias
   organizações) — não dá para filtrar por tenant com uma coluna simples.
   O painel (ETAPA 7) vai precisar de uma function/view que cruze com
   `customer_memberships` e devolva só os clientes daquela organização.
   Enquanto isso não existir, a tabela fica travada mesmo para o dono do
   negócio.
2. **`nfc_devices` e `qr_tokens` ficam restritos a `platform_admin`.** Eles
   carregam `secret_hash`/`token`. RLS é por linha, não por coluna — expor a
   tabela ao estabelecimento exigiria uma view sem essas colunas, que não foi
   criada nesta etapa para não construir UI antes da hora.
3. ~~`customer_cards` não tem nenhuma policy de leitura pública.~~
   **Resolvido na ETAPA 4.0.1**: `customer_cards` continua SEM nenhuma
   policy de SELECT para `anon` (e nenhuma tabela da qual o Web Card
   depende ganhou uma) — o acesso por `public_token` é servido pela
   function `SECURITY DEFINER` `public.get_public_card`, exatamente como
   planejado aqui. Ver seção 6.1 para o detalhamento completo (campos
   expostos, por que SECURITY DEFINER, proteção contra abuso).
4. **O trigger `apply_loyalty_transaction` é um sincronizador simples, não o
   motor de fidelidade.** Ele mantém saldo e ledger consistentes, mas não
   conhece regras por tipo de programa, threshold de recompensa ou lógica de
   nível — isso é a ETAPA 6.
5. **Nenhum usuário é criado no seed.** `supabase/seed.sql` popula só dados
   de negócio (organização, programa, cliente fictícios) — nada em
   `auth.users`/`organization_members`, porque autenticação está fora do
   escopo desta etapa.

---

## 6. Migrations

Em `supabase/migrations/`, aplicadas em ordem:

| Arquivo | Conteúdo |
| --- | --- |
| `..._extensions_and_helpers` | `pgcrypto`; funções `set_updated_at`, `forbid_mutation`, `check_location_belongs_to_org` |
| `..._platform_and_organizations` | `profiles` (+ trigger em `auth.users`), `platform_admins`, `organizations`, `locations`, `organization_members`, funções `is_platform_admin`/`is_org_member`/`org_role`, `platform_settings`, `organization_feature_flags` |
| `..._loyalty_programs` | `loyalty_programs`, `program_branding` |
| `..._customers_and_memberships` | `customers`, `customer_memberships` |
| `..._nfc_and_qr` | `nfc_devices`, `qr_tokens` |
| `..._checkin_and_ledger` | `checkin_events`, `loyalty_transactions`, trigger `apply_loyalty_transaction` |
| `..._rewards` | `rewards`, `reward_redemptions` |
| `..._cards_and_wallet` | `customer_cards`, `wallet_passes` |
| `..._campaigns` | `campaigns`, `campaign_messages` |
| `..._reviews_and_feedback` | `review_channels`, `review_requests`, `customer_feedback`, `feedback_categories`, `feedback_category_links` |
| `..._consent_and_audit` | `customer_consents`, `audit_logs` |
| `..._rls_policies` | Todas as `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` |
| `..._public_web_card_functions` | `public.get_public_card`, `public.submit_card_feedback` (ETAPA 4.0.1 — ver seção 6.1) |
| `..._submit_card_feedback_comment_limit` | Ajusta `submit_card_feedback`: comentário acima de 1000 caracteres passa a ser **rejeitado**, não truncado |

`supabase/seed.sql` roda por último, só em `db reset` local.

---

## 6.1 Funções públicas do Web Card (ETAPA 4.0.1)

O Web Card (`/c/[token]`, ETAPA 4.0) é a única superfície pública (sem
login) do produto. Nenhuma tabela da qual ele depende — `customer_cards`,
`customer_memberships`, `customers`, `loyalty_programs`, `program_branding`,
`rewards`, `campaigns`, `campaign_messages`, `review_channels`,
`customer_feedback`, `organization_feature_flags` — ganhou policy de
`SELECT`/`INSERT` para `anon` (nem para `authenticated`, fora do que já
existia). A postura da seção 4 continua exatamente a mesma. Em vez disso,
duas functions `SECURITY DEFINER` são a única porta de entrada:

**`public.get_public_card(p_token text) returns jsonb`** — resolve
`customer_cards` por `public_token` (índice único, sempre um lookup exato)
e devolve só o necessário para renderizar o cartão:

| Campo devolvido | Nunca devolvido |
| --- | --- |
| Nome do estabelecimento e do programa | e-mail/telefone do cliente |
| Tipo/status/regras do programa | `secret_hash`, `qr_tokens.token` |
| Branding (cores, headline, logo) | qualquer UUID interno além do necessário para renderizar |
| **Só o primeiro nome** do cliente | `organization_members`, `profiles`, `audit_logs` |
| Saldo (pontos/selos/visitas), status da adesão | dado de qualquer outra organização/membership |
| Recompensas `ACTIVE` do programa | campanha `DRAFT`/`PENDING_APPROVAL` |
| Campanhas `ACTIVE` aprovadas, mensagem `WEB_CARD` | — |
| Canal de avaliação (label + URL), só se `reviews_enabled` | — |
| `feedbackEnabled` (reflete `internal_feedback_enabled`) | — |

Retorna `null` (token não corresponde a nada), `{outcome:"card_inactive"}`
(cartão revogado) ou `{outcome:"program_inactive"}` (programa
arquivado/rascunho, ou organização suspensa/cancelada) antes de chegar a
`{outcome:"ok", card:{...}}` — nunca `SELECT *`, sempre os campos
nomeados acima.

**`public.submit_card_feedback(p_token text, p_rating integer, p_comment text default null) returns jsonb`**
— resolve `organization_id`/`membership_id` a partir do token
internamente (nunca aceita esses ids como parâmetro), valida `rating`
1–5, rejeita comentário acima de 1000 caracteres, e insere em
`customer_feedback`. Proteção contra abuso: no máximo 3 envios por cartão
a cada 24h, calculada sobre `customer_feedback.created_at` já existente —
**não** é rate limiting por IP/dispositivo (isso exigiria infraestrutura
de borda — Cloudflare, proxy — fora do escopo desta etapa; registrado
aqui como limitação conhecida, não resolvida).

**Por que `SECURITY DEFINER`**: as duas functions rodam com os
privilégios de quem as criou, não do chamador `anon` — é assim que
conseguem ler/escrever tabelas sem nenhuma policy liberando isso para
`anon`. A segurança não vem de RLS aqui: vem inteiramente da lógica
interna (nunca aceitar `organization_id`/`customer_id`/`membership_id` do
chamador; resolver tudo a partir do token; `set search_path = public`
fixo, mesma convenção de `is_platform_admin()`/`apply_loyalty_transaction()`;
nenhum SQL dinâmico). `REVOKE ALL ... FROM PUBLIC` seguido de
`GRANT EXECUTE TO anon, authenticated` em ambas — Postgres concede
`EXECUTE` a `PUBLIC` por padrão em toda function nova, diferente de
tabela.

**Token (`customer_cards.public_token`)**: `encode(gen_random_bytes(24), 'hex')`
— 24 bytes aleatórios de `pgcrypto`, 192 bits de entropia, sempre 48
caracteres hex minúsculos, `UNIQUE`, não sequencial. Validado (formato
exato) tanto em `src/lib/card/getPublicCard.ts` quanto dentro da própria
function — nunca só no cliente. Testado nesta etapa: token alterado em 1
caractere não retorna dado nenhum (nem parcial); enumeração por força
bruta é impraticável (espaço de 2¹⁹² valores). Nenhum problema de
entropia/geração foi encontrado.

**Cadastro público (consumidor novo) — NÃO implementado.**
`/c/[token]` só resolve `customer_cards.public_token`, ou seja, só serve
quem **já é cliente**. Não existe, no schema atual, um token público de
"entrada"/inscrição que aponte para um estabelecimento ou programa antes
de existir uma adesão: `qr_tokens`/`nfc_devices` foram avaliados e
descartados para esse papel — carregam segredo (`secret_hash`/`token`),
são restritos a `platform_admin`, e são modelados para gerar
`checkin_events` (visita de quem já é cliente, ETAPA 6/10), não para
apresentar "cadastre-se no estabelecimento X" a um visitante anônimo.
Confundir os dois tokens seria misturar autenticação de canal público com
credencial de check-in — exatamente o que a ETAPA 4.0.1 foi instruída a
não fazer.

Proposta para uma etapa futura decidir (nenhuma parte implementada aqui):

- Um token público **novo e distinto**, ex.: `loyalty_programs.public_join_token`
  (mesma convenção de `customer_cards.public_token` — hex aleatório,
  `UNIQUE`, sem segredo nenhum atrelado) ou uma entidade própria
  (`program_entry_tokens`), pensado para ficar impresso/gravado num
  NFC/QR físico e ser **visto por qualquer pessoa** que passe pelo balcão
  — ao contrário de `qr_tokens.token`, este token não precisa (nem deve)
  ser secreto, porque sozinho ele nunca credita ponto/visita, só abre uma
  tela de apresentação do programa.
- Uma function companheira, ex. `public.get_program_entry(p_token text)`,
  simétrica a `get_public_card`: resolve nome do estabelecimento,
  programa e branding a partir do token de entrada — nunca dado de
  cliente nenhum.
- `public.enroll_customer(p_entry_token text, p_name text, p_contact text, p_consent boolean)`
  `SECURITY DEFINER`, criando `customers`/`customer_memberships`/
  `customer_cards` numa única transação, capturando
  `customer_consents` (LGPD, nunca presumido) e devolvendo o
  `public_token` do cartão recém-criado.
- Riscos a decidir antes de implementar: um token de entrada público e
  fisicamente exposto pode ser fotografado/compartilhado — não é
  segredo, mas precisa de alguma defesa contra um script criando
  centenas de cadastros falsos sob o mesmo token (CAPTCHA, limite por
  IP/janela de tempo, ou confirmação por e-mail/SMS antes do cartão
  "valer"). Nenhuma dessas defesas foi desenhada ainda.
- Impacto em NFC/QR: nenhum. `qr_tokens`/`nfc_devices` continuam
  exclusivamente ligados ao check-in de quem já tem `customer_cards`
  (ETAPA 6/10) — o token de entrada proposto acima é uma peça nova,
  paralela, não uma reforma do que já existe.

`src/components/card/SignupCard.tsx` (ETAPA 4.0) já existe como tela
pronta para este fluxo — puramente apresentacional, não ligada a nenhuma
rota real, esperando exatamente esta decisão.

---

## 7. Pendências para conectar um projeto Supabase real

1. ~~Criar o projeto em [supabase.com](https://supabase.com)~~ — feito:
   `fidelize-club-dev` (ref `pqekwysceylbpulczknk`).
2. ~~`npx supabase link` e `npx supabase db push`~~ — feito: as 12 migrations
   estão aplicadas no remoto e validadas (RLS, multi-tenancy, ledger,
   check-in, campanha — ver `git log`/histórico da ETAPA 2.3 para o
   detalhamento dos 51 checks).
3. Preencher `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API) — **ainda
   pendente**: nenhum `.env.local` existe neste ambiente. `npm run build`
   passa mesmo assim porque nenhuma página chama os clients Supabase ainda;
   isso deixará de ser verdade assim que alguma rota os importar.
4. ~~Rodar `npx supabase gen types typescript --linked`~~ — feito nesta etapa
   (2.4), ver seção 8 abaixo.
5. Nenhuma linha em `auth.users` existe por padrão em produção — criar um
   usuário via Supabase Auth e inserir manualmente em
   `organization_members`/`platform_admins` para testar as policies (a
   ETAPA 2.3 fez isso com usuários de teste descartáveis, só para validar
   RLS via SQL).

---

## 8. Auth — infraestrutura preparada (ETAPA 2.4)

Postura desta etapa: só a **infraestrutura de fiação** entre Next.js e
Supabase Auth — nenhuma interface de login, nenhuma rota protegida, nenhuma
policy de escrita nova. RLS não foi alterado.

- **Types oficiais**: `src/types/database.types.ts`, gerado por
  `npx supabase gen types typescript --linked` a partir do schema remoto
  (fonte de verdade — nunca editar à mão; regerar sempre que uma migration
  mudar o schema).
- **`src/lib/supabase/client.ts`** e **`src/lib/supabase/server.ts`**: ambos
  agora tipados com `createBrowserClient<Database>()` /
  `createServerClient<Database>()`. Continuam usando só a chave `anon` —
  nunca `service_role` no código que roda no navegador ou em Server
  Components/Actions.
- **`src/proxy.ts`** (novo): mantém a sessão do Supabase Auth sincronizada a
  cada requisição, renovando o cookie quando o access token expira. No
  Next.js 16 `middleware.ts` foi renomeado para `proxy.ts` (mesmo
  comportamento, nome novo — ver
  `node_modules/next/dist/docs/.../file-conventions/proxy.md`). Sem essa
  peça, a própria `@supabase/ssr` avisa que a sessão pode ser perdida
  silenciosamente, porque Server Components não conseguem gravar cookies
  (ver comentário em `server.ts`). Ainda não faz nenhum controle de
  acesso/redirecionamento — só o refresh do token.

### Limitações atuais

- Sem página `/login`, sem painel, sem Admin — nada disso foi criado.
- Sem policy de `INSERT`/`UPDATE`/`DELETE` nova — a postura "só `SELECT`"
  descrita na seção 4 continua exatamente a mesma.
- `src/proxy.ts` não protege nenhuma rota (não há `redirect` nele); ele só
  garante que, quando login existir, o cookie de sessão não morra sozinho.
- `.env.local` continua sem existir neste ambiente (item 3 da seção 7) — a
  infraestrutura está pronta para receber credenciais reais, mas não foi
  testada contra uma sessão de usuário de verdade (isso exige a UI de login
  da próxima etapa).
