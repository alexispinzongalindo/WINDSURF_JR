"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const LANG_KEY = "isla_lang";

type Lang = "en" | "es";

function getLang(): Lang {
  const value = String(window.localStorage.getItem(LANG_KEY) || "en").toLowerCase();
  return value === "es" ? "es" : "en";
}

function applyLanguage(lang: Lang) {
  document.documentElement.lang = lang;

  document.querySelectorAll<HTMLElement>("[data-i18n-en][data-i18n-es]").forEach((node) => {
    const next = lang === "es" ? node.dataset.i18nEs : node.dataset.i18nEn;
    if (typeof next === "string") node.textContent = next;
  });

  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder-en][data-i18n-placeholder-es]")
    .forEach((node) => {
      const next = lang === "es" ? node.dataset.i18nPlaceholderEs : node.dataset.i18nPlaceholderEn;
      if (typeof next === "string") node.placeholder = next;
    });

  document.querySelectorAll<HTMLElement>("[data-i18n-aria-en][data-i18n-aria-es]").forEach((node) => {
    const next = lang === "es" ? node.dataset.i18nAriaEs : node.dataset.i18nAriaEn;
    if (typeof next === "string") node.setAttribute("aria-label", next);
  });
}

export default function I18nRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    applyLanguage(getLang());

    const onLangChange = (event: Event) => {
      const detail = (event as CustomEvent<{ lang?: string }>).detail;
      const next = String(detail?.lang || "").toLowerCase();
      applyLanguage(next === "es" ? "es" : "en");
    };

    window.addEventListener("isla-lang-change", onLangChange as EventListener);
    return () => {
      window.removeEventListener("isla-lang-change", onLangChange as EventListener);
    };
  }, [pathname]);

  return null;
}
