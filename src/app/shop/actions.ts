"use server";

import { redirect } from "next/navigation";

export async function lookupAgentShop(formData: FormData) {
  const code = formData.get("agentCode")?.toString().trim();
  if (code) {
    redirect(`/shop/${encodeURIComponent(code.toUpperCase())}`);
  }
}
