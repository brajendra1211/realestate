import { SingleImageField } from "@/components/SingleImageField";

type GeoPageFormValues = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  heroImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  description: string | null;
  published: boolean;
};

export function GeoPageForm({
  action,
  defaultValues,
  hiddenFields,
  submitLabel,
  refetchAction,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues: GeoPageFormValues;
  hiddenFields?: Record<string, string>;
  submitLabel: string;
  refetchAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={defaultValues.id} />
      {hiddenFields &&
        Object.entries(hiddenFields).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={defaultValues.name}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Changing the name automatically re-detects coordinates on save.
          </p>
        </div>

        <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm">
            <span className="font-medium text-slate-700">Coordinates: </span>
            {defaultValues.latitude != null && defaultValues.longitude != null ? (
              <span className="text-slate-600">
                {defaultValues.latitude.toFixed(4)}, {defaultValues.longitude.toFixed(4)}
              </span>
            ) : (
              <span className="text-amber-600">not detected yet</span>
            )}
            <p className="mt-0.5 text-xs text-slate-400">
              Auto-detected from the name. Powers &quot;Properties near me&quot;.
            </p>
          </div>
          {refetchAction && (
            <button
              type="submit"
              formAction={refetchAction}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Re-detect
            </button>
          )}
        </div>

        <SingleImageField
          name="heroImage"
          label="Hero image"
          defaultValue={defaultValues.heroImage}
        />

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            name="published"
            id="published"
            defaultChecked={defaultValues.published}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="published" className="text-sm text-slate-700">
            Published (visible publicly)
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">
            Description (SEO content, shown on the page)
          </label>
          <textarea
            name="description"
            rows={4}
            defaultValue={defaultValues.description ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            SEO meta title (auto-generated if blank)
          </label>
          <input
            type="text"
            name="metaTitle"
            defaultValue={defaultValues.metaTitle ?? undefined}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            SEO meta description (auto-generated if blank)
          </label>
          <input
            type="text"
            name="metaDescription"
            defaultValue={defaultValues.metaDescription ?? undefined}
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
