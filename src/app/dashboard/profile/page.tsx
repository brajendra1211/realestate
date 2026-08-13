import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SingleImageField } from "@/components/SingleImageField";
import { updateProfile } from "./actions";

type SearchParams = Promise<{ saved?: string }>;

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { saved } = await searchParams;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const isDealer = session.user.role === "DEALER";
  const isOwner = session.user.role === "OWNER";
  const isLister = isDealer || isOwner;
  const publicPath = isDealer ? "dealers" : "owners";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">My profile</h1>
      {isLister && (
        <p className="mt-1 text-sm text-slate-500">
          This information appears on your public profile page for search visibility.
          {user.slug && (
            <>
              {" "}
              <Link href={`/${publicPath}/${user.slug}`} className="text-blue-600 hover:underline">
                View public profile
              </Link>
            </>
          )}
        </p>
      )}

      {isLister && (
        <p
          className={`mt-4 max-w-2xl rounded-lg px-3 py-2 text-sm ${
            user.verified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {user.verified
            ? "Your profile is verified — it's live on the public site."
            : "Your profile is pending admin verification. It (and your listings) won't be publicly visible until verified."}
        </p>
      )}

      {saved === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}

      <form action={updateProfile} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={user.name}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Phone</label>
          <input
            type="tel"
            name="phone"
            defaultValue={user.phone ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {isDealer && (
          <div>
            <label className="text-sm font-medium text-slate-700">Company / Agency name</label>
            <input
              type="text"
              name="company"
              defaultValue={user.company ?? undefined}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {isLister && (
          <>
            <div>
              <label className="text-sm font-medium text-slate-700">About</label>
              <textarea
                name="about"
                rows={4}
                placeholder="Tell buyers and tenants a bit about yourself or your agency."
                defaultValue={user.about ?? undefined}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <SingleImageField
              name="logoUrl"
              label={isDealer ? "Logo" : "Profile photo"}
              defaultValue={user.logoUrl}
            />
            {isDealer && (
              <div>
                <label className="text-sm font-medium text-slate-700">RERA / License number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  defaultValue={user.licenseNumber ?? undefined}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Address / area you serve
              </label>
              <input
                type="text"
                name="address"
                defaultValue={user.address ?? undefined}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Website</label>
              <input
                type="url"
                name="website"
                placeholder="https://"
                defaultValue={user.website ?? undefined}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Instagram</label>
              <input
                type="url"
                name="instagramUrl"
                placeholder="https://instagram.com/…"
                defaultValue={user.instagramUrl ?? undefined}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Facebook</label>
              <input
                type="url"
                name="facebookUrl"
                placeholder="https://facebook.com/…"
                defaultValue={user.facebookUrl ?? undefined}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </>
        )}
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
