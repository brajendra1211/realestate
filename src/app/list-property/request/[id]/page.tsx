import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Loader2, PhoneCall } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { REQUEST_STATUS_LABEL } from "@/lib/listingRequest";
import { AutoRefresh } from "@/components/AutoRefresh";
import { RebuzzButton } from "./RebuzzButton";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ k?: string }>;

const ORDER = ["PENDING_PAYMENT", "SEARCHING", "ACCEPTED", "LINK_SENT", "SUBMITTED"] as const;

export default async function RequestStatusPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const { k } = await searchParams;
  const request = await prisma.listingRequest.findUnique({
    where: { id },
    include: {
      acceptedAgent: { include: { user: { select: { name: true, phone: true } } } },
      agentListing: { select: { slug: true, title: true } },
    },
  });
  if (!request || !k || request.statusToken !== k) notFound();

  const cancelled = request.status === "CANCELLED";
  const idx = ORDER.indexOf(request.status as (typeof ORDER)[number]);
  const live = !cancelled && request.status !== "SUBMITTED";
  const agentName = request.acceptedAgent?.shopName ?? request.acceptedAgent?.user.name;

  const sell = request.purpose === "SELL";
  const paidDone = request.status !== "PENDING_PAYMENT";
  const sellSteps = [
    { key: "paid", label: "Payment received", done: paidDone, text: `₹${request.amount.toLocaleString("en-IN")} · ${request.plan === "GOLD" ? "Gold" : "Basic"} plan` },
    { key: "team", label: "Our team will call you", done: request.status === "SUBMITTED", text: request.status === "ADMIN_DESK" ? "Your sell request is with our team. Keep your phone nearby: we will call you and take your property details and documents." : undefined },
    { key: "live", label: "Your property is listed", done: request.status === "SUBMITTED" },
  ];

  const steps = sell ? sellSteps : [
    { key: "paid", label: "Payment received", done: idx >= 1, text: `₹${request.amount.toLocaleString("en-IN")} · ${request.plan === "GOLD" ? "Gold" : "Basic"} plan` },
    { key: "search", label: "A partner is accepting your request", done: idx >= 2, text: idx === 1 ? "Nearby partners have been alerted. This usually takes a few minutes." : undefined },
    {
      key: "call",
      label: "Your partner will call you",
      done: idx >= 3,
      text: agentName ? `${agentName}${request.acceptedAgent?.agentCode ? ` (${request.acceptedAgent.agentCode})` : ""} is on it. Keep your phone nearby.` : undefined,
    },
    { key: "link", label: "Fill your property details on the link they send", done: idx >= 4, text: idx === 3 ? "Open the link your partner sent you on WhatsApp or SMS." : undefined },
    { key: "live", label: "Your listing is live", done: idx >= 4 && request.status === "SUBMITTED" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <AutoRefresh active={live} />
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Listing request</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-ink">
          {cancelled ? "Request cancelled" : request.status === "SUBMITTED" ? "Your property is live" : REQUEST_STATUS_LABEL[request.status]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {request.ownerName} · {[request.locality, request.city].filter(Boolean).join(", ")}
        </p>

        {request.status === "PENDING_PAYMENT" ? (
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Payment is not complete yet.{" "}
            <Link href="/list-property/request" className="underline">
              Start again
            </Link>
          </div>
        ) : cancelled ? (
          <p className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            This request was cancelled. Please contact support if you were charged.
          </p>
        ) : (
          <ol className="mt-6 space-y-4">
            {steps.map((s, i) => {
              const current = !s.done && (i === 0 || steps[i - 1].done);
              return (
                <li key={s.key} className="flex gap-3">
                  <span className="mt-0.5">
                    {s.done ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    ) : current ? (
                      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                    ) : (
                      <Circle className="h-6 w-6 text-slate-300" />
                    )}
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${s.done || current ? "text-ink" : "text-slate-400"}`}>{s.label}</p>
                    {s.text && <p className="text-xs text-slate-500">{s.text}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {request.status === "SEARCHING" && (
          <RebuzzButton
            requestId={request.id}
            statusToken={request.statusToken}
            lastBuzzAt={request.lastBuzzAt ? request.lastBuzzAt.toISOString() : null}
            buzzCount={request.buzzCount}
          />
        )}

        {request.acceptedAgent && !cancelled && request.status !== "SUBMITTED" && request.acceptedAgent.user.phone && (
          <p className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-50 p-4 text-sm font-semibold text-brand-800">
            <PhoneCall className="h-4 w-4" /> Your partner&apos;s number: {request.acceptedAgent.user.phone}
          </p>
        )}

        {request.agentListing && (
          <Link
            href={`/listings/${request.agentListing.slug}`}
            className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
          >
            View your listing
          </Link>
        )}
      </div>
    </div>
  );
}
