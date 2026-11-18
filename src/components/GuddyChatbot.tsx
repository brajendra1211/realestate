"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

type ChatProperty = {
  slug: string;
  title: string;
  price: number;
  listingType: "SALE" | "RENT";
  bedrooms: number | null;
  city: string;
  locality: string | null;
  imageUrl: string | null;
  href: string;
};

type ChatMessage = { role: "user" | "assistant"; content: string; properties?: ChatProperty[] };

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm Guddy AI 👋 Ask me anything about how this site works, or tell me what property you're looking for — e.g. \"2BHK in Noida for rent\".",
};

// Chrome/Edge expose this under a vendor-prefixed name; not available at all
// on Firefox/Safari, so the mic button simply doesn't render there.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function PropertyResultCard({ property }: { property: ChatProperty }) {
  return (
    <Link
      href={property.href}
      className="flex gap-2.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {property.imageUrl ? (
          // Chat-widget thumbnail only — not worth Next/Image's overhead here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={property.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800">{property.title}</p>
        <p className="text-xs text-slate-500">
          {property.bedrooms ? `${property.bedrooms} BHK · ` : ""}
          {property.locality ?? property.city}
        </p>
        <p className="text-xs font-bold text-brand-700">{formatPrice(property.price, property.listingType)}</p>
      </div>
    </Link>
  );
}

export function GuddyChatbot({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Feature detection only — must run post-mount (not during the lazy
  // useState initializer) since SSR has no `window` and hydration requires
  // the first client render to match the server's output exactly.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

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
        body: JSON.stringify({
          messages: next.filter((m) => m !== GREETING).map((m) => ({ role: m.role, content: m.content })),
        }),
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
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, properties: data.properties }]);
    } catch {
      setError("Couldn't reach Guddy AI. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function toggleVoiceInput() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 left-5 z-50 flex h-[32rem] w-[23rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-24">
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
              <div key={i} className="space-y-2">
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-brand-700 text-white"
                      : "bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
                {m.properties && m.properties.length > 0 && (
                  <div className="space-y-1.5">
                    {m.properties.map((p) => (
                      <PropertyResultCard key={p.slug} property={p} />
                    ))}
                  </div>
                )}
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
              placeholder={listening ? "Listening…" : "Ask Guddy AI…"}
              disabled={sending}
              className="flex-1 rounded-full border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-60"
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={sending}
                aria-label={listening ? "Stop voice input" : "Speak your question"}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50 ${
                  listening ? "animate-pulse bg-red-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
                  <path d="M17 11a1 1 0 10-2 0 3 3 0 01-6 0 1 1 0 10-2 0 5 5 0 004 4.9V18H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.1a5 5 0 004-4.9z" />
                </svg>
              </button>
            )}
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3" />
            <circle cx="12" cy="6" r="1.2" fill="currentColor" stroke="none" />
            <rect x="4" y="9" width="16" height="11" rx="4" />
            <path strokeLinecap="round" d="M8 14.5h.01M16 14.5h.01" strokeWidth={2.4} />
            <path strokeLinecap="round" d="M9.5 17.5c.9.6 1.9.9 2.5.9s1.6-.3 2.5-.9" />
            <path strokeLinecap="round" d="M1.5 13v3M22.5 13v3" />
          </svg>
        )}
      </button>
    </>
  );
}
