import Image from "next/image";
import Link from "next/link";

/**
 * Rodapé do Web Card — infraestrutura discreta. A marca principal da
 * experiência é o ESTABELECIMENTO (branding no topo do cartão); a Fidelize
 * aparece aqui só como assinatura pequena, nunca competindo com o
 * branding do negócio (docs/ARQUITETURA.md, seção 2 e 10).
 */
export function CardFooter() {
  return (
    <footer className="mx-auto w-full max-w-md px-5 pb-9 pt-4 text-center">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-ink-muted transition-colors hover:text-brand-700"
      >
        <Image
          src="/marca/fidelize-simbolo.png"
          alt=""
          aria-hidden="true"
          width={158}
          height={178}
          className="h-3.5 w-auto opacity-60"
        />
        <span>
          Powered by <span className="font-semibold">Fidelize.club</span>
        </span>
      </Link>
    </footer>
  );
}
