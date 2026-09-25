"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateInvestorProfileAction(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "INVESTOR") {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const secondaryPhone = String(formData.get("secondaryPhone") ?? "").trim();
  const whatsappNumber = String(formData.get("whatsappNumber") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const ageStr = String(formData.get("age") ?? "").trim();
  const dobStr = String(formData.get("dateOfBirth") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();

  // KYC
  const panNumber = String(formData.get("panNumber") ?? "").trim().toUpperCase();
  const panCardUrl = String(formData.get("panCardUrl") ?? "").trim();
  const aadhaarNumber = String(formData.get("aadhaarNumber") ?? "").trim();
  const aadhaarFrontUrl = String(formData.get("aadhaarFrontUrl") ?? "").trim();
  const aadhaarBackUrl = String(formData.get("aadhaarBackUrl") ?? "").trim();

  // Banking & Cancelled Cheque
  const bankAccountName = String(formData.get("bankAccountName") ?? "").trim();
  const bankAccountNumber = String(formData.get("bankAccountNumber") ?? "").trim();
  const bankIfsc = String(formData.get("bankIfsc") ?? "").trim().toUpperCase();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const bankBranch = String(formData.get("bankBranch") ?? "").trim();
  const cancelledChequeUrl = String(formData.get("cancelledChequeUrl") ?? "").trim();

  const age = ageStr ? parseInt(ageStr, 10) : null;
  const dateOfBirth = dobStr ? new Date(dobStr) : null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || undefined,
      phone: phone || null,
      secondaryPhone: secondaryPhone || null,
      whatsappNumber: whatsappNumber || null,
      email: email || null,
      age: isNaN(age ?? NaN) ? null : age,
      dateOfBirth: dateOfBirth && !isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
      address: address || null,
      website: website || null,
      panNumber: panNumber || null,
      panCardUrl: panCardUrl || null,
      aadhaarNumber: aadhaarNumber || null,
      aadhaarFrontUrl: aadhaarFrontUrl || null,
      aadhaarBackUrl: aadhaarBackUrl || null,
      bankAccountName: bankAccountName || null,
      bankAccountNumber: bankAccountNumber || null,
      bankIfsc: bankIfsc || null,
      bankName: bankName || null,
      bankBranch: bankBranch || null,
      cancelledChequeUrl: cancelledChequeUrl || null,
    },
  });

  revalidatePath("/investor/profile");
  revalidatePath("/investor/dashboard");
  redirect("/investor/profile?saved=1");
}
