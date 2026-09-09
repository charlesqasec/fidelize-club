import { Reveal } from "@/components/motion/Reveal";
import { StepsJourney } from "@/components/motion/StepsJourney";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";

export function ComoFunciona() {
  return (
    <Section id="como-funciona" tone="soft" aria-labelledby="como-funciona-title">
      <Reveal className="max-w-3xl">
        <Eyebrow>Como funciona</Eyebrow>
        <SectionTitle id="como-funciona-title">
          Simples para o seu cliente.
          <br className="hidden sm:block" /> Poderoso para o seu negócio.
        </SectionTitle>
        <Lead className="text-ink-soft">
          Em poucos passos, o visitante vira um cliente cadastrado no seu
          programa de fidelidade — sem instalar aplicativo.
        </Lead>
      </Reveal>

      <StepsJourney />

      <Reveal as="p" variant="fade" delay={200} className="mt-8 max-w-2xl text-sm leading-relaxed text-ink-muted">
        O Cartão Digital Fidelize funciona como experiência independente. A
        carteira digital do celular é um canal opcional — nunca um requisito
        para participar do programa.
      </Reveal>
    </Section>
  );
}
