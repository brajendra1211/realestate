export function SearchBar() {
  return (
    <form
      action="/properties"
      className="mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-lg sm:flex-row"
    >
      <input
        type="text"
        name="city"
        placeholder="City or locality (e.g. Bengaluru)"
        className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
      />
      <select
        name="listingType"
        defaultValue=""
        className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Buy or Rent</option>
        <option value="SALE">Buy</option>
        <option value="RENT">Rent</option>
      </select>
      <button
        type="submit"
        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Search
      </button>
    </form>
  );
}
