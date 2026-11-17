import { OwnerPortalCard } from "./OwnerPortalCard";
import { AuthShell } from "@/components/ui/AuthShell";

export default async function RegisterPage() {
  return (
    <AuthShell
      title="List your property"
      subtitle="Owners can post rentals directly — or sign in to manage existing listings."
    >
      <OwnerPortalCard />
    </AuthShell>
  );
}
