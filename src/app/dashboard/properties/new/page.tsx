import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewPropertyView } from "../propertyViews";

type SearchParams = Promise<{ error?: string; planActivated?: string }>;

export default async function NewPropertyPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { error, planActivated } = await searchParams;
  // The admin adds listings inside the admin console, not the owner dashboard.
  if (session.user.role === "ADMIN") {
    redirect(`/admin/properties/new${error ? `?error=${encodeURIComponent(error)}` : ""}`);
  }

  // Owners and dealers can no longer list on their own; it happens through a channel partner.
  if (session.user.role === "OWNER" || session.user.role === "DEALER") {
    redirect("/list-property/request");
  }

  return <NewPropertyView area="dashboard" error={error} planActivated={planActivated} />;
}
