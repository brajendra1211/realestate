"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm Guddy AI 👋 Ask me anything about how this site works — buying, renting, listing a property, or becoming a channel partner.",
};

export function GuddyChatbot({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The greeting is client-only decoration, not something the model
        // said — excluding it keeps the message list a true back-and-forth.
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Too many messages — please wait a few minutes and try again."
            : "Guddy AI is temporarily unavailable. Please try again shortly."
        );
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach Guddy AI. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 left-5 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-24">
          <div className="flex items-center justify-between bg-brand-700 px-4 py-3 text-white">
            <div>
              <p className="font-display text-sm font-semibold">Guddy AI</p>
              <p className="text-xs text-white/80">Ask about {siteName}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 text-white/90 hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-brand-700 text-white"
                    : "bg-white text-slate-700 shadow-sm"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="w-fit rounded-2xl bg-white px-3 py-2 text-sm text-slate-400 shadow-sm">
                Guddy is typing…
              </div>
            )}
            {error && (
              <div className="w-fit rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-slate-200 p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Guddy AI…"
              disabled={sending}
              className="flex-1 rounded-full border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M3.4 20.6l17.8-8.6-17.8-8.6L3 9.4l12 2.6-12 2.6z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Guddy AI chat" : "Chat with Guddy AI"}
        className="fixed bottom-20 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg transition hover:scale-105 hover:bg-brand-800 sm:bottom-5"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.57 1.26 4.87 3.26 6.47-.08.9-.4 2.3-1.26 3.73 1.56-.2 3.03-.82 4.17-1.76.9.24 1.85.36 2.83.36 5.52 0 10-3.94 10-8.8S17.52 2 12 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
