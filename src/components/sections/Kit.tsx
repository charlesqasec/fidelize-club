import Image from "next/image";

import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";
import { IconHeadset, IconNfc, IconSparkle, IconWrench } from "@/components/ui/Icons";
import { kitItems, personalization, positioning } from "@/lib/site";

const icons = [IconNfc, IconWrench, IconHeadset];

export function Kit() {
  return (
    <Section id="kit" tone="soft" aria-labelledby="kit-title">
      <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal as="figure" variant="scale" className="order-2 lg:order-1">
          {/* Profundidade discreta ao cursor (desktop). A imagem não muda. */}
          <TiltCard className="overflow-hidden rounded-4xl border border-line bg-white">
            <Image
              src="/mockups/kit-fidelize.png"
              alt="Kit físico Fidelize.club aberto sobre uma mesa, com a placa NFC personalizada e o material de apoio do estabelecimento."
              width={408}
              height={538}
              sizes="(max-width: 1023px) 90vw, 45vw"
              className="h-auto w-full"
            />
          </TiltCard>
          <figcaption className="mt-3 text-[0.8rem] text-ink-muted">
            Imagem ilustrativa do kit de ativação.
          </figcaption>
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <Eyebrow>Kit de ativação</Eyebrow>
            <SectionTitle id="kit-title">
              Tudo que você precisa para começar.
            </SectionTitle>
            <Lead className="text-ink-soft">
              Tudo pronto para o seu programa de fidelidade: a placa chega
              personalizada com a identidade do seu negócio e o programa já
              configurado.
            </Lead>
          </Reveal>

          <Reveal as="ul" stagger variant="left" delay={100} className="mt-9 space-y-3">
            {kitItems.map((item, index) => {
              const Icon = icons[index];
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-4 rounded-3xl border border-line bg-white p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </Reveal>

          <Reveal delay={320} className="mt-6 rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-2.5">
              <IconSparkle className="h-5 w-5 text-brand-600" />
              <h3 className="text-sm font-semibold text-ink">
                {positioning.tagline}
              </h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {positioning.description}
            </p>
            <span className="mt-4 inline-flex rounded-full bg-brand-50 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-brand-700 ring-1 ring-inset ring-brand-100">
              {personalization.standard}
            </span>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
