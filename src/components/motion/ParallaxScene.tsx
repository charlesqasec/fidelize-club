"use client";

import { useEffect, type ReactNode } from "react";

import { useInView } from "@/components/motion/useInView";
import { clamp, pointerEffectsAllowed } from "@/lib/motion";

type ParallaxSceneProps = {
  className?: string;
  children: ReactNode;
};

/**
 * Cena de parallax por cursor (Hero).
 *
 * Expõe `--mx`/`--my` (−1..1) como CSS vars no wrapper; cada camada filha
 * com `data-parallax-layer` define sua própria amplitude (`--px`, `--py`)
 * e rotação (`--rx`, `--ry`) — ver globals.css. O listener fica no próprio
 * elemento (não em window), é passivo e throttled por rAF.
 *
 * Desligado em touch e com prefers-reduced-motion. Também marca
 * `data-inview` para disparar microanimações únicas (ondas NFC).
 */
export function ParallaxScene({ className, children }: ParallaxSceneProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });

  useEffect(() => {
    const element = ref.current;
    if (!element || !pointerEffectsAllowed()) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;

    const apply = () => {
      frame = 0;
      element.style.setProperty("--mx", targetX.toFixed(3));
      element.style.setProperty("--my", targetY.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      targetX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      targetY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);

  return (
    <div
      ref={ref}
      className={`parallax-scene ${className ?? ""}`}
      data-inview={inView ? "" : undefined}
    >
      {children}
    </div>
  );
}
