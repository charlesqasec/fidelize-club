"use client";

import { useEffect } from "react";

import { useInView } from "@/components/motion/useInView";
import {
  IconCard,
  IconNfc,
  IconRepeat,
  IconUserPlus,
} from "@/components/ui/Icons";
import { clamp, prefersReducedMotion } from "@/lib/motion";
import { steps } from "@/lib/site";

const icons = [IconNfc, IconUserPlus, IconCard, IconRepeat];

/**
 * Os quatro passos de "Como funciona" ligados pela assinatura visual da
 * jornada: uma linha violeta que avança com o scroll
 * (① ━━━ ② ━━━ ③ ━━━ ④ no desktop; vertical no mobile) e um pulso de luz
 * que a percorre duas vezes quando a seção entra em vista.
 *
 * O listener de scroll só existe enquanto a seção está na viewport, é
 * passivo e throttled por rAF. Com reduced motion a linha aparece completa.
 */
export function StepsJourney() {
  // `inView` liga/desliga o listener de scroll; `hasBeenInView` (latched)
  // dispara a revelação dos cards uma única vez.
  const {
    ref,
    inView,
    hasBeenInView: revealed,
  } = useInView<HTMLDivElement>({
    threshold: 0.15,
    once: false,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element || !inView) return;

    if (prefersReducedMotion()) {
      element.style.setProperty("--progress", "1");
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const progress = clamp(
        (window.innerHeight * 0.82 - rect.top) / (rect.height * 0.9),
        0,
        1,
      );
      element.style.setProperty("--progress", progress.toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [inView, ref]);

  return (
    <div
      ref={ref}
      className="relative mt-14"
      data-inview={revealed ? "" : undefined}
    >
      {/* Linha da jornada — atrás dos cards, visível nos vãos entre eles. */}
      <div
        aria-hidden="true"
        className="journey-line journey-line--h hidden lg:block"
        style={{ left: "2rem", right: "2rem", top: "3.25rem", height: "2px" }}
      />
      <div
        aria-hidden="true"
        className="journey-line journey-line--v lg:hidden"
        style={{ left: "3.25rem", top: "2rem", bottom: "2rem", width: "2px" }}
      />

      <ol
        data-reveal-stagger="up"
        data-inview={revealed ? "" : undefined}
        className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {steps.map((step, index) => {
          const Icon = icons[index];
          return (
            <li
              key={step.number}
              className="relative flex h-full flex-col rounded-3xl border border-line bg-white p-7 shadow-sm shadow-brand-950/[0.03]"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 ${
                    index === 0 ? "nfc-pulse" : ""
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="font-display text-sm font-bold text-brand-200">
                  {step.number}
                </span>
              </div>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
                {step.title}
              </h3>
              <p className="mt-2.5 text-pretty text-[0.95rem] leading-relaxed text-ink-soft">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
