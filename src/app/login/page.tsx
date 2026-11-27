import { UnifiedLoginCard } from "./UnifiedLoginCard";
import { AuthShell } from "@/components/ui/AuthShell";

type SearchParams = Promise<{ error?: string; callbackUrl?: string; as?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl, as } = await searchParams;
  const initialRole = as === "agent" || as === "investor" || as === "admin" || as === "owner" ? as : "buyer";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Choose who you are, then sign in with a one-time code or your password."
    >
      <UnifiedLoginCard callbackUrl={callbackUrl ?? "/"} initialRole={initialRole} />
    </AuthShell>
  );
}
