import Image from "next/image";

import { CartaoDemo } from "@/components/CartaoDemo";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";
import { IconCard, IconCheck } from "@/components/ui/Icons";
import { anyWalletEnabled } from "@/lib/flags";

const points = [
  "Sem aplicativo obrigatório.",
  "Selos, visitas, pontos ou níveis — o cartão reflete o formato escolhido para o seu negócio.",
  "Funciona em Android e iPhone, direto no navegador.",
  "Também é o lugar onde o cliente avalia a experiência e envia feedback ao estabelecimento.",
];

export function CartaoDigital() {
  return (
    <Section id="cartao-digital" aria-labelledby="cartao-digital-title">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16">
        <div>
          <Reveal>
            <Eyebrow>Cartão digital</Eyebrow>
            <SectionTitle id="cartao-digital-title">
              O cartão da sua empresa.
              <br className="hidden sm:block" /> Sempre com o seu cliente.
            </SectionTitle>
            <Lead className="text-ink-soft">
              O cliente acessa seu cartão digital, acompanha visitas, recompensas
              e campanhas e, quando disponível, pode adicioná-lo à sua carteira
              digital.
            </Lead>
          </Reveal>

          <Reveal as="ul" stagger variant="left" delay={120} className="mt-8 space-y-3.5">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                  <IconCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                <span className="text-[0.95rem] leading-relaxed text-ink-soft">
                  {point}
                </span>
              </li>
            ))}
          </Reveal>

          <Reveal delay={300} className="mt-9 rounded-3xl border border-line bg-surface-soft p-5">
            <div className="flex items-center gap-2.5">
              <IconCard className="h-5 w-5 text-brand-600" />
              <h3 className="text-sm font-semibold text-ink">
                Carteiras digitais
              </h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Apple Wallet e Google Wallet são{" "}
              <strong className="font-semibold text-ink">
                integrações opcionais
              </strong>{" "}
              da experiência.{" "}
              {anyWalletEnabled
                ? "Disponíveis conforme a configuração do seu estabelecimento."
                : "Ainda não estão ativas em produção — e o Cartão Digital Fidelize funciona normalmente sem elas, inclusive no iPhone."}
            </p>
          </Reveal>
        </div>

        {/* O cartão toca a jornada (visitas → recompensa → campanha →
            avaliação) quando entra em vista — ver CartaoDemo.tsx. */}
        <Reveal variant="scale" className="mx-auto w-full max-w-md">
          <CartaoDemo />
        </Reveal>
      </div>

      <Reveal as="figure" variant="scale" className="mt-16">
        <div className="overflow-hidden rounded-4xl border border-line bg-surface-soft">
          <Image
            src="/mockups/cartao-telas.png"
            alt="Três telas do cartão digital em celulares: página do estabelecimento, tela de recompensas e histórico de visitas."
            width={1004}
            height={710}
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="h-auto w-full"
          />
        </div>
        <figcaption className="mt-3 text-center text-[0.8rem] text-ink-muted">
          Telas de demonstração do Cartão Digital Fidelize com estabelecimento
          fictício.
        </figcaption>
      </Reveal>
    </Section>
  );
}
