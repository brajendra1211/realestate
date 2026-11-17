import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = new URLSearchParams({ tab: "payouts" });
  for (const [k, v] of Object.entries(await searchParams)) if (v) params.set(k, v);
  redirect(`/admin/partners?${params}`);
}
