"use client";

import Link from "next/link";
import Logo from "./logo";
import MobileMenu from "./mobile-menu";
import LanguageToggle from "./language-toggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-[100] w-full py-2 md:py-3">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900/95 px-4 shadow-sm">
          {/* Site branding */}
          <div className="flex flex-1 items-center">
            <Logo />
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex md:grow">
            {/* Desktop menu links */}
            <ul className="flex grow flex-wrap items-center justify-center gap-4 text-sm lg:gap-8">
              <li>
                <Link
                  href="/"
                  className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3"
                  data-i18n-en="Home"
                  data-i18n-es="Inicio"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="https://app.islaapp.tech/?plan=trial&lang=en"
                  className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3"
                  data-i18n-en="Start"
                  data-i18n-es="Comenzar"
                >
                  Start
                </Link>
              </li>
              <li>
                <Link
                  href="/templates"
                  className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3"
                  data-i18n-en="Build"
                  data-i18n-es="Construir"
                >
                  Build
                </Link>
              </li>
              <li>
                <Link
                  href="/templates"
                  className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3"
                  data-i18n-en="Templates"
                  data-i18n-es="Plantillas"
                >
                  Templates
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3"
                  data-i18n-en="Pricing"
                  data-i18n-es="Precios"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/help/frequently-asked-questions"
                  className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3"
                  data-i18n-en="Support"
                  data-i18n-es="Soporte"
                >
                  Support
                </Link>
              </li>
            </ul>
          </nav>

          {/* Desktop sign in links */}
          <ul className="flex flex-1 items-center justify-end gap-3">
            <li>
              <LanguageToggle />
            </li>
            <li>
              <Link
                href="/templates"
                className="btn-sm relative bg-linear-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] py-[5px] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%]"
                data-i18n-en="Pick Template"
                data-i18n-es="Elegir Plantilla"
              >
                Pick Template
              </Link>
            </li>
            <li>
              <Link
                href="https://app.islaapp.tech/?plan=trial&lang=en"
                className="btn-sm bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] py-[5px] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
                data-i18n-en="Start Free"
                data-i18n-es="Comenzar Gratis"
              >
                Start Free
              </Link>
            </li>
          </ul>

          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
