"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";

import { clamp, pointerEffectsAllowed } from "@/lib/motion";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "btn-cta inline-flex items-center justify-center rounded-full font-semibold " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-lg shadow-brand-900/20 hover:bg-brand-700 hover:shadow-brand-900/30 active:bg-brand-800",
  secondary:
    "bg-white text-brand-800 ring-1 ring-inset ring-line hover:bg-brand-50 hover:ring-brand-200",
  ghost:
    "bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20",
};

const shine: Record<Variant, string> = {
  primary: "rgb(255 255 255 / 0.22)",
  secondary: "rgb(130 87 239 / 0.12)",
  ghost: "rgb(255 255 255 / 0.18)",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-[0.95rem]",
};

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

/**
 * Efeito magnético: o conteúdo acompanha o cursor em até `strength` px
 * enquanto ele está sobre o botão. Listener no próprio elemento, throttled
 * por rAF; desligado em touch e com prefers-reduced-motion.
 */
function useMagnetic<T extends HTMLElement>(strength = 3) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !pointerEffectsAllowed()) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      element.style.setProperty("--bx", `${x.toFixed(2)}px`);
      element.style.setProperty("--by", `${y.toFixed(2)}px`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1) * strength;
      y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1) * strength;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [strength]);

  return ref;
}

/** CTA da landing. Sempre um link real — nunca um botão sem destino. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "lg",
  className = "",
  children,
  ...rest
}: ButtonLinkProps) {
  const ref = useMagnetic<HTMLAnchorElement>();
  const isExternal = /^https?:|^mailto:|^tel:/.test(href);
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const style = { "--shine": shine[variant] } as CSSProperties;
  const inner = <span className="btn-cta__inner">{children}</span>;

  if (isExternal) {
    return (
      <a
        ref={ref}
        href={href}
        className={classes}
        style={style}
        rel="noopener noreferrer"
        target={href.startsWith("http") ? "_blank" : undefined}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link ref={ref} href={href} className={classes} style={style} {...rest}>
      {inner}
    </Link>
  );
}

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 ${className}`}
    >
      <path
        d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
