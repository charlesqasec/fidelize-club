"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { clamp, pointerEffectsAllowed } from "@/lib/motion";

type TiltCardProps = {
  /** Inclinação máxima em graus. Manter pequeno — é profundidade, não efeito. */
  maxTilt?: number;
  className?: string;
  children: ReactNode;
};

/**
 * Inclinação 3D discreta que segue o cursor dentro do próprio elemento
 * (Kit físico). Não distorce a imagem — só rotateX/rotateY em perspectiva.
 * Desligado em touch e com prefers-reduced-motion.
 */
export function TiltCard({ maxTilt = 2.5, className, children }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !pointerEffectsAllowed()) return;

    let frame = 0;
    let rx = 0;
    let ry = 0;

    const apply = () => {
      frame = 0;
      element.style.setProperty("--trx", `${rx.toFixed(2)}deg`);
      element.style.setProperty("--try", `${ry.toFixed(2)}deg`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      const y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
      rx = -y * maxTilt;
      ry = x * maxTilt;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      rx = 0;
      ry = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [maxTilt]);

  return (
    <div ref={ref} className={`tilt-card ${className ?? ""}`}>
      {children}
    </div>
  );
}
