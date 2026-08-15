export function SearchBar() {
  return (
    <form
      action="/properties"
      className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur sm:flex-row sm:items-center sm:rounded-full"
    >
      <div className="flex flex-1 items-center gap-2 rounded-xl px-3 sm:rounded-full">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-slate-400">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <input
          type="text"
          name="city"
          placeholder="City or locality (e.g. Bengaluru)"
          className="w-full bg-transparent py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <div className="hidden h-6 w-px bg-slate-200 sm:block" />

      <div className="flex items-center gap-2 rounded-xl px-3 sm:rounded-full">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-slate-400">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M4 21V8l8-5 8 5v13M9 21v-6h6v6"
          />
        </svg>
        <select
          name="listingType"
          defaultValue=""
          className="w-full bg-transparent py-2.5 text-sm text-slate-800 focus:outline-none sm:w-auto"
        >
          <option value="">Buy or Rent</option>
          <option value="SALE">Buy</option>
          <option value="RENT">Rent</option>
        </select>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:shadow-md hover:shadow-blue-600/30 hover:brightness-105 active:scale-[0.98] sm:rounded-full"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        Search
      </button>
    </form>
  );
}
