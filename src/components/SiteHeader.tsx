"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowRight, ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { commercialHref, nav } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`site-header fixed inset-x-0 top-0 z-50 ${
        scrolled || open
          ? "border-b border-line bg-white/90 shadow-sm shadow-brand-950/5 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      {/* Compacta levemente ao rolar; a navegação continua inteira. */}
      <div
        className={`site-header__bar mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 ${
          scrolled && !open ? "py-2.5" : "py-3.5"
        }`}
      >
        <Link
          href="/"
          aria-label="Fidelize.club — início"
          className="shrink-0 rounded-lg"
        >
          <Logo tone={scrolled || open ? "light" : "dark"} />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    scrolled
                      ? "text-ink-soft hover:text-brand-700"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <ButtonLink href={commercialHref()} size="md">
            Quero Fidelizar Meu Negócio
            <ArrowRight />
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl lg:hidden ${
            scrolled || open
              ? "text-ink ring-1 ring-line"
              : "text-white ring-1 ring-white/25"
          }`}
        >
          <span className="sr-only">
            {open ? "Fechar menu" : "Abrir menu de navegação"}
          </span>
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <path d="m6 6 12 12M18 6 6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t border-line bg-white shadow-xl shadow-brand-950/10 lg:hidden"
      >
        <nav aria-label="Principal (mobile)" className="px-5 py-4 sm:px-8">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg py-3 text-base font-medium text-ink-soft hover:text-brand-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink
            href={commercialHref()}
            className="mt-3 w-full"
            onClick={() => setOpen(false)}
          >
            Quero Fidelizar Meu Negócio
            <ArrowRight />
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
