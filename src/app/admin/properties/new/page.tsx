import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewPropertyView } from "@/app/dashboard/properties/propertyViews";

type SearchParams = Promise<{ error?: string; planActivated?: string }>;

export default async function AdminNewPropertyPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { error, planActivated } = await searchParams;
  return <NewPropertyView area="admin" error={error} planActivated={planActivated} />;
}
