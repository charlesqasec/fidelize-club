"use client";

import { useEffect } from "react";

import { CardFooter } from "@/components/card/CardFooter";
import { IconAlert } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";

/**
 * Error boundary da rota — rede de segurança para qualquer exceção não
 * tratada por `getPublicCardByToken` (que já captura o caso esperado).
 * Nunca mostra `error.message`/stack ao consumidor — só um log local para
 * quem está depurando.
 */
export default function WebCardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[web-card] erro inesperado:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 text-center shadow-xl shadow-brand-950/[0.06]">
          <Logo />
          <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-soft text-ink-muted ring-1 ring-inset ring-line">
            <IconAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-lg font-semibold text-brand-950">
            Algo deu errado ao abrir seu cartão
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Isso é temporário. Você pode tentar novamente.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
      <CardFooter />
    </div>
  );
}
