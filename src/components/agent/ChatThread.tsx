"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socketClient";
import { sendChatMessageAction } from "@/app/agent/broadcast/actions";

type ChatMessage = {
  id: string;
  fromAgentId: string;
  message: string;
  createdAt: string | Date;
};

export function ChatThread({
  broadcastId,
  myAgentId,
  otherAgentId,
  initialMessages,
}: {
  broadcastId: string;
  myAgentId: string;
  otherAgentId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join", {
      chatBroadcastId: broadcastId,
      chatAgentAId: myAgentId,
      chatAgentBId: otherAgentId,
    });

    function onMessage(payload: ChatMessage) {
      setMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
    }
    socket.on("chat:message", onMessage);
    return () => {
      socket.off("chat:message", onMessage);
    };
  }, [broadcastId, myAgentId, otherAgentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-[60vh] flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">No messages yet — say hello.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.fromAgentId === myAgentId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  message.fromAgentId === myAgentId
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {message.message}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form action={sendChatMessageAction} className="flex items-center gap-2 border-t border-slate-200 p-3">
        <input type="hidden" name="broadcastId" value={broadcastId} />
        <input type="hidden" name="toAgentId" value={otherAgentId} />
        <input
          type="text"
          name="message"
          required
          placeholder="Type a message…"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
