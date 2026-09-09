import { CertificadoModal } from "@/components/CertificadoModal";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";
import { IconShield } from "@/components/ui/Icons";
import { certification, securityPillars } from "@/lib/site";

/* Segurança transmite seriedade: só revelações suaves — nada gira, flutua
   ou brilha; a imagem do certificado nunca é animada. */
export function Seguranca() {
  return (
    <Section id="seguranca" tone="dark" aria-labelledby="seguranca-title">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-10 h-80 w-80 rounded-full bg-brand-700/35 blur-[110px]"
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16">
        <div>
          <Reveal>
            <Eyebrow tone="dark">Segurança</Eyebrow>
            <SectionTitle id="seguranca-title">
              Segurança desde a concepção.
            </SectionTitle>
            <Lead className="text-brand-100/85">
              O Fidelize.club é desenvolvido sob princípios de segurança da
              informação e proteção de dados.
            </Lead>
          </Reveal>

          <Reveal variant="fade" delay={150} className="mt-9 rounded-3xl bg-white/[0.07] p-6 ring-1 ring-inset ring-white/10">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
                <IconShield className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm leading-relaxed text-brand-100/85">
                  A liderança técnica possui certificação:
                </p>
                <p className="mt-1.5 font-display text-[0.95rem] font-semibold leading-snug text-white">
                  {certification.title} — {certification.issuer}.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <CertificadoModal />
            </div>

            <p className="mt-5 text-[0.8rem] leading-relaxed text-brand-200/70">
              A certificação pertence ao responsável técnico. O Fidelize.club,
              como empresa, não declara certificação ISO/IEC 27001.
            </p>
          </Reveal>
        </div>

        <Reveal as="ul" stagger variant="right" delay={100} className="space-y-3 self-center">
          {securityPillars.map((pillar) => (
            <li
              key={pillar.title}
              className="rounded-3xl bg-white/[0.05] p-6 ring-1 ring-inset ring-white/10"
            >
              <h3 className="font-display text-base font-semibold text-white">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-100/75">
                {pillar.description}
              </p>
            </li>
          ))}
        </Reveal>
      </div>

      <Reveal as="p" variant="fade" delay={200} className="mt-10 max-w-3xl text-[0.8rem] leading-relaxed text-brand-200/60">
        A LGPD é tratada como requisito de conformidade ao longo do
        desenvolvimento. Não afirmamos conformidade total nem auditoria
        concluída — esse trabalho é contínuo.
      </Reveal>
    </Section>
  );
}
