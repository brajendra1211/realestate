import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLiveMapData } from "@/lib/liveMap";
import { LiveMapClient } from "@/components/admin/LiveMapClient";

export default async function LiveMapPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");

  const initialData = await getLiveMapData();

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col px-4 py-6 sm:px-8 lg:px-10">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Live Map</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Where every channel partner is right now, and who&apos;s on a scheduled site visit — pin color shows how
          fresh each agent&apos;s location is.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <LiveMapClient initialData={initialData} />
      </div>
    </div>
  );
}
