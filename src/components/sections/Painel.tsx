import Image from "next/image";

import { AgenteIA } from "@/components/motion/AgenteIA";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";
import {
  IconChart,
  IconClock,
  IconGift,
  IconRepeat,
  IconUsers,
} from "@/components/ui/Icons";

const highlights = [
  { label: "Clientes", Icon: IconUsers },
  { label: "Visitas", Icon: IconChart },
  { label: "Recorrência", Icon: IconRepeat },
  { label: "Recompensas", Icon: IconGift },
  { label: "Clientes inativos", Icon: IconClock },
];

export function Painel() {
  return (
    <Section id="painel" tone="dark" aria-labelledby="painel-title">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-brand-600/25 blur-[120px]"
      />

      <Reveal className="max-w-3xl">
        <Eyebrow tone="dark">Painel do estabelecimento</Eyebrow>
        <SectionTitle id="painel-title">Conheça quem compra de você.</SectionTitle>
        <Lead className="text-brand-100/85">
          Acompanhe clientes, visitas, recorrência, recompensas e oportunidades
          em um painel simples.
        </Lead>
      </Reveal>

      <Reveal as="ul" stagger delay={120} className="mt-10 flex flex-wrap gap-2.5">
        {highlights.map(({ label, Icon }) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-brand-100 ring-1 ring-inset ring-white/15"
          >
            <Icon className="h-4 w-4 text-brand-300" />
            {label}
          </li>
        ))}
      </Reveal>

      {/* Painel entra → dados aparecem → Agente de IA analisa → insight.
          O Agente fica dentro do mesmo frame, abaixo do mockup — não cobre
          nenhuma informação do painel. */}
      <figure className="mt-12">
        <Reveal
          variant="scale"
          className="overflow-hidden rounded-4xl bg-white/5 p-2 ring-1 ring-white/10 sm:p-3"
        >
          <Image
            src="/mockups/painel-estabelecimento.png"
            alt="Painel do estabelecimento com indicadores de clientes cadastrados, visitas do mês, recompensas resgatadas e clientes inativos, além de gráfico de evolução de visitas."
            width={1536}
            height={1024}
            sizes="(max-width: 1024px) 100vw, 1100px"
            className="h-auto w-full rounded-3xl"
          />
          <AgenteIA className="mt-2 sm:mt-3" />
        </Reveal>

        <figcaption className="mt-4 text-[0.8rem] leading-relaxed text-brand-200/70 lg:max-w-2xl">
          Mockup do painel em desenvolvimento. Todos os números exibidos —
          inclusive o insight do Agente de IA — são demonstrativos e pertencem
          a um estabelecimento fictício.
        </figcaption>
      </figure>
    </Section>
  );
}
