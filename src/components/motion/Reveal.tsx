"use client";

import { createElement, type CSSProperties, type ReactNode } from "react";

import { useInView } from "@/components/motion/useInView";

export type RevealVariant =
  | "up"
  | "fade"
  | "scale"
  | "left"
  | "right"
  | "notify";

type RevealProps = {
  as?: "div" | "section" | "ul" | "ol" | "li" | "figure" | "span" | "p";
  /** Como o elemento entra. Variar com propósito — não usar "up" em tudo. */
  variant?: RevealVariant;
  /** Anima os filhos diretos em cascata (CSS :nth-child), não o próprio wrapper. */
  stagger?: boolean;
  /** Atraso adicional em ms. */
  delay?: number;
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
  children: ReactNode;
};

/**
 * Scroll reveal via IntersectionObserver + CSS (globals.css, "Motion").
 *
 * Estado inicial oculto só existe quando `html[data-js]` está presente
 * (script no layout) — sem JS, tudo fica visível. Com reduced motion, o CSS
 * força opacidade 1 e transform none.
 */
export function Reveal({
  as = "div",
  variant = "up",
  stagger = false,
  delay = 0,
  threshold,
  className,
  style,
  id,
  children,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold });

  return createElement(
    as,
    {
      ref,
      id,
      className,
      style: { ...style, "--reveal-delay": `${delay}ms` } as CSSProperties,
      ...(stagger
        ? { "data-reveal-stagger": variant }
        : { "data-reveal": variant }),
      "data-inview": inView ? "" : undefined,
    },
    children,
  );
}
