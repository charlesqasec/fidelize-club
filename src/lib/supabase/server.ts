import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para uso no servidor (Server Components, Route Handlers,
 * Server Actions). Usa a chave `anon` + cookies da sessão — RLS continua
 * valendo normalmente.
 *
 * Nunca usar a `service_role` aqui. Uma chave `service_role` (quando
 * necessária, ex.: seed/admin scripts) deve ficar em uma variável de
 * ambiente só de servidor, nunca prefixada com `NEXT_PUBLIC_`, e nunca
 * importada por código que também roda no navegador.
 *
 * Tipado com `Database` (`src/types/database.types.ts`, gerado por
 * `npx supabase gen types typescript --linked` — ver docs/BANCO_DE_DADOS.md).
 *
 * Ainda não é chamado por nenhuma rota — ver docs/ARQUITETURA.md, seção 16.1.
 * O refresh de sessão em Server Components não consegue gravar cookies (ver
 * catch abaixo); por isso `src/proxy.ts` existe: sem ele, um token renovado
 * durante uma Server Action ou Route Handler nunca seria persistido de volta
 * no cookie, causando logout precoce (aviso da própria @supabase/ssr).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component sem permissão de
            // escrita de cookies — inofensivo se a sessão for renovada
            // pelo middleware (a ser criado quando a autenticação real
            // for implementada).
          }
        },
      },
    },
  );
}
