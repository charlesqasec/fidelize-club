import Image from "next/image";

import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";
import { IconSparkle } from "@/components/ui/Icons";
import { campaignExamples, demoCard } from "@/lib/site";

export function Campanhas() {
  return (
    <Section id="campanhas" tone="soft" aria-labelledby="campanhas-title">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-center lg:gap-16">
        <div>
          <Reveal>
            <Eyebrow>Campanhas</Eyebrow>
            <SectionTitle id="campanhas-title">
              Seu cartão continua trabalhando depois da visita.
            </SectionTitle>
            <Lead className="text-ink-soft">
              O estabelecimento pode publicar campanhas que aparecem no cartão
              digital do cliente. O relacionamento não termina quando ele sai da
              loja.
            </Lead>
          </Reveal>

          <Reveal as="ul" stagger variant="scale" delay={120} className="mt-8 flex flex-wrap gap-2.5">
            {campaignExamples.map((example) => (
              <li
                key={example}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft"
              >
                {example}
              </li>
            ))}
          </Reveal>

          <Reveal as="p" variant="fade" delay={300} className="mt-8 max-w-xl text-sm leading-relaxed text-ink-muted">
            As campanhas ficam visíveis no cartão sempre que o cliente o abrir.
            Notificações por outros canais dependem de consentimento explícito e
            do suporte do dispositivo.
          </Reveal>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          {/* Bloco de campanhas como aparece dentro do cartão do cliente —
              cada campanha chega como uma notificação. */}
          <Reveal variant="scale" className="rounded-4xl border border-line bg-white p-6 shadow-xl shadow-brand-950/[0.06]">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Campanhas para você
              </p>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-brand-700">
                Demonstração
              </span>
            </div>

            <Reveal as="ul" stagger variant="notify" delay={260} className="mt-4 space-y-3">
              {demoCard.campaigns.map((campaign) => (
                <li
                  key={campaign.title}
                  className="flex gap-3.5 rounded-2xl bg-gradient-to-br from-brand-50 to-white px-4 py-4 ring-1 ring-inset ring-brand-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                    <IconSparkle className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="font-display text-[0.95rem] font-semibold text-ink">
                      {campaign.title}
                    </p>
                    <p className="mt-1 text-sm leading-snug text-ink-soft">
                      {campaign.description}
                    </p>
                  </div>
                </li>
              ))}
            </Reveal>

            <p className="mt-5 border-t border-line pt-4 text-[0.75rem] leading-relaxed text-ink-muted">
              Exemplo de campanhas publicadas por um estabelecimento fictício.
            </p>
          </Reveal>

          <Reveal delay={180} className="mt-6 flex items-center gap-5 rounded-4xl border border-line bg-white p-5">
            <Image
              src="/mockups/cartao-tela-bloqueio.png"
              alt="Cartão digital do cliente visível na tela do celular, com o progresso de visitas."
              width={268}
              height={560}
              sizes="112px"
              className="h-auto w-24 rounded-2xl sm:w-28"
            />
            <p className="text-sm leading-relaxed text-ink-soft">
              O cliente reencontra a campanha no mesmo lugar onde acompanha as
              visitas: no próprio cartão.
            </p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
