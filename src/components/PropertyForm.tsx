"use client";

import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { IMAGE_CATEGORIES, IMAGE_CATEGORY_LABELS, parseVideoUrls } from "@/lib/format";
import { parseAmenitiesString } from "@/lib/amenities";
import { amenityIcon } from "@/lib/amenityIcons";
import { LocationFields } from "@/components/LocationFields";
import { SmartInput } from "@/components/forms/FormKit";

type PropertyFormActionResult = { redirectTo?: string } | void;

type ImageItem = { url: string; category: string };

type PropertyFormValues = {
  id?: string;
  title: string;
  description: string;
  listingType: "SALE" | "RENT";
  propertyType: string;
  condition: "NEW_BOOKING" | "RESALE" | null;
  price: number;
  priceNegotiable: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  city: string;
  locality: string | null;
  address: string | null;
  amenities: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  images: ImageItem[];
  brochureUrl?: string | null;
  youtubeUrl?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  localityId?: string | null;
  projectId?: string | null;
  commercialSubtype?: string | null;
  pgGender?: string | null;
  pgSharing?: string | null;
  foodIncluded?: boolean;
  furnishing?: string | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  carpetAreaSqft?: number | null;
  superAreaSqft?: number | null;
  facingDirection?: string | null;
  maintenanceCharges?: number | null;
  securityDeposit?: number | null;
  possessionStatus?: string | null;
  bachelorFriendly?: boolean;
  reraNumber?: string | null;
  societyName?: string | null;
  specifications?: string | null;
};

const PROPERTY_TYPES = [
  "APARTMENT",
  "PENTHOUSE",
  "DUPLEX",
  "VILLA",
  "INDEPENDENT_HOUSE",
  "PLOT",
  "COMMERCIAL",
  "OFFICE",
];

// Pronesto.in launched as a rent-only, flats-only listing site — simplified
// here rather than in the shared schema/enum, since noidaprimeproperty.com
// (same form, same code) still needs the full set. NEXT_PUBLIC_SITE_URL is
// baked into each site's own build, so this never needs a DB lookup.
const IS_PRONESTO = process.env.NEXT_PUBLIC_SITE_URL?.includes("pronesto.in") ?? false;

// Shown as their own "Other rooms" checkboxes below (same as Bedrooms/
// Bathrooms being distinct fields, not part of the generic Amenities
// grid) — still submitted under the same "amenities" field name/value, so
// storage/display is unaffected either way.
const OTHER_ROOMS = ["Study Room", "Servant Room"];

export function PropertyForm({
  action,
  defaultValues,
  submitLabel,
  amenityOptions,
  listAsOptions,
  allowManualCoordinates,
  isAdmin,
}: {
  action: (formData: FormData) => PropertyFormActionResult | Promise<PropertyFormActionResult>;
  defaultValues?: Partial<PropertyFormValues>;
  submitLabel: string;
  amenityOptions: { id: string; name: string }[];
  listAsOptions?: { id: string; label: string }[];
  allowManualCoordinates?: boolean;
  isAdmin?: boolean;
}) {
  // Server Action redirect() isn't reliably processed by this Next.js
  // build's client router (see src/app/login/LoginForm.tsx) — action is
  // expected to return { redirectTo } instead of calling redirect() itself,
  // and this component does the actual hard navigation.
  const [actionState, formAction, pending] = useActionState(
    async (_prev: PropertyFormActionResult, formData: FormData) => action(formData),
    undefined as PropertyFormActionResult
  );

  useEffect(() => {
    if (actionState && actionState.redirectTo) {
      window.location.href = actionState.redirectTo;
    }
  }, [actionState]);

  const [images, setImages] = useState<ImageItem[]>(defaultValues?.images ?? []);
  const selectedAmenities = parseAmenitiesString(defaultValues?.amenities ?? null);
  const generalAmenityOptions = amenityOptions.filter(
    (a) => !OTHER_ROOMS.some((room) => room.toLowerCase() === a.name.toLowerCase())
  );
  const isUserAdmin = isAdmin ?? Boolean(listAsOptions);
  const [listingType, setListingType] = useState<"SALE" | "RENT">(
    !isUserAdmin ? "RENT" : (defaultValues?.listingType ?? "SALE")
  );
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(
    defaultValues?.propertyType ?? "APARTMENT"
  );
  const [pendingCategory, setPendingCategory] = useState<string>("OTHER");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [brochureUrl, setBrochureUrl] = useState<string | null>(defaultValues?.brochureUrl ?? null);
  const [brochureUploading, setBrochureUploading] = useState(false);
  const [brochureError, setBrochureError] = useState<string | null>(null);

  const [videoUrls, setVideoUrls] = useState<string[]>(() => {
    const parsed = parseVideoUrls(defaultValues?.youtubeUrl);
    return parsed.length > 0 ? parsed : [""];
  });

  function addVideoField() {
    setVideoUrls((prev) => [...prev, ""]);
  }

  function removeVideoField(index: number) {
    setVideoUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  }

  function updateVideoUrl(index: number, value: string) {
    setVideoUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleBrochureFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBrochureUploading(true);
    setBrochureError(null);

    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/upload/document", { method: "POST", body });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const data = await response.json();
      setBrochureUrl(data.url);
    } catch (error) {
      setBrochureError(error instanceof Error ? error.message : "Upload failed");
    }

    setBrochureUploading(false);
    event.target.value = "";
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch("/api/upload", { method: "POST", body });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        const data = await response.json();
        setImages((prev) => [...prev, { url: data.url, category: pendingCategory }]);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
      }
    }

    setUploading(false);
    event.target.value = "";
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((image) => image.url !== url));
  }

  function updateImageCategory(url: string, category: string) {
    setImages((prev) => prev.map((image) => (image.url === url ? { ...image, category } : image)));
  }

  return (
    <form action={formAction} className="space-y-6">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}
      {brochureUrl && <input type="hidden" name="brochureUrl" value={brochureUrl} />}

      {listAsOptions && listAsOptions.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <label className="text-sm font-medium text-blue-900">List this property as</label>
          <select
            name="onBehalfOfUserId"
            defaultValue=""
            className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Myself</option>
            {listAsOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-blue-700">
            Choose an owner account to list this property on their behalf. Leave as
            &quot;Myself&quot; to list it under your own account.
          </p>
        </div>
      )}

      {images.map((image) => (
        <input key={`url-${image.url}`} type="hidden" name="imageUrls" value={image.url} />
      ))}
      {images.map((image) => (
        <input
          key={`category-${image.url}`}
          type="hidden"
          name="imageCategories"
          value={image.category}
        />
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input
            type="text"
            name="title"
            required
            defaultValue={defaultValues?.title}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {!isUserAdmin && (
          <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50/80 p-4 flex items-start gap-3">
            <span className="text-xl shrink-0">🛡️</span>
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong className="font-bold text-blue-950">Marketplace Verification Policy:</strong> Buy (Sale) properties are exclusively registered & title-audited by Platform Admin to maintain 100% legal escrow security. Owners & Channel Partners register <strong>Rent</strong> properties (Flats, PG / Co-Living, Commercial, Villas, & Houses).
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700">Listing Type</label>
          {isUserAdmin ? (
            <select
              name="listingType"
              value={listingType}
              onChange={(event) => {
                const next = event.target.value as "SALE" | "RENT";
                setListingType(next);
                if (next === "SALE" && selectedPropertyType !== "APARTMENT" && selectedPropertyType !== "VILLA") {
                  setSelectedPropertyType("APARTMENT");
                }
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="RENT">For Rent</option>
              <option value="SALE">For Sale (Admin Curated)</option>
            </select>
          ) : (
            <>
              <input type="hidden" name="listingType" value="RENT" />
              <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-semibold">
                <span>For Rent</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">Rental Marketplace</span>
              </div>
            </>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Property Category</label>
          <select
            name="propertyType"
            value={selectedPropertyType}
            onChange={(e) => setSelectedPropertyType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {listingType === "RENT" ? (
              <>
                <option value="APARTMENT">Flat / Apartment</option>
                <option value="PG">PG / Co-Living (Boys, Girls, Unisex)</option>
                <option value="COMMERCIAL">Commercial (Office, Shop, Warehouse)</option>
                <option value="VILLA">Luxury Villa</option>
                <option value="INDEPENDENT_HOUSE">Independent House / Builder Floor</option>
              </>
            ) : (
              <>
                <option value="APARTMENT">Apartment / Flat</option>
                <option value="PENTHOUSE">Penthouse</option>
                <option value="DUPLEX">Duplex</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            {listingType === "RENT" ? "Monthly Rent (INR)" : "Total Price (INR)"}
          </label>
          <input
            type="number"
            name="price"
            required
            min={0}
            defaultValue={defaultValues?.price}
            placeholder={listingType === "RENT" ? "e.g. 25000" : "e.g. 15000000"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            name="priceNegotiable"
            id="priceNegotiable"
            defaultChecked={defaultValues?.priceNegotiable}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="priceNegotiable" className="text-sm text-slate-700">
            Price negotiable
          </label>
        </div>

        {/* PG Specific Fields */}
        {selectedPropertyType === "PG" && (
          <div className="sm:col-span-2 rounded-2xl border border-purple-200 bg-purple-50/50 p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                <span>🛏️</span> PG &amp; Co-Living Specifications
              </h3>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">PG Gender</label>
              <select
                name="pgGender"
                defaultValue={defaultValues?.pgGender ?? "UNISEX"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="MALE">Boys Only</option>
                <option value="FEMALE">Girls Only</option>
                <option value="UNISEX">Co-Living / Unisex</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Sharing Type</label>
              <select
                name="pgSharing"
                defaultValue={defaultValues?.pgSharing ?? "DOUBLE"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="SINGLE">Single Private Room</option>
                <option value="DOUBLE">Double Sharing (2 Beds)</option>
                <option value="TRIPLE">Triple Sharing (3 Beds)</option>
                <option value="FOUR_PLUS">4+ Multi-Sharing</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Security Deposit (INR)</label>
              <input
                type="number"
                name="securityDeposit"
                min={0}
                defaultValue={defaultValues?.securityDeposit ?? undefined}
                placeholder="e.g. 15000"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Maintenance / Utility Charges (INR/mo)</label>
              <input
                type="number"
                name="maintenanceCharges"
                min={0}
                defaultValue={defaultValues?.maintenanceCharges ?? undefined}
                placeholder="e.g. 1000"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">PG Hostel / Building Name</label>
              <input
                type="text"
                name="societyName"
                defaultValue={defaultValues?.societyName ?? undefined}
                placeholder="e.g. Stanza Living Tokyo House / Zolo Suites"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                name="foodIncluded"
                id="foodIncluded"
                defaultChecked={defaultValues?.foodIncluded}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="foodIncluded" className="text-sm font-semibold text-purple-900">
                🍳 3-Time Chef Meals Included (Breakfast, Lunch &amp; Dinner)
              </label>
            </div>
          </div>
        )}

        {/* Commercial Specific Fields */}
        {(selectedPropertyType === "COMMERCIAL" || selectedPropertyType === "OFFICE" || selectedPropertyType === "SHOP" || selectedPropertyType === "WAREHOUSE") && (
          <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span>🏢</span> Commercial Specifications
              </h3>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Commercial Subtype</label>
              <select
                name="commercialSubtype"
                defaultValue={defaultValues?.commercialSubtype ?? "OFFICE"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="OFFICE">Office Space (IT / Corporate / Co-Working)</option>
                <option value="SHOP">Retail Shop / High-Street Showroom</option>
                <option value="WAREHOUSE">Warehouse / Godown / Logistics Hub</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Furnishing Status</label>
              <select
                name="furnishing"
                defaultValue={defaultValues?.furnishing ?? "FURNISHED"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="FURNISHED">Fully Fitted &amp; Furnished (Plug &amp; Play)</option>
                <option value="WARM_SHELL">Warm Shell</option>
                <option value="BARE_SHELL">Bare Shell</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Super Built-up Area (sqft)</label>
              <input
                type="number"
                name="areaSqft"
                min={0}
                defaultValue={defaultValues?.areaSqft ?? undefined}
                placeholder="e.g. 5000"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Carpet Area (sqft)</label>
              <input
                type="number"
                name="carpetAreaSqft"
                min={0}
                defaultValue={defaultValues?.carpetAreaSqft ?? undefined}
                placeholder="e.g. 4200"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Floor Number</label>
              <input
                type="number"
                name="floorNumber"
                defaultValue={defaultValues?.floorNumber ?? undefined}
                placeholder="e.g. 5"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Total Floors in Building</label>
              <input
                type="number"
                name="totalFloors"
                defaultValue={defaultValues?.totalFloors ?? undefined}
                placeholder="e.g. 18"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Security Deposit (INR)</label>
              <input
                type="number"
                name="securityDeposit"
                min={0}
                defaultValue={defaultValues?.securityDeposit ?? undefined}
                placeholder="e.g. 300000"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Maintenance Charges (INR/mo)</label>
              <input
                type="number"
                name="maintenanceCharges"
                min={0}
                defaultValue={defaultValues?.maintenanceCharges ?? undefined}
                placeholder="e.g. 25000"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Business Park / Mall / Tower Name</label>
              <input
                type="text"
                name="societyName"
                defaultValue={defaultValues?.societyName ?? undefined}
                placeholder="e.g. Advant Navis Business Park, Sector 142"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Residential (Apartment, Villa, House) Specific Fields */}
        {(selectedPropertyType === "APARTMENT" || selectedPropertyType === "PENTHOUSE" || selectedPropertyType === "DUPLEX" || selectedPropertyType === "VILLA" || selectedPropertyType === "INDEPENDENT_HOUSE") && (
          <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🏡</span> Property Details &amp; Dimensions
              </h3>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Society / Project / Tower Name</label>
              <input
                type="text"
                name="societyName"
                defaultValue={defaultValues?.societyName ?? undefined}
                placeholder="e.g. Godrej Woods / DLF The Camellias / ATS Knightsbridge"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Bedrooms (BHK)</label>
              <input
                type="number"
                name="bedrooms"
                min={0}
                defaultValue={defaultValues?.bedrooms ?? undefined}
                placeholder="e.g. 3"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Bathrooms</label>
              <input
                type="number"
                name="bathrooms"
                min={0}
                defaultValue={defaultValues?.bathrooms ?? undefined}
                placeholder="e.g. 3"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Super Built-up Area (sqft)</label>
              <input
                type="number"
                name="areaSqft"
                min={0}
                defaultValue={defaultValues?.areaSqft ?? undefined}
                placeholder="e.g. 1850"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Carpet Area (sqft)</label>
              <input
                type="number"
                name="carpetAreaSqft"
                min={0}
                defaultValue={defaultValues?.carpetAreaSqft ?? undefined}
                placeholder="e.g. 1450"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Furnishing</label>
              <select
                name="furnishing"
                defaultValue={defaultValues?.furnishing ?? "SEMI_FURNISHED"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="FURNISHED">Fully Furnished</option>
                <option value="SEMI_FURNISHED">Semi-Furnished</option>
                <option value="UNFURNISHED">Unfurnished</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Floor Number</label>
              <input
                type="number"
                name="floorNumber"
                defaultValue={defaultValues?.floorNumber ?? undefined}
                placeholder="e.g. 14"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Total Floors</label>
              <input
                type="number"
                name="totalFloors"
                defaultValue={defaultValues?.totalFloors ?? undefined}
                placeholder="e.g. 28"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                {listingType === "RENT" ? "Security Deposit (INR)" : "Booking Token (INR)"}
              </label>
              <input
                type="number"
                name="securityDeposit"
                min={0}
                defaultValue={defaultValues?.securityDeposit ?? undefined}
                placeholder={listingType === "RENT" ? "e.g. 50000" : "e.g. 500000"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Maintenance Charges (INR/mo)</label>
              <input
                type="number"
                name="maintenanceCharges"
                min={0}
                defaultValue={defaultValues?.maintenanceCharges ?? undefined}
                placeholder="e.g. 3500"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {listingType === "RENT" && (
              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="bachelorFriendly"
                  id="bachelorFriendly"
                  defaultChecked={defaultValues?.bachelorFriendly ?? true}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="bachelorFriendly" className="text-sm text-slate-700">
                  Bachelor Friendly / All Family &amp; Working Professionals Welcome
                </label>
              </div>
            )}

            {listingType === "SALE" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">Possession Status</label>
                  <select
                    name="possessionStatus"
                    defaultValue={defaultValues?.possessionStatus ?? "READY_TO_MOVE"}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="READY_TO_MOVE">Ready to Move</option>
                    <option value="UNDER_CONSTRUCTION">Under Construction</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">RERA Registration Number</label>
                  <input
                    type="text"
                    name="reraNumber"
                    defaultValue={defaultValues?.reraNumber ?? undefined}
                    placeholder="e.g. UPRERAPRJ704730"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Condition</label>
                  <select
                    name="condition"
                    defaultValue={defaultValues?.condition ?? "RESALE"}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="NEW_BOOKING">New Booking / Direct Developer</option>
                    <option value="RESALE">Resale</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Other rooms</label>
          <div className="mt-2 flex flex-wrap gap-4">
            {OTHER_ROOMS.map((room) => (
              <label key={room} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="amenities"
                  value={room}
                  defaultChecked={selectedAmenities.some((name) => name.toLowerCase() === room.toLowerCase())}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span aria-hidden="true">{amenityIcon(room)}</span>
                {room}
              </label>
            ))}
          </div>
        </div>

        <LocationFields
          defaultCountryId={defaultValues?.countryId ?? undefined}
          defaultStateId={defaultValues?.stateId ?? undefined}
          defaultCityId={defaultValues?.cityId ?? undefined}
          defaultCityName={defaultValues?.city}
          defaultLocalityId={defaultValues?.localityId ?? undefined}
          defaultLocalityName={defaultValues?.locality ?? undefined}
          defaultProjectId={defaultValues?.projectId ?? undefined}
          excludePropertyId={defaultValues?.id}
          allowManualCoordinates={allowManualCoordinates}
        />

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Address</label>
          <input
            type="text"
            name="address"
            defaultValue={defaultValues?.address ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            name="description"
            required
            rows={5}
            defaultValue={defaultValues?.description}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Amenities</label>
          {generalAmenityOptions.length === 0 ? (
            <p className="mt-1 text-xs text-slate-400">
              No amenities set up yet — add some from the admin Amenities page.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {generalAmenityOptions.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="amenities"
                    value={amenity.name}
                    defaultChecked={selectedAmenities.some(
                      (name) => name.toLowerCase() === amenity.name.toLowerCase()
                    )}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span aria-hidden="true">{amenityIcon(amenity.name)}</span>
                  {amenity.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Contact name</label>
          <input
            type="text"
            name="contactName"
            defaultValue={defaultValues?.contactName ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Contact phone</label>
          <SmartInput kind="mobile"
            type="text"
            name="contactPhone"
            defaultValue={defaultValues?.contactPhone ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Contact email</label>
          <input
            type="email"
            name="contactEmail"
            defaultValue={defaultValues?.contactEmail ?? undefined}
            suppressHydrationWarning
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Property Video Links / Virtual Tours
              </label>
              <p className="text-xs text-slate-500">
                Add multiple YouTube (videos, shorts), Vimeo, or video URLs. Buyers can watch video walkthroughs directly on the listing page.
              </p>
            </div>
            <button
              type="button"
              onClick={addVideoField}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add another video link
            </button>
          </div>

          <div className="space-y-2.5">
            {videoUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg>
                  </div>
                  <input
                    type="url"
                    placeholder={`Video URL #${idx + 1} (e.g. https://www.youtube.com/watch?v=... or shorts)`}
                    value={url}
                    onChange={(e) => updateVideoUrl(idx, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {videoUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVideoField(idx)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Remove this video link"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Hidden input to pass clean newline-separated URLs to server action */}
          <input
            type="hidden"
            name="youtubeUrl"
            value={videoUrls.map((u) => u.trim()).filter(Boolean).join("\n")}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Brochure (PDF)</label>
        <p className="mt-1 text-xs text-slate-500">
          Upload a PDF brochure — buyers will see a download button on the listing page.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleBrochureFile}
            disabled={brochureUploading}
            className="block text-sm"
          />
          {brochureUploading && <p className="text-xs text-slate-500">Uploading…</p>}
        </div>
        {brochureError && <p className="mt-1 text-xs text-red-600">{brochureError}</p>}
        {brochureUrl && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <a href={brochureUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              View uploaded brochure
            </a>
            <button
              type="button"
              onClick={() => setBrochureUrl(null)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Photos</label>
        <p className="mt-1 text-xs text-slate-500">
          Pick the room/area these photos are of, then upload — add more batches for other rooms.
          You can change a photo&apos;s tag any time below.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={pendingCategory}
            onChange={(event) => setPendingCategory(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {IMAGE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {IMAGE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFiles}
            disabled={uploading}
            className="block text-sm"
          />
        </div>
        {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}

        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {images.map((image) => (
              <div key={image.url} className="w-28">
                <div className="relative h-24 w-28 overflow-hidden rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(image.url)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
                <select
                  value={image.category}
                  onChange={(event) => updateImageCategory(image.url, event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-1.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                >
                  {IMAGE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {IMAGE_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={uploading || pending}
        className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
