import Image from "next/image";
import type { CSSProperties } from "react";

import { ParallaxScene } from "@/components/motion/ParallaxScene";
import { ArrowRight, ButtonLink } from "@/components/ui/Button";
import { IconChart, IconLock, IconMegaphone } from "@/components/ui/Icons";
import { commercialHref } from "@/lib/site";

const benefits = [
  { label: "Mais clientes recorrentes", Icon: IconChart },
  { label: "Dados sob seu controle", Icon: IconLock },
  { label: "Campanhas que fazem voltar", Icon: IconMegaphone },
];

/** Ordem de entrada (hero-in, globals.css). */
const seq = (index: number) => ({ "--i": index }) as CSSProperties;

/** Amplitude do parallax por camada, em px / graus (data-parallax-layer). */
const layer = (px: number, py: number, rx = 0, ry = 0) =>
  ({ "--px": px, "--py": py, "--rx": rx, "--ry": ry }) as CSSProperties;

export function Hero() {
  return (
    <section
      className="on-dark relative isolate overflow-hidden bg-brand-950 text-white"
      aria-labelledby="hero-title"
    >
      <ParallaxScene className="relative">
        {/* Ambiente: gradientes discretos, sem imagem pesada de fundo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div
            data-parallax-layer
            style={layer(-8, -6)}
            className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-700/45 blur-[120px]"
          />
          <div
            data-parallax-layer
            style={layer(-5, -4)}
            className="absolute -right-32 top-24 h-[30rem] w-[30rem] rounded-full bg-brand-500/30 blur-[130px]"
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-brand-950" />
        </div>

        <div className="mx-auto grid w-full max-w-6xl gap-14 px-5 pb-20 pt-28 sm:px-8 sm:pb-24 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10 lg:pb-28 lg:pt-36">
          <div>
            <p
              className="hero-in text-[0.7rem] font-semibold uppercase leading-relaxed tracking-[0.22em] text-brand-300 sm:text-xs"
              style={seq(0)}
            >
              Mais que pontos. Relacionamento de verdade.
            </p>

            <h1
              id="hero-title"
              className="hero-in mt-5 text-balance font-display text-[2.6rem] font-bold leading-[1.05] sm:text-6xl lg:text-[4rem]"
              style={seq(1)}
            >
              Transforme cada cliente em{" "}
              <span className="text-brand-300">um cliente fiel.</span>
            </h1>

            <p
              className="hero-in mt-6 max-w-xl text-pretty text-base leading-relaxed text-brand-100/85 sm:text-lg"
              style={seq(2)}
            >
              Com o Fidelize.club, seus clientes encostam o celular, se
              cadastram em segundos e passam a fazer parte do seu programa de
              fidelidade digital.
            </p>
            <p
              className="hero-in mt-3 max-w-xl text-pretty text-base leading-relaxed text-brand-100/85 sm:text-lg"
              style={seq(2)}
            >
              Mais visitas, mais relacionamento e mais oportunidades para o seu
              negócio.
            </p>

            <div
              className="hero-in mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={seq(3)}
            >
              <ButtonLink href={commercialHref()}>
                Quero Fidelizar Meu Negócio
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="#como-funciona" variant="ghost">
                Ver como funciona
              </ButtonLink>
            </div>

            <ul className="hero-in mt-10 grid gap-3 sm:grid-cols-3" style={seq(4)}>
              {benefits.map(({ label, Icon }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 text-sm text-brand-100/90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                    <Icon className="h-4.5 w-4.5 text-brand-300" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Mockups reais do projeto: cartão digital no celular + placa NFC.
              Profundidades diferentes no parallax: celular 5px, placa 9px,
              fundo −8px. */}
          <div className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
            <div className="hero-in-visual" style={seq(2)}>
              <div
                data-parallax-layer
                style={layer(5, 4, 1.2, 1.5)}
                className="overflow-hidden rounded-4xl bg-brand-900/60 shadow-2xl shadow-brand-950/60 ring-1 ring-white/10"
              >
                <Image
                  src="/mockups/cartao-digital-celular.png"
                  alt="Cliente segurando o celular com o Cartão Digital Fidelize aberto, mostrando progresso de 6 de 10 visitas em um estabelecimento de demonstração."
                  width={448}
                  height={800}
                  priority
                  sizes="(max-width: 1023px) 90vw, 40vw"
                  className="h-auto w-full"
                />
              </div>
            </div>

            <div
              className="hero-in-visual absolute -bottom-8 -right-3 w-32 sm:-right-6 sm:w-40 lg:-right-10 lg:w-44"
              style={seq(4)}
            >
              <div
                data-parallax-layer
                style={layer(9, 7)}
                className="relative overflow-hidden rounded-3xl shadow-xl shadow-brand-950/60 ring-1 ring-white/15"
              >
                <Image
                  src="/mockups/placa-nfc.png"
                  alt="Placa NFC personalizada Fidelize.club sobre o balcão de um estabelecimento, com a instrução Encoste aqui."
                  width={434}
                  height={538}
                  sizes="(max-width: 640px) 128px, 176px"
                  className="h-auto w-full"
                />
                {/* Ondas NFC: 3 pulsos quando a cena entra em vista, depois param. */}
                <div className="nfc-waves" aria-hidden="true">
                  <span style={{ "--w": 0 } as CSSProperties} />
                  <span style={{ "--w": 1 } as CSSProperties} />
                  <span style={{ "--w": 2 } as CSSProperties} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ParallaxScene>
    </section>
  );
}
