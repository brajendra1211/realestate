import { UnifiedLoginCard } from "./UnifiedLoginCard";
import { AuthShell } from "@/components/ui/AuthShell";

type SearchParams = Promise<{ error?: string; callbackUrl?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Instant OTP sign-in for buyers and partners. Admins sign in with a password."
    >
      <UnifiedLoginCard callbackUrl={callbackUrl ?? "/"} />
    </AuthShell>
  );
}
