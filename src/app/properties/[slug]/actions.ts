"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

export async function submitEnquiry(formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!propertyId || !slug || !name || !phone) {
    redirect(`/properties/${slug}?enquiry=error`);
  }

  const session = await auth();
  const buyerId = session?.user.role === "BUYER" ? session.user.id : null;

  const enquiry = await prisma.enquiry.create({
    data: {
      propertyId,
      buyerId,
      name,
      phone,
      email: email || null,
      message: message || null,
    },
    include: {
      property: { select: { title: true, owner: { select: { phone: true, email: true } } } },
    },
  });

  if (enquiry.property) {
    await notifyUser(
      enquiry.property.owner,
      `New enquiry on "${enquiry.property.title}" from ${name} (${phone}).${message ? ` Message: ${message}` : ""} View it in your BayaEstate dashboard.`,
      "New enquiry on your listing"
    );
  }

  redirect(`/properties/${slug}?enquiry=sent`);
}
