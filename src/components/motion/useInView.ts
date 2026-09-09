"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  threshold?: number;
  rootMargin?: string;
  /** `true` (padrão): dispara uma vez e para de observar. */
  once?: boolean;
};

/**
 * Observa se um elemento está na viewport (IntersectionObserver).
 *
 * - `inView`: estado atual (com `once: false`, volta a `false` ao sair).
 * - `hasBeenInView`: fica `true` na primeira interseção e não volta.
 *
 * Sem suporte à API, considera visível — nenhum conteúdo depende disso.
 */
export function useInView<T extends Element>({
  threshold = 0.2,
  rootMargin = "0px 0px -8% 0px",
  once = true,
}: Options = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => {
        setInView(true);
        setHasBeenInView(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setHasBeenInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView, hasBeenInView };
}
