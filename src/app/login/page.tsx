import { UnifiedLoginCard } from "./UnifiedLoginCard";
import { AuthShell } from "@/components/ui/AuthShell";

type SearchParams = Promise<{ error?: string; callbackUrl?: string; as?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl, as } = await searchParams;
  const initialRole = as === "agent" || as === "investor" || as === "admin" ? as : "buyer";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Choose who you are and sign in: buyer, owner, channel partner, referral partner or admin."
    >
      <UnifiedLoginCard callbackUrl={callbackUrl ?? "/"} initialRole={initialRole} />
    </AuthShell>
  );
}
