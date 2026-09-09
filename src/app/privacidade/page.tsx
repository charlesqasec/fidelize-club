import type { Metadata } from "next";

import { PaginaDocumento } from "@/components/PaginaDocumento";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade do Fidelize.club — documento em elaboração e revisão jurídica.",
  robots: { index: false, follow: true },
};

export default function PrivacidadePage() {
  return (
    <PaginaDocumento title="Política de Privacidade">
      <p>
        Este documento está em elaboração e revisão jurídica. Ele será publicado
        aqui, na íntegra, antes de qualquer coleta de dados de consumidores.
      </p>
      <p>
        A política descreverá quais dados são coletados, com qual finalidade, por
        quanto tempo são mantidos e como o titular pode exercer seus direitos
        previstos na LGPD, incluindo acesso, correção, exportação e exclusão.
      </p>
      <p>
        Esta página pública não realiza cadastro nem coleta dados pessoais de
        visitantes.
      </p>
    </PaginaDocumento>
  );
}
