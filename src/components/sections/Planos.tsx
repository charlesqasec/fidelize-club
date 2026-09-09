import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight, ButtonLink } from "@/components/ui/Button";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";
import { IconCheck } from "@/components/ui/Icons";
import { commercialHref, personalization, plan } from "@/lib/site";

export function Planos() {
  return (
    <Section id="planos" tone="soft" aria-labelledby="planos-title">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Eyebrow>Planos</Eyebrow>
        <SectionTitle id="planos-title">
          Comece a fidelizar seus clientes.
        </SectionTitle>
        <Lead className="mx-auto text-ink-soft">
          Um plano único, com tudo incluído. Sem níveis, sem pegadinha de
          upgrade.
        </Lead>
      </Reveal>

      <div className="mx-auto mt-14 max-w-xl">
        {/* price-card: leve elevação + glow violeta ao entrar em vista. */}
        <Reveal
          variant="scale"
          threshold={0.35}
          className="price-card overflow-hidden rounded-4xl border border-line bg-white shadow-xl shadow-brand-950/[0.06]"
        >
          <div className="bg-gradient-to-br from-brand-800 to-brand-600 px-7 py-8 text-white sm:px-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
              {plan.name}
            </p>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-semibold">R$</span>
              <span className="font-display text-6xl font-bold leading-none">
                {plan.price}
              </span>
              <span className="font-display text-xl font-medium text-brand-200">
                {plan.period}
              </span>
            </p>
          </div>

          <div className="px-7 py-8 sm:px-9">
            <ul className="grid gap-3.5 sm:grid-cols-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                    <IconCheck className="h-3 w-3" strokeWidth={2.6} />
                  </span>
                  <span className="text-[0.92rem] leading-snug text-ink-soft">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <ButtonLink href={commercialHref()} className="mt-9 w-full">
              Quero Fidelizar Meu Negócio
              <ArrowRight />
            </ButtonLink>

            <p className="mt-5 text-center text-sm leading-relaxed text-ink-muted">
              Cancele quando quiser. Sem fidelidade contratual.
            </p>
          </div>
        </Reveal>

        <Reveal as="p" variant="fade" delay={250} className="mt-6 text-center text-[0.8rem] leading-relaxed text-ink-muted">
          {personalization.standard} {personalization.advanced}
        </Reveal>
      </div>
    </Section>
  );
}
