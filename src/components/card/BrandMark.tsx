import type { CSSProperties } from "react";

/**
 * Iniciais do estabelecimento para o selo de marca. Derivadas do nome que
 * já veio da function pública — nunca um dado novo. Uma ou duas letras.
 */
function brandInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Só http(s) absoluto — nada de `javascript:`/`data:` vindo do banco. */
function safeLogoUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

/**
 * Selo de marca do estabelecimento no topo do cartão.
 *
 * Sem `logoUrl` (o caso comum hoje): só as iniciais. Com URL válida, o
 * logo entra como `background-image` de uma camada por cima, com `contain`
 * (proporção preservada, sem deformar) sobre um chip branco — a convenção
 * de avatar de marca (logo pode ser transparente/wordmark e ainda fica
 * legível).
 *
 * `background-image` de propósito, não `<img>`: se a URL falhar, o
 * navegador não desenha ícone de "imagem quebrada" — fica só o chip
 * branco, um estado neutro de "logo ausente" (corrigível no Admin), nunca
 * algo com aparência de bug. Sem `onError`, sem hidratação, sem
 * JavaScript — componente de servidor.
 *
 * `next/image` exigiria `remotePatterns` em `next.config.ts` para os
 * domínios que cada estabelecimento define — fora do escopo desta etapa.
 */
export function BrandMark({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const src = safeLogoUrl(logoUrl);
  // `src` já passou por `new URL()`; `href` normaliza/escapa aspas (→ %22),
  // então `url("…")` é seguro. As aspas evitam qualquer ambiguidade de token.
  const layerStyle = src
    ? ({ backgroundImage: `url("${src}")` } as CSSProperties)
    : undefined;

  return (
    <span
      aria-hidden="true"
      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[color:var(--card-text)]/15 font-display text-base font-bold leading-none text-[color:var(--card-text)] ring-1 ring-inset ring-[color:var(--card-text)]/25 group-data-[card-style=bold]/card:h-14 group-data-[card-style=bold]/card:w-14"
    >
      {brandInitials(name)}
      {src ? (
        <span
          className="absolute inset-0 bg-white bg-contain bg-center bg-no-repeat"
          style={layerStyle}
        />
      ) : null}
    </span>
  );
}
