import type { Metadata } from "next";

import { CardStatusMessage } from "@/components/card/CardStatusMessage";
import { JoinCard } from "@/components/enroll/JoinCard";
import { getProgramEntry } from "@/lib/enroll/getProgramEntry";

export const metadata: Metadata = {
  title: "Entrar no programa",
  description: "Cadastro no programa de fidelidade.",
  robots: { index: false, follow: false },
};

// O conteúdo depende inteiramente do token na URL — nunca renderizado
// estaticamente nem cacheado entre visitantes.
export const dynamic = "force-dynamic";

/**
 * Cadastro público num programa de fidelidade — ETAPA 5.0C.
 *
 * Sem autenticação: o `token` da URL é a única "chave". Toda a resolução
 * (o token corresponde a um link ativo? organização/programa ativos?)
 * acontece em `getProgramEntry` → `public.get_program_entry`, que devolve
 * uma resposta NEUTRA para qualquer falha. Esta página só escolhe QUAL
 * estado mostrar a partir do resultado tipado.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getProgramEntry(token);

  switch (result.status) {
    case "unavailable":
      return (
        <CardStatusMessage
          variant="not_found"
          title="Este link não está disponível"
          description="O link pode estar incompleto, desativado ou expirado. Peça um link atualizado à equipe do estabelecimento."
        />
      );

    case "error":
      return (
        <CardStatusMessage
          variant="unavailable"
          title="Não foi possível carregar agora"
          description="Isso é temporário — tente novamente em instantes. Se o problema continuar, avise a equipe do estabelecimento."
        />
      );

    case "ok":
      return <JoinCard token={token} entry={result.entry} />;
  }
}
