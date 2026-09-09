"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { certification } from "@/lib/site";

/**
 * Modal do certificado.
 *
 * A imagem exibida é o ARQUIVO ORIGINAL emitido pela SkillFront, sem qualquer
 * edição, recorte ou selo adicional. Não recriar nem redesenhar.
 *
 * Usa <dialog> nativo: foco, Esc e inertização do fundo pelo próprio navegador.
 */
export function CertificadoModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20"
      >
        Ver certificação
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path
            d="M7.5 3.5h9v9M16.5 3.5 8 12M12.5 15.5v1h-9v-9h1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Fecha ao clicar no backdrop (fora do conteúdo).
          if (event.target === dialogRef.current) setOpen(false);
        }}
        aria-labelledby="certificado-titulo"
        className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-black/60"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
          <div>
            <h2
              id="certificado-titulo"
              className="font-display text-base font-semibold sm:text-lg"
            >
              {certification.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Emitido por {certification.issuer} para {certification.holder} —
              responsável técnico do Fidelize.club.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-soft hover:text-ink"
          >
            <span className="sr-only">Fechar</span>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto bg-surface-soft p-4 sm:p-7">
          <Image
            src={certification.image}
            alt={certification.alt}
            width={754}
            height={532}
            /* Serve o arquivo original, sem reencodificação. */
            unoptimized
            className="mx-auto h-auto w-full rounded-xl shadow-md"
          />
          <p className="mx-auto mt-4 max-w-2xl text-center text-[0.8rem] leading-relaxed text-ink-muted">
            A certificação pertence ao responsável técnico. O Fidelize.club, como
            empresa, não declara certificação ISO/IEC 27001.
          </p>
        </div>
      </dialog>
    </>
  );
}
