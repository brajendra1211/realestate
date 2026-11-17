import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EditPropertyView } from "@/app/dashboard/properties/propertyViews";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminEditPropertyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const { saved, error } = await searchParams;
  return <EditPropertyView area="admin" id={id} saved={saved} error={error} />;
}
