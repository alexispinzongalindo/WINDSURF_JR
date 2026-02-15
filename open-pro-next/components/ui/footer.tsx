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
            Templates
          </Link>
          <Link className="transition hover:text-indigo-400" href="/pricing">
            Pricing
          </Link>
          <Link className="transition hover:text-indigo-400" href="/help/frequently-asked-questions">
            Support
          </Link>
          <Link className="transition hover:text-indigo-400" href="/templates">
            Pick Template
          </Link>
        </nav>
      </div>
    </footer>
  );
}
