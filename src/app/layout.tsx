import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";

import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "programa de fidelidade",
    "fidelização de clientes",
    "cartão fidelidade digital",
    "NFC",
    "negócios locais",
    "recorrência",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1e0b47",
  colorScheme: "light",
};

/**
 * Marca `html[data-js]` antes da primeira pintura. Os estados iniciais
 * ocultos do scroll reveal (globals.css) só existem sob esse atributo —
 * sem JavaScript, todo o conteúdo fica visível.
 */
const markJs = "document.documentElement.setAttribute('data-js','')";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: markJs }} />
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-brand-800 focus:shadow-lg"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
