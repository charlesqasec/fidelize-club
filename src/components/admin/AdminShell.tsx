"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Logo } from "@/components/ui/Logo";
import {
  IconArrowLeft,
  IconChart,
  IconLogout,
  IconMegaphone,
  IconMenu,
  IconNfc,
  IconRepeat,
  IconStar,
  IconStore,
  IconUsers,
  IconWrench,
  IconX,
  type IconComponent,
} from "@/components/ui/Icons";

/**
 * Só uma CHAVE (string) atravessa a fronteira Server -> Client, nunca o
 * componente do ícone em si: os layouts que montam `nav` são Server
 * Components, e uma função (o componente React do ícone) não pode ser
 * serializada num prop de Server Component para Client Component — React
 * lança "Functions cannot be passed directly to Client Components". O
 * mapa de verdade (chave -> componente) só existe aqui, no módulo client.
 */
export type NavIconKey =
  | "chart"
  | "store"
  | "repeat"
  | "users"
  | "megaphone"
  | "nfc"
  | "star"
  | "wrench";

const ICONS: Record<NavIconKey, IconComponent> = {
  chart: IconChart,
  store: IconStore,
  repeat: IconRepeat,
  users: IconUsers,
  megaphone: IconMegaphone,
  nfc: IconNfc,
  star: IconStar,
  wrench: IconWrench,
};

export type NavItem = {
  label: string;
  href: string;
  icon: NavIconKey;
  /** true = só ativo em match exato (a "Visão geral" de cada contexto). */
  exact?: boolean;
};

export type AdminOrgContext = {
  id: string;
  name: string;
};

function isActivePath(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function initialsOf(email: string | undefined) {
  const first = email?.trim().charAt(0);
  return first ? first.toUpperCase() : "•";
}

function NavLinks({
  nav,
  onNavigate,
}: {
  nav: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções do painel" className="px-3">
      <ul className="space-y-0.5">
        {nav.map((item) => {
          const active = isActivePath(pathname, item);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-brand-50 text-brand-800"
                    : "text-ink-soft hover:bg-surface-soft hover:text-brand-900",
                ].join(" ")}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600"
                  />
                ) : null}
                <Icon
                  className={[
                    "h-5 w-5 shrink-0 transition-colors duration-150",
                    active
                      ? "text-brand-600"
                      : "text-ink-muted group-hover:text-brand-600",
                  ].join(" ")}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Bloco que diz, dentro da sidebar, em qual contexto o usuário está:
 * a PLATAFORMA (equipe Fidelize, visão cross-tenant) ou um
 * ESTABELECIMENTO específico. Repete de propósito a informação da faixa
 * "Administrando:" — a faixa é o aviso, este bloco é a âncora permanente.
 */
function ContextCard({ orgContext }: { orgContext: AdminOrgContext | null }) {
  if (orgContext) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-soft/70 px-3 py-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-900/20"
        >
          <IconStore className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Estabelecimento
          </p>
          <p className="truncate text-sm font-semibold text-brand-950">
            {orgContext.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-3 py-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-950 text-white"
      >
        <IconChart className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-brand-600">
          Plataforma
        </p>
        <p className="truncate text-sm font-semibold text-brand-950">
          Equipe Fidelize
        </p>
      </div>
    </div>
  );
}

function SidebarContent({
  nav,
  orgContext,
  email,
  viewerLabel,
  onNavigate,
}: {
  nav: NavItem[];
  orgContext: AdminOrgContext | null;
  email: string | undefined;
  viewerLabel: string | undefined;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-4">
        <ContextCard orgContext={orgContext} />
      </div>
      <p className="px-6 pb-1.5 pt-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        Navegação
      </p>
      <div className="flex-1 overflow-y-auto pb-4">
        <NavLinks nav={nav} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
          >
            {initialsOf(email)}
          </span>
          <div className="min-w-0">
            {email ? (
              <p className="truncate text-xs font-medium text-brand-950">
                {email}
              </p>
            ) : null}
            {viewerLabel ? (
              <p className="truncate text-[0.7rem] text-ink-muted">
                {viewerLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Shell visual do Fidelize Admin — layout + navegação, sem nenhuma regra de
 * negócio. A guarda de acesso (sessão + autorização) continua inteiramente
 * nos layouts que renderizam este componente
 * (`src/app/admin/(platform)/layout.tsx` e
 * `src/app/admin/org/[organizationId]/layout.tsx`) — este arquivo só
 * decide como as coisas aparecem, nunca quem pode entrar.
 *
 * `nav` é passado pelo layout chamador porque a navegação muda de
 * significado por contexto (ETAPA 3.2.1, docs/ARQUITETURA.md seção 10):
 * PLATAFORMA (equipe Fidelize, visão cross-tenant) vs. ORGANIZAÇÃO
 * (equipe do estabelecimento, ou platform_admin "dentro" de um tenant).
 * `orgContext`, quando presente, mostra a faixa "Administrando: [nome]" —
 * `showPlatformSwitch` controla se aparece o link de volta à plataforma
 * (só faz sentido para quem TEM uma visão de plataforma pra voltar, ou
 * seja, só para platform_admin; um membro de estabelecimento nunca vê essa
 * opção, porque para ele não existe "plataforma" nenhuma).
 *
 * `viewerLabel` é só um rótulo de exibição ("Equipe Fidelize",
 * "Proprietário") — nunca é usado para decidir acesso.
 */
export function AdminShell({
  email,
  logoutAction,
  nav,
  orgContext = null,
  showPlatformSwitch = false,
  viewerLabel,
  children,
}: {
  email: string | undefined;
  logoutAction: () => Promise<void>;
  nav: NavItem[];
  orgContext?: AdminOrgContext | null;
  showPlatformSwitch?: boolean;
  viewerLabel?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Fecha o drawer ao trocar de rota (ex.: botão "voltar" do navegador) —
  // ajuste de estado durante a renderização, não em efeito (evita o
  // cascading render que `react-hooks/set-state-in-effect` aponta; ver
  // https://react.dev/learn/you-might-not-need-an-effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileNavOpen(false);
  }

  // Drawer aberto: trava o scroll do body, fecha com Escape e leva o foco
  // para o botão de fechar; ao fechar, devolve o foco ao botão do menu.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const original = document.body.style.overflow;
    const openButton = openButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKeyDown);
      openButton?.focus();
    };
  }, [mobileNavOpen]);

  const headerHeight = orgContext ? "6.75rem" : "4rem";
  const shellStyle = { "--admin-header-h": headerHeight } as CSSProperties;

  return (
    <div className="min-h-screen bg-surface-soft" style={shellStyle}>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              ref={openButtonRef}
              type="button"
              aria-label="Abrir menu"
              aria-expanded={mobileNavOpen}
              aria-controls="admin-mobile-nav"
              onClick={() => setMobileNavOpen(true)}
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800 lg:hidden"
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <Logo />
            {!orgContext || showPlatformSwitch ? (
              <span className="hidden items-center gap-2 sm:inline-flex">
                <span aria-hidden="true" className="h-5 w-px bg-line" />
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
                  Fidelize Admin
                </span>
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {email ? (
              <span className="hidden max-w-[16rem] items-center gap-2 md:inline-flex">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
                >
                  {initialsOf(email)}
                </span>
                <span className="truncate text-sm text-ink-soft">{email}</span>
              </span>
            ) : null}
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-brand-800 transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <IconLogout className="h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </div>

        {orgContext ? (
          <div className="border-t border-brand-100 bg-brand-50">
            <div className="flex h-11 items-center gap-2.5 px-4 sm:px-6">
              <IconStore
                className="h-4 w-4 shrink-0 text-brand-600"
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="text-ink-muted">Administrando: </span>
                <span className="font-semibold text-brand-900">
                  {orgContext.name}
                </span>
              </p>
              {showPlatformSwitch ? (
                <Link
                  href="/admin"
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-100 hover:text-brand-900"
                >
                  <IconArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Voltar à plataforma</span>
                  <span className="sm:hidden">Plataforma</span>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-[1600px]">
        {/* Sidebar — desktop */}
        <aside
          className="sticky hidden w-64 shrink-0 border-r border-line bg-white lg:block"
          style={{
            top: "var(--admin-header-h)",
            height: "calc(100vh - var(--admin-header-h))",
          }}
        >
          <SidebarContent
            nav={nav}
            orgContext={orgContext}
            email={email}
            viewerLabel={viewerLabel}
          />
        </aside>

        {/* Drawer — mobile (sempre montado, para a transição de entrada/saída) */}
        <div
          id="admin-mobile-nav"
          className={[
            "fixed inset-0 z-50 lg:hidden",
            mobileNavOpen ? "" : "pointer-events-none",
          ].join(" ")}
          aria-hidden={!mobileNavOpen}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fechar menu"
            onClick={() => setMobileNavOpen(false)}
            className={[
              "absolute inset-0 bg-ink/45 transition-opacity duration-200 ease-out motion-reduce:transition-none",
              mobileNavOpen ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu do painel"
            inert={!mobileNavOpen}
            className={[
              "absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-2xl shadow-brand-950/30 transition-transform duration-250 ease-out motion-reduce:transition-none",
              mobileNavOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
              <Logo />
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileNavOpen(false)}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarContent
                nav={nav}
                orgContext={orgContext}
                email={email}
                viewerLabel={viewerLabel}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </div>
        </div>

        <main
          id="conteudo"
          className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        >
          <div key={pathname} className="admin-page mx-auto w-full max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
