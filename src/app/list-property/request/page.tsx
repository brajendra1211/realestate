import type { Metadata } from "next";
import { Headphones, Link2, PhoneCall, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanFees } from "@/lib/listingRequest";
import { PageBanner } from "@/components/ui/PageBanner";
import { RequestForm } from "./RequestForm";

export const metadata: Metadata = {
  title: "List your rental property",
  description: "Pay for a plan, a verified channel partner calls you and lists your rental property for you.",
};

const STEPS = [
  { icon: Wallet, title: "Pay for a plan", text: "Choose Basic or Gold and pay online." },
  { icon: Headphones, title: "A partner is alerted", text: "The nearest verified channel partner gets a buzzer." },
  { icon: PhoneCall, title: "They call you", text: "The partner calls to confirm your property." },
  { icon: Link2, title: "Fill details on a link", text: "They send you a link; your listing goes live under their ID." },
];

export default async function ListPropertyRequestPage() {
  const [session, fees] = await Promise.all([auth(), getPlanFees()]);
  const user = session ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true, email: true, role: true } }) : null;
  const prefill = user && (user.role === "OWNER" || user.role === "DEALER") ? user : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageBanner
        art="rent"
        eyebrow="For property owners"
        title={<>List your rental <span className="text-gradient-gold italic">through a partner</span></>}
        subtitle="Owners don't have to fill long forms. A verified channel partner near you handles the listing with you."
      />

      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Step {i + 1}</p>
            <p className="text-sm font-bold text-ink">{s.title}</p>
            <p className="mt-1 text-xs text-slate-500">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <RequestForm
          fees={{ BASIC: fees.BASIC, GOLD: fees.GOLD }}
          defaults={{ name: prefill?.name, phone: prefill?.phone ?? undefined, email: prefill?.email ?? undefined }}
        />
      </div>
    </div>
  );
}
