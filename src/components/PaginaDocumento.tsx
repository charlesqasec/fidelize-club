import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { Logo } from "@/components/ui/Logo";

/**
 * Casca das páginas de documento (termos, privacidade).
 * Conteúdo jurídico real será inserido quando revisado — nada é presumido aqui.
 */
export function PaginaDocumento({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center px-5 py-5 sm:px-8">
          <Link href="/" aria-label="Fidelize.club — início" className="rounded-lg">
            <Logo />
          </Link>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
          <div className="mt-6 space-y-4 text-[0.97rem] leading-relaxed text-ink-soft">
            {children}
          </div>

          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            <span aria-hidden="true">←</span> Voltar para a página inicial
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
