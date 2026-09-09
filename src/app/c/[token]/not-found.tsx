import { CardStatusMessage } from "@/components/card/CardStatusMessage";

/**
 * Renderizado quando `page.tsx` chama `notFound()` para `status: "not_found"`
 * — token que não corresponde a nenhum `customer_cards.public_token`
 * conhecido (formato inválido, digitado errado, ou nunca existiu). Next.js
 * já responde com status HTTP 404 automaticamente.
 */
export default function CardNotFound() {
  return (
    <CardStatusMessage
      variant="not_found"
      title="Não encontramos esse cartão"
      description="O link pode estar incompleto ou desatualizado. Se você é cliente deste estabelecimento, peça o link do seu Web Card novamente à equipe."
    />
  );
}
