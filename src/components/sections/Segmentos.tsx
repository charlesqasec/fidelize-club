import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow, Lead, Section, SectionTitle } from "@/components/ui/Section";
import {
  IconBag,
  IconBuilding,
  IconCoffee,
  IconCutlery,
  IconDots,
  IconDumbbell,
  IconFlower,
  IconScissors,
  IconStore,
} from "@/components/ui/Icons";
import { segments } from "@/lib/site";

const icons = [
  IconScissors,
  IconCoffee,
  IconCutlery,
  IconDumbbell,
  IconBag,
  IconFlower,
  IconStore,
  IconBuilding,
  IconDots,
];

export function Segmentos() {
  return (
    <Section id="segmentos" aria-labelledby="segmentos-title">
      <Reveal className="max-w-3xl">
        <Eyebrow>Segmentos</Eyebrow>
        <SectionTitle id="segmentos-title">
          Feito para negócios que querem clientes de volta.
        </SectionTitle>
        <Lead className="text-ink-soft">
          Se o seu negócio depende de quem volta, o programa se adapta ao seu
          formato de recompensa.
        </Lead>
      </Reveal>

      <Reveal
        as="ul"
        stagger
        variant="scale"
        className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9"
      >
        {segments.map((segment, index) => {
          const Icon = icons[index];
          return (
            <li
              key={segment}
              className="segment-card flex flex-col items-center justify-start gap-3 rounded-3xl border border-line bg-white px-3 py-6 text-center hover:border-brand-200 hover:bg-brand-50/40"
            >
              <Icon className="segment-icon h-6 w-6 shrink-0 text-brand-600" />
              <span className="text-[0.8rem] font-medium leading-snug text-ink-soft sm:text-sm lg:text-[0.78rem]">
                {segment}
              </span>
            </li>
          );
        })}
      </Reveal>
    </Section>
  );
}
