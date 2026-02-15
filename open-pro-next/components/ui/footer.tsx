import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800/70 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-indigo-200/70 sm:flex-row sm:px-6">
        <p>
          <span className="text-indigo-300">isla</span>
          <span className="text-white">APP</span> © 2026
        </p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link className="transition hover:text-indigo-400" href="/templates">
            <span data-i18n-en="Templates" data-i18n-es="Plantillas">Templates</span>
          </Link>
          <Link className="transition hover:text-indigo-400" href="/pricing">
            <span data-i18n-en="Pricing" data-i18n-es="Precios">Pricing</span>
          </Link>
          <Link className="transition hover:text-indigo-400" href="/help/frequently-asked-questions">
            <span data-i18n-en="Support" data-i18n-es="Soporte">Support</span>
          </Link>
          <Link className="transition hover:text-indigo-400" href="/templates">
            <span data-i18n-en="Pick Template" data-i18n-es="Elegir Plantilla">Pick Template</span>
          </Link>
        </nav>
      </div>
    </footer>
  );
}
