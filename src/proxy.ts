import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * Mantém a sessão do Supabase Auth sincronizada a cada requisição.
 *
 * Server Components não conseguem gravar cookies (ver o catch em
 * `src/lib/supabase/server.ts`) — se um token expirar durante a
 * renderização, o refresh token só pode ser persistido de volta no cookie
 * aqui, no único ponto do ciclo de vida do Next.js com acesso à resposta
 * antes dela ser enviada. Omitir isso causa logout precoce/sessão perdida
 * silenciosamente (aviso da própria @supabase/ssr em `createServerClient`).
 *
 * Renomeado de `middleware.ts` para `proxy.ts` — convenção do Next.js 16
 * (`node_modules/next/dist/docs/.../proxy.md`); comportamento idêntico ao
 * antigo `middleware`.
 *
 * Proteção de rota (ETAPA 3.1): só a primeira barreira, redirecionar quem
 * não tem sessão nenhuma para longe de `/admin` antes de gastar uma
 * renderização com isso. A autorização de verdade (é `platform_admin`
 * ativo?) mora em `src/app/admin/layout.tsx`, não aqui — o próprio guia do
 * Next.js 16 para Proxy avisa para nunca depender só dele: "a Proxy matcher
 * change or a refactor... can silently remove Proxy coverage. Always verify
 * authentication and authorization inside each Server Function".
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verifica/renova a sessão a partir dos cookies da requisição — sempre,
  // em toda rota, para o refresh token nunca ficar sem lugar de gravar.
  const { data: claimsData } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isProtectedRoute && !claimsData?.claims) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Preserva qualquer cookie de sessão já renovado acima nesta mesma
    // requisição — um redirect novo, se criado do zero, os perderia.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|opengraph-image|sitemap.xml|robots.txt).*)",
  ],
};
