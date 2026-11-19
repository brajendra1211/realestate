import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPage } from "@/components/admin/ui";
import DemoClient from "./DemoClient";

export const metadata = { title: "Agent demo" };

export default async function AdminDemoPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");

  return (
    <AdminPage
      title="Agent demo"
      description="Presentation mode for agent groups: see how the buzzer rings, how a property gets listed, and how commission is earned. Dummy data only — nothing is saved or sent."
    >
      <DemoClient />
    </AdminPage>
  );
}
