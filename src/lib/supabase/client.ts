import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para uso no navegador (Client Components).
 *
 * Usa apenas a chave `anon` — toda leitura/escrita passa por RLS. Ainda não
 * é chamado por nenhuma página (ETAPA 2 é só a fundação de schema).
 *
 * Tipado com `Database` (`src/types/database.types.ts`, gerado por
 * `npx supabase gen types typescript --linked` — ver docs/BANCO_DE_DADOS.md).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
