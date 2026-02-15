"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const MODEL_OPTIONS = [
  { label: "GPT-5.3-Codex", value: "gpt-5.3-codex" },
  { label: "GPT-5-mini", value: "gpt-5-mini" },
  { label: "GPT-4.1-mini", value: "gpt-4.1-mini" },
];

const EFFORT_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default function AgentPage() {
  const searchParams = useSearchParams();
  const selectedTemplate = String(searchParams.get("template") || "").trim();
  const [lang, setLang] = useState<"en" | "es">("en");

  const initialAssistantMessage = useMemo(() => {
    const isSpanish = lang === "es";
    if (selectedTemplate.toLowerCase() === "bookflow") {
      return isSpanish
        ? "Excelente eleccion. Seleccionaste la plantilla BookFlow. Soy tu agente IA de islaAPP. Dime que quieres cambiar primero."
        : "Great choice. You selected the BookFlow template. I am your islaAPP AI agent. Tell me what you want to change first.";
    }
    return isSpanish
      ? "Hola, soy tu agente IA de islaAPP. Como te puedo ayudar hoy?"
      : "Hi, I am your islaAPP AI agent. How can I help you today?";
  }, [selectedTemplate, lang]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialAssistantMessage },
  ]);
  const [draft, setDraft] = useState("");
  const [model, setModel] = useState("gpt-5.3-codex");
  const [effort, setEffort] = useState("medium");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = String(window.localStorage.getItem("isla_lang") || "en").toLowerCase();
    setLang(saved === "es" ? "es" : "en");

    const onLang = (event: Event) => {
      const detail = (event as CustomEvent<{ lang?: string }>).detail;
      const next = String(detail?.lang || "en").toLowerCase();
      setLang(next === "es" ? "es" : "en");
    };
    window.addEventListener("isla-lang-change", onLang as EventListener);
    return () => window.removeEventListener("isla-lang-change", onLang as EventListener);
  }, []);

  useEffect(() => {
    setMessages([{ role: "assistant", content: initialAssistantMessage }]);
    setError("");
  }, [initialAssistantMessage]);

  const canSend = useMemo(
    () => !isSending && draft.trim().length > 0,
    [isSending, draft],
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSend) return;

    setError("");
    const userText = draft.trim();
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setDraft("");
    setIsSending(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          effort,
          messages: nextMessages,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(String(payload?.error || "Agent request failed."));
      }
      const reply = String(payload?.reply || "").trim();
      if (!reply) {
        throw new Error("Agent returned an empty response.");
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <div className="mx-auto max-w-5xl rounded-4xl border border-gray-800 bg-gray-950/80 p-4 shadow-xl md:p-6">
        {selectedTemplate ? (
          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
            Template: {selectedTemplate}
          </div>
        ) : null}
        <div className="mb-4 max-h-[48vh] min-h-[260px] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`mb-3 max-w-[90%] rounded-2xl px-4 py-3 text-sm md:text-base ${
                msg.role === "assistant"
                  ? "bg-gray-800 text-gray-100"
                  : "ml-auto bg-indigo-600 text-white"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isSending ? (
            <div className="max-w-[90%] rounded-2xl bg-gray-800 px-4 py-3 text-sm text-gray-300">
              Thinking...
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="rounded-3xl border border-gray-800 bg-gray-950 p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={lang === "es" ? "Pide cambios o nuevas funciones" : "Ask for follow-up changes"}
            className="mb-4 h-24 w-full resize-none rounded-2xl border border-transparent bg-transparent px-2 py-1 text-xl text-gray-100 placeholder:text-gray-500 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <span>{lang === "es" ? "Modelo" : "Model"}</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100"
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <span>{lang === "es" ? "Razonamiento" : "Reasoning"}</span>
                <select
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100"
                >
                  {EFFORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={lang === "es" ? "Enviar mensaje" : "Send message"}
            >
              ↑
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}
