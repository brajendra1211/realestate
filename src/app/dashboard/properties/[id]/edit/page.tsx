import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EditPropertyView } from "../../propertyViews";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const { saved, error } = await searchParams;
  // The admin manages listings inside the admin console, not the owner dashboard.
  if (session.user.role === "ADMIN") {
    const qs = new URLSearchParams();
    if (saved) qs.set("saved", saved);
    if (error) qs.set("error", error);
    const query = qs.toString();
    redirect(`/admin/properties/${id}/edit${query ? `?${query}` : ""}`);
  }

  return <EditPropertyView area="dashboard" id={id} saved={saved} error={error} />;
}
