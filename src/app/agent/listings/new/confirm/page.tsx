import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { findNearbyMasterProperties } from "@/lib/masterProperty";
import { ConfirmListingForm } from "./ConfirmListingForm";

type SearchParams = Promise<{
  city?: string;
  locality?: string;
  address?: string;
  lat?: string;
  lng?: string;
}>;

export default async function ConfirmListingPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { city, locality, address, lat, lng } = await searchParams;
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    redirect("/agent/listings/new");
  }

  const candidates = await findNearbyMasterProperties(city, latitude, longitude);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">List a Property</h1>
      <p className="mt-1 text-sm text-slate-500">
        Step 2 of 2 — confirm the Master Property ID and add listing details.
      </p>

      <ConfirmListingForm
        city={city}
        locality={locality}
        address={address}
        latitude={latitude}
        longitude={longitude}
        candidates={candidates}
      />
    </div>
  );
}
