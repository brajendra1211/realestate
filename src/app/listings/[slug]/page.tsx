import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getListingBySlug } from "@/lib/listing";
import { getAgreementUrgency } from "@/lib/listingDelist";
import { getUnlockForBuyer } from "@/lib/unlock";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { getSiteSettings } from "@/lib/site-settings";
import { formatINR, parseVideoUrls, getVideoEmbed, PROPERTY_TYPE_LABELS } from "@/lib/format";
import { UnlockButton } from "@/components/UnlockButton";
import { SwitchAgentButton } from "@/components/SwitchAgentButton";
import { DirectVisitVerification } from "@/components/DirectVisitVerification";
import { unlockListing } from "./actions";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ unlocked?: string }>;

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { unlocked } = await searchParams;

  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const urgency = getAgreementUrgency(listing.agreementExpiryDate, listing.agreementStartDate);

  const session = await auth();
  const isBuyer = session?.user.role === "BUYER";
  const unlock = isBuyer ? await getUnlockForBuyer(session!.user.id, listing.id) : null;
  const isUnlocked = Boolean(unlock);

  let activeAgent = listing.agent;
  if (unlock?.assignedAgentId && unlock.assignedAgentId !== listing.agentId) {
    const { prisma } = await import("@/lib/prisma");
    activeAgent = await prisma.agentProfile.findUnique({
      where: { id: unlock.assignedAgentId },
      include: { user: true },
    });
  }

  const amenities = listing.amenities
    ? listing.amenities.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  const videoUrls = parseVideoUrls(listing.videoUrl);
  const videoEmbeds = videoUrls.map(getVideoEmbed);

  const agent = activeAgent;
  const mapsUrl =
    agent?.shopLatitude != null && agent?.shopLongitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${agent.shopLatitude},${agent.shopLongitude}`
      : null;
  // §3.4: "if the customer self-registered with no agent code, the
  // company's number is shown and the location is the society's, not any
  // specific agent's." Only fetched when actually needed (no agent).
  const siteSettings = !agent && isUnlocked ? await getSiteSettings() : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {unlocked === "1" && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Unlocked! Full details are below.
        </p>
      )}

      <p className="font-mono text-xs text-slate-400">{listing.masterProperty.masterId}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{listing.title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {listing.masterProperty.locality ?? listing.masterProperty.city}, {listing.masterProperty.city}
      </p>

      {urgency.tier === "HOT_DEAL" && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-4 py-2.5 text-white shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <p className="text-sm font-bold">Hot Deal / Urgent Sale — Final 30 Days of Agreement</p>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
            {urgency.daysRemaining} days left
          </span>
        </div>
      )}
      {urgency.tier === "PRIORITY" && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-amber-900">
          <p className="text-xs font-semibold">⚡ Priority Listing ({urgency.daysRemaining} days remaining on agreement)</p>
        </div>
      )}

      {listing.images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.id}
              src={image.url}
              alt=""
              className="aspect-video w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">Price</p>
          <p className="font-semibold text-slate-900">{formatINR(listing.price)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Type</p>
          <p className="font-semibold text-slate-900">
            {PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType}
          </p>
        </div>
        {listing.bedrooms != null && (
          <div>
            <p className="text-xs text-slate-400">Bedrooms</p>
            <p className="font-semibold text-slate-900">{listing.bedrooms}</p>
          </div>
        )}
        {listing.areaSqft != null && (
          <div>
            <p className="text-xs text-slate-400">Area</p>
            <p className="font-semibold text-slate-900">{listing.areaSqft} sqft</p>
          </div>
        )}
      </div>

      <p className="mt-6 whitespace-pre-line text-sm text-slate-700">{listing.description}</p>

      {amenities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {amenities.map((amenity) => (
            <span key={amenity} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {amenity}
            </span>
          ))}
        </div>
      )}

      {listing.nearbyAmenities && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Nearby</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {listing.nearbyAmenities.split(" | ").map((item) => (
              <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {videoEmbeds.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              Video Tours & Virtual Walkthroughs
            </h2>
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
              {videoEmbeds.length} {videoEmbeds.length === 1 ? "Video" : "Videos"}
            </span>
          </div>
          <div
            className={`mt-3 grid gap-4 ${
              videoEmbeds.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
            }`}
          >
            {videoEmbeds.map((video, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm"
              >
                {video.embedUrl ? (
                  <div className="relative aspect-video w-full">
                    <iframe
                      src={video.embedUrl}
                      title={`${listing.title} video tour ${idx + 1}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center bg-slate-900 p-4 text-center text-white">
                    <svg className="h-10 w-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                    </svg>
                    <p className="mt-2 text-sm font-medium">Video Tour #{idx + 1}</p>
                    <a
                      href={video.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Watch Video
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        {isUnlocked ? (
          <>
            <p className="text-sm font-semibold text-green-700">Unlocked</p>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Exact address:</span> {listing.exactAddress}
            </p>
            {agent ? (
              <>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-medium">Channel Partner:</span> {agent.user.name} (
                  <span className="font-mono">{agent.agentCode}</span>)
                </p>
                {agent.shopName && (
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">Shop:</span> {agent.shopName}
                  </p>
                )}
                {agent.user.phone && (
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">Phone:</span> {agent.user.phone}
                  </p>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
                  >
                    View shop location on Google Maps →
                  </a>
                )}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-medium">Listed by:</span> Customer (Gold self-listing) — no
                  referring agent
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-medium">Location:</span>{" "}
                  {listing.masterProperty.locality ?? listing.masterProperty.city}
                </p>
                {siteSettings?.contactPhone && (
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">Company contact:</span> {siteSettings.contactPhone}
                  </p>
                )}
              </>
            )}

            {agent && unlock && (
              <SwitchAgentButton
                listingId={listing.id}
                switchedAlready={Boolean(unlock.switchedAgent)}
                expiresAt={unlock.expiresAt?.toISOString() ?? null}
              />
            )}

            {isUnlocked && (
              <DirectVisitVerification
                listingId={listing.id}
                isUnlocked={isUnlocked}
              />
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Exact address, agent name, phone, and shop location are hidden. Unlock this listing for
              ₹100 to reveal them instantly.
            </p>
            {isRazorpayConfigured() ? (
              <div className="mt-3">
                <UnlockButton agentListingId={listing.id} slug={listing.slug} />
              </div>
            ) : (
              <form action={unlockListing} className="mt-3">
                <input type="hidden" name="agentListingId" value={listing.id} />
                <input type="hidden" name="slug" value={listing.slug} />
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Pay ₹100 &amp; Unlock
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
