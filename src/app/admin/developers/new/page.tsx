import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DeveloperForm } from "@/components/DeveloperForm";
import { createDeveloper } from "../../actions";

export default async function NewDeveloperPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Add developer</h1>
      <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
        <DeveloperForm action={createDeveloper} submitLabel="Create developer" />
      </div>
    </div>
  );
}
