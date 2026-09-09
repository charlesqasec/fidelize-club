import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight, ButtonLink } from "@/components/ui/Button";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";
import { commercialHref, specialCampaigns } from "@/lib/site";

export function CampanhasEspeciais() {
  return (
    <Section
      id="campanhas-especiais"
      tone="dark"
      aria-labelledby="campanhas-especiais-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-brand-500/25 blur-[110px]"
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16">
        <Reveal>
          <Eyebrow tone="dark">Personalização avançada</Eyebrow>
          <SectionTitle id="campanhas-especiais-title">
            Quer ir além da fidelidade?
          </SectionTitle>
          <Lead className="text-brand-100/85">
            Pedidos fora da configuração padrão — design exclusivo, mecânica
            própria ou campanhas sob demanda — entram como personalização
            avançada, sob orçamento.
          </Lead>

          <div className="mt-9">
            <ButtonLink href={commercialHref()} variant="secondary">
              Fale com a Fidelize
              <ArrowRight />
            </ButtonLink>
          </div>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-brand-200/75">
            Cada campanha é definida e aprovada pelo estabelecimento antes de ir
            ao ar. Nada é publicado automaticamente no cartão dos seus clientes.
          </p>
        </Reveal>

        <Reveal as="ul" stagger variant="scale" delay={120} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
          {specialCampaigns.map((campaign) => (
            <li
              key={campaign}
              className="rounded-2xl bg-white/[0.07] px-4 py-3.5 text-sm font-medium text-brand-100 ring-1 ring-inset ring-white/10"
            >
              {campaign}
            </li>
          ))}
        </Reveal>
      </div>
    </Section>
  );
}
