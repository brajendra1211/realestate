export function SearchBar() {
  return (
    <form
      action="/properties"
      className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl border-2 border-slate-200/80 bg-white/95 p-2 shadow-xl shadow-slate-900/5 backdrop-blur-md transition-all focus-within:border-slate-400 sm:flex-row sm:items-center sm:rounded-full"
    >
      <div className="flex flex-1 items-center gap-2.5 rounded-xl px-4 sm:rounded-full">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-slate-400">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <input
          type="text"
          name="city"
          placeholder="Enter city, locality or project..."
          className="w-full bg-transparent py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
        />
      </div>

      <div className="hidden h-7 w-px bg-slate-200 sm:block" />

      <div className="flex items-center gap-2 rounded-xl px-3 sm:rounded-full">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-slate-400">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 21V8l8-5 8 5v13M9 21v-6h6v6"
          />
        </svg>
        <select
          name="listingType"
          defaultValue=""
          className="w-full bg-transparent py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider focus:outline-none cursor-pointer sm:w-auto"
        >
          <option value="">Buy or Rent</option>
          <option value="SALE">Buy Only</option>
          <option value="RENT">Rent Only</option>
        </select>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] sm:rounded-full"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-amber-400">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <span>Search</span>
      </button>
    </form>
  );
}
