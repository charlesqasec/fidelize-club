import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CardStatusMessage } from "@/components/card/CardStatusMessage";
import { WebCard } from "@/components/card/WebCard";
import { getPublicCardByToken } from "@/lib/card/getPublicCard";

export const metadata: Metadata = {
  title: "Seu cartão",
  description: "Cartão Digital Fidelize.club.",
  robots: { index: false, follow: false },
};

// O conteúdo depende inteiramente do token na URL — nunca deve ser
// renderizado estaticamente nem cacheado entre visitantes diferentes.
export const dynamic = "force-dynamic";

/**
 * Web Card público — canal oficial e permanente do consumidor
 * (docs/ARQUITETURA.md, seção 2), independente de Apple/Google Wallet.
 *
 * Sem autenticação Supabase: o `token` da URL é a única "chave" desta
 * página. Toda a resolução de segurança (o token corresponde a um cartão
 * de verdade? está ativo?) acontece em `getPublicCardByToken` — esta
 * página só decide QUAL estado mostrar a partir do resultado tipado,
 * nunca interpreta um erro do Supabase diretamente.
 *
 * `not_found` usa `notFound()` (Next.js) + `src/app/c/[token]/not-found.tsx`
 * — mesmo padrão já usado em `src/app/admin/org/[organizationId]/layout.tsx`
 * para "organização alheia/inexistente".
 */
export default async function WebCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicCardByToken(token);

  switch (result.status) {
    case "not_found":
      notFound();

    case "card_inactive":
      return (
        <CardStatusMessage
          variant="inactive"
          title="Este cartão não está mais ativo"
          description={
            result.organizationName
              ? `Seu cartão em ${result.organizationName} foi desativado. Fale com a equipe do estabelecimento para mais informações.`
              : "Este cartão foi desativado. Fale com a equipe do estabelecimento para mais informações."
          }
        />
      );

    case "program_inactive":
      return (
        <CardStatusMessage
          variant="paused"
          title="Este programa não está mais disponível"
          description={
            result.organizationName
              ? `O programa de fidelidade de ${result.organizationName} foi encerrado. Seus dados continuam guardados com segurança.`
              : "Este programa de fidelidade foi encerrado. Seus dados continuam guardados com segurança."
          }
        />
      );

    case "unavailable":
      return (
        <CardStatusMessage
          variant="unavailable"
          title="Não foi possível abrir seu cartão agora"
          description="Isso é temporário — tente novamente em instantes. Se o problema continuar, avise a equipe do estabelecimento."
        />
      );

    case "ok":
      return <WebCard card={result.card} token={token} />;
  }
}
