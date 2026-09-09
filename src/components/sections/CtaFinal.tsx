import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight, ButtonLink } from "@/components/ui/Button";
import { commercialHref } from "@/lib/site";

export function CtaFinal() {
  return (
    <section
      id="contato"
      aria-labelledby="cta-final-title"
      className="on-dark relative isolate overflow-hidden bg-brand-950 text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 h-[28rem] w-[46rem] -translate-x-1/2 rounded-full bg-brand-600/30 blur-[130px]" />
      </div>

      <Reveal variant="scale" className="mx-auto w-full max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-28">
        <h2
          id="cta-final-title"
          className="text-balance font-display text-3xl font-bold leading-[1.12] sm:text-5xl"
        >
          Comece a transformar visitas
          <br className="hidden sm:block" /> em relacionamentos.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-brand-100/85 sm:text-lg">
          Ative seu programa de fidelidade digital e mantenha seus clientes por
          perto.
        </p>

        <div className="mt-9 flex justify-center">
          <ButtonLink href={commercialHref()}>
            Quero Fidelizar Meu Negócio
            <ArrowRight />
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
