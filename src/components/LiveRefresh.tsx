"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// Panels that should update on their own. Public pages (home, search, listing detail)
// are left alone, and so is any page that is a form being filled in.
const LIVE_PREFIXES = ["/admin", "/agent", "/investor", "/buyer", "/dashboard", "/dispatch", "/list-property/request/"];
const FORM_HINTS = ["/new", "/edit", "/verify", "/login", "/register"];

const POLL_MS = 4000;
const MIN_GAP_MS = 2000;
const SAFETY_MS = 60000; // full refresh even if no change was seen (e.g. other server process)

function isLivePath(path: string) {
  return LIVE_PREFIXES.some((p) => path.startsWith(p)) && !FORM_HINTS.some((h) => path.includes(h));
}

// Never refresh under someone who is in the middle of typing.
function isTyping() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName === "INPUT") {
    const t = (el as HTMLInputElement).type;
    return !["checkbox", "radio", "button", "submit", "file", "range", "color"].includes(t);
  }
  return false;
}

/**
 * Keeps the current dashboard in step with the database. It asks the server whether
 * anything relevant changed and, if so, re-renders the page in place (no reload, no
 * lost scroll or open dialogs). Works both ways: admin sees user changes, users see
 * admin changes.
 */
export function LiveRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useRef<string | null>(null);
  const lastRefresh = useRef(0);
  const waiting = useRef(false);

  useEffect(() => {
    if (!enabled || !isLivePath(pathname)) return;
    token.current = null;
    let stopped = false;

    const refresh = () => {
      if (isTyping()) {
        waiting.current = true; // try again once they stop
        return;
      }
      waiting.current = false;
      lastRefresh.current = Date.now();
      router.refresh();
    };

    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const { v } = (await res.json()) as { v: string | null };
        if (v == null) return;
        if (token.current === null) {
          token.current = v;
        } else if (v !== token.current) {
          token.current = v;
          if (Date.now() - lastRefresh.current >= MIN_GAP_MS) refresh();
          else waiting.current = true;
        } else if (waiting.current && Date.now() - lastRefresh.current >= MIN_GAP_MS) {
          refresh();
        }
      } catch {
        /* offline or server restarting: try again next tick */
      }
    };

    const poll = window.setInterval(check, POLL_MS);
    const safety = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, SAFETY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    void check();

    return () => {
      stopped = true;
      window.clearInterval(poll);
      window.clearInterval(safety);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, pathname, router]);

  return null;
}
