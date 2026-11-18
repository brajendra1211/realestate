import { NextResponse } from "next/server";
import { askGuddyAI, ChatbotError, isChatbotConfigured, type ChatMessage } from "@/lib/chatbot";

// Simple in-memory per-IP limiter — this is a public, unauthenticated route
// (any site visitor, logged in or not) backed by a paid LLM call, so it
// needs *some* abuse guard even though it isn't shared across server
// instances/restarts.
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

function isValidHistory(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 20 &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0 &&
        m.content.length <= 2000
    )
  );
}

export async function POST(request: Request) {
  if (!isChatbotConfigured()) {
    return NextResponse.json({ error: "notConfigured" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rateLimited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const messages = body?.messages;
  if (!isValidHistory(messages)) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  try {
    const { reply, properties, whatsappLink } = await askGuddyAI(messages);
    return NextResponse.json({ reply, properties, whatsappLink });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
