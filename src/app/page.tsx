import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Campanhas } from "@/components/sections/Campanhas";
import { CampanhasEspeciais } from "@/components/sections/CampanhasEspeciais";
import { CartaoDigital } from "@/components/sections/CartaoDigital";
import { ComoFunciona } from "@/components/sections/ComoFunciona";
import { CtaFinal } from "@/components/sections/CtaFinal";
import { Hero } from "@/components/sections/Hero";
import { Kit } from "@/components/sections/Kit";
import { Painel } from "@/components/sections/Painel";
import { Planos } from "@/components/sections/Planos";
import { Segmentos } from "@/components/sections/Segmentos";
import { Seguranca } from "@/components/sections/Seguranca";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <Hero />
        <ComoFunciona />
        <CartaoDigital />
        <Campanhas />
        <Painel />
        <Segmentos />
        <Kit />
        <CampanhasEspeciais />
        <Seguranca />
        <Planos />
        <CtaFinal />
      </main>
      <SiteFooter />
    </>
  );
}
