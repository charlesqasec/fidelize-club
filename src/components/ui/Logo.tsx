import Image from "next/image";

import { site } from "@/lib/site";

type LogoProps = {
  /** `dark` = para usar sobre fundos escuros. */
  tone?: "light" | "dark";
  /** Exibe a assinatura "CLIENTES QUE VOLTAM SEMPRE". */
  withTagline?: boolean;
  className?: string;
};

/**
 * Marca Fidelize.club: símbolo original das referências do projeto
 * (recortado com fundo transparente) + tipografia real em HTML.
 */
export function Logo({
  tone = "light",
  withTagline = false,
  className = "",
}: LogoProps) {
  const isDark = tone === "dark";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src={
          isDark
            ? "/marca/fidelize-simbolo-branco.png"
            : "/marca/fidelize-simbolo.png"
        }
        alt=""
        aria-hidden="true"
        width={158}
        height={178}
        className="h-8 w-auto sm:h-9"
        priority
      />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-xl font-bold tracking-tight sm:text-[1.4rem] ${
            isDark ? "text-white" : "text-brand-950"
          }`}
        >
          Fidelize
          <span className={isDark ? "text-brand-300" : "text-brand-600"}>
            .club
          </span>
        </span>
        {withTagline ? (
          <span
            className={`mt-1 text-[0.5rem] font-medium uppercase tracking-[0.22em] ${
              isDark ? "text-brand-200/80" : "text-ink-muted"
            }`}
          >
            {site.tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
