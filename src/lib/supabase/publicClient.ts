import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para a experiência PÚBLICA do consumidor (`/c/[token]`).
 *
 * Deliberadamente diferente de `src/lib/supabase/server.ts`: aquele cliente
 * carrega a sessão de `cookies()` porque serve o Fidelize Admin (equipe
 * autenticada). Um visitante do Web Card não tem sessão Supabase nenhuma —
 * o token na URL é toda a "autorização" que ele tem, e ela é validada no
 * servidor (function dedicada, ver `src/lib/card/getPublicCard.ts`), nunca
 * por um login. Usar o cliente de cookies aqui misturaria, sem necessidade,
 * o estado de uma sessão administrativa que por acaso exista no mesmo
 * navegador com uma rota que deveria ser 100% anônima.
 *
 * Sempre a chave `anon` — nunca `service_role`. `persistSession: false`
 * porque cada requisição de servidor é isolada; não há nada para persistir.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
