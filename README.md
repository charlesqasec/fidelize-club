# Fidelize.club

Plataforma de fidelização e recorrência para negócios locais.

**Etapa atual: 1.3 — Refinamento Premium e Motion Design.** A landing
aprovada ganhou motion com propósito (hero com parallax, jornada em "Como
funciona", cartão que toca a sequência visitas → recompensa → campanha →
avaliação, Agente de IA no painel) sem nenhuma dependência nova, respeitando
`prefers-reduced-motion`. A nomenclatura comercial da IA passou a ser
**"Agente de IA"**. A fundação de schema Supabase (ETAPA 2) já existe em
`supabase/migrations/`, mas nenhuma página lê o banco — sem autenticação
funcional, painel, cartão funcional, Wallet, pagamentos ou integrações.

## Rodar

```bash
npm install
npm run dev
```

http://localhost:3000

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servir o build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Checagem de tipos |

## Onde mexer

- **Textos, preço, segmentos, contato:** `src/lib/site.ts`
- **Disponibilidade das carteiras digitais:** `src/lib/flags.ts`
- **Cores e tipografia:** `src/app/globals.css`
- **Motion (durações, variantes de reveal, reduced motion):** bloco "Motion"
  em `src/app/globals.css` + `src/components/motion/` — ver
  `docs/ARQUITETURA.md`, seção 12.1
- **Seções da landing:** `src/components/sections/`
- **Schema do banco:** `supabase/migrations/` — ver `docs/BANCO_DE_DADOS.md`
- **Clientes Supabase (ainda não usados por nenhuma página):**
  `src/lib/supabase/client.ts` (navegador) e `server.ts` (servidor)

## Banco de dados (Supabase)

```bash
npx supabase start     # Postgres + Studio local — requer Docker
npx supabase db reset   # aplica migrations + supabase/seed.sql (dados demo)
```

Copie `.env.example` para `.env.local` e preencha com a URL/anon key do seu
projeto (local via `npx supabase status`, ou de um projeto Supabase real).
Detalhes completos — mapa de entidades, decisões de modelagem, matriz de RLS
e pendências — em [`docs/BANCO_DE_DADOS.md`](docs/BANCO_DE_DADOS.md).

## Contato comercial

`contact.email` e `contact.whatsapp` em `src/lib/site.ts` estão `null`.
Enquanto isso, os CTAs apontam para a seção de planos. Preencha um dos dois para
que todos os botões passem a usá-lo.

## Arquitetura e próximas etapas

Ver [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — inclui o modelo de produto
assistido (tecnologia + implantação + acompanhamento), a abstração conceitual
de tipos de programa (`STAMP`/`VISIT`/`POINTS`/`TIER`/`CUSTOM`), personalização
padrão vs. avançada, o módulo de **avaliação, feedback e reputação** (canal
público extensível tipo Google Reviews + feedback interno privado, com regras
de integridade contra review gating e recompensa condicionada a nota), o
vocabulário de entidades multi-tenant e o roteiro completo até a ETAPA 14. O
schema físico da ETAPA 2 já existe (`supabase/migrations/`) — o restante
(ETAPA 3 em diante) continua só documentado, não implementado.

## Pastas de referência

`_referencias/` guarda as imagens originais do projeto (mockups, brand board,
painel, certificado). Ficam fora do build; os recortes usados no site estão em
`public/`.
