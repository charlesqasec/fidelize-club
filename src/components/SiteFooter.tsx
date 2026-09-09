import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import { site } from "@/lib/site";

/**
 * Links reais apenas. Sem perfis de redes sociais enquanto não existirem
 * URLs confirmadas — link quebrado é pior do que ausência de link.
 */
const groups = [
  {
    title: "Produto",
    links: [
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Benefícios", href: "#cartao-digital" },
      { label: "Planos", href: "#planos" },
    ],
  },
  {
    title: "Confiança",
    links: [
      { label: "Segurança", href: "#seguranca" },
      { label: "Termos de Uso", href: "/termos" },
      { label: "Política de Privacidade", href: "/privacidade" },
    ],
  },
  {
    title: "Fale conosco",
    links: [{ label: "Contato", href: "#contato" }],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="on-dark border-t border-white/10 bg-brand-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Logo tone="dark" withTagline />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-brand-200/70">
              Plataforma de fidelização e recorrência para negócios locais.
            </p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-brand-100/75 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-[0.8rem] text-brand-200/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. Todos os direitos reservados.
          </p>
          <p>{site.domain}</p>
        </div>
      </div>
    </footer>
  );
}
