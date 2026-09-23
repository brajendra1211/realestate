import { DispatchTrigger } from "@/components/DispatchTrigger";

export default function DispatchNewPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Find a nearby agent</h1>
      <p className="mt-2 text-sm text-slate-500">
        We&apos;ll radius-scan for active Prime agents near you and connect you with the first
        one to accept — usually within a minute.
      </p>
      <div className="mt-8 flex justify-center">
        <DispatchTrigger />
      </div>
    </div>
  );
}
