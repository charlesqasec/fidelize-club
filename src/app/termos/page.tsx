import type { Metadata } from "next";

import { PaginaDocumento } from "@/components/PaginaDocumento";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de Uso do Fidelize.club — documento em elaboração e revisão jurídica.",
  robots: { index: false, follow: true },
};

export default function TermosPage() {
  return (
    <PaginaDocumento title="Termos de Uso">
      <p>
        Este documento está em elaboração e revisão jurídica. Ele será publicado
        aqui, na íntegra, antes da contratação do serviço.
      </p>
      <p>
        Enquanto isso, qualquer dúvida sobre condições de uso, cancelamento ou
        tratamento de dados pode ser encaminhada diretamente à equipe do
        Fidelize.club.
      </p>
    </PaginaDocumento>
  );
}
