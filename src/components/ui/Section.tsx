import type { ReactNode } from "react";

type SectionProps = {
  id?: string;
  /** Fundo da seção. `dark` ativa o contexto visual escuro (.on-dark). */
  tone?: "light" | "soft" | "dark";
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
};

const tones = {
  light: "bg-surface text-ink",
  soft: "bg-surface-soft text-ink",
  dark: "on-dark bg-brand-950 text-white",
} as const;

export function Section({
  id,
  tone = "light",
  className = "",
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden ${tones[tone]} ${className}`}
      {...rest}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
        {children}
      </div>
    </section>
  );
}

export function Eyebrow({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <p
      className={`mb-4 text-xs font-semibold uppercase tracking-[0.18em] ${
        tone === "dark" ? "text-brand-300" : "text-brand-600"
      }`}
    >
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className={`text-balance font-display text-3xl font-bold leading-[1.12] sm:text-4xl lg:text-[2.75rem] ${className}`}
    >
      {children}
    </h2>
  );
}

export function Lead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-5 max-w-2xl text-pretty text-base leading-relaxed sm:text-lg ${className}`}>
      {children}
    </p>
  );
}
