import { SingleImageField } from "@/components/SingleImageField";

type DeveloperFormValues = {
  id?: string;
  name: string;
  logoUrl: string | null;
  about: string | null;
  website: string | null;
  city: string | null;
  locality: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  verified: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
};

export function DeveloperForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: Partial<DeveloperFormValues>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Developer / Builder name</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={defaultValues?.name}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <SingleImageField name="logoUrl" label="Logo" defaultValue={defaultValues?.logoUrl} />

        <div>
          <label className="text-sm font-medium text-slate-700">Website</label>
          <input
            type="url"
            name="website"
            defaultValue={defaultValues?.website ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">City</label>
          <input
            type="text"
            name="city"
            defaultValue={defaultValues?.city ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Locality</label>
          <input
            type="text"
            name="locality"
            defaultValue={defaultValues?.locality ?? undefined}
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

        <div>
          <label className="text-sm font-medium text-slate-700">Contact phone</label>
          <input
            type="text"
            name="contactPhone"
            defaultValue={defaultValues?.contactPhone ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            name="verified"
            id="verified"
            defaultChecked={defaultValues?.verified}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="verified" className="text-sm text-slate-700">
            Verified developer
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">About</label>
          <textarea
            name="about"
            rows={4}
            defaultValue={defaultValues?.about ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">SEO meta title</label>
          <input
            type="text"
            name="metaTitle"
            defaultValue={defaultValues?.metaTitle ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">SEO meta description</label>
          <input
            type="text"
            name="metaDescription"
            defaultValue={defaultValues?.metaDescription ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
