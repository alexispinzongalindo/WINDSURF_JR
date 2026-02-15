"use client";

import { useEffect, useState } from "react";

const LANG_KEY = "isla_lang";

type Lang = "en" | "es";

export default function LanguageToggle() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = String(window.localStorage.getItem(LANG_KEY) || "en").toLowerCase();
    const next = saved === "es" ? "es" : "en";
    setLang(next);
    document.documentElement.lang = next;
  }, []);

  const updateLang = (next: Lang) => {
    setLang(next);
    window.localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
    window.dispatchEvent(new CustomEvent("isla-lang-change", { detail: { lang: next } }));
  };

  const base = "rounded-md px-2 py-1 text-xs font-medium transition";
  const active = "bg-indigo-600 text-white";
  const idle = "bg-gray-800 text-gray-300 hover:bg-gray-700";

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-900 p-1">
      <button
        type="button"
        onClick={() => updateLang("en")}
        className={`${base} ${lang === "en" ? active : idle}`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => updateLang("es")}
        className={`${base} ${lang === "es" ? active : idle}`}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
    </div>
  );
}
