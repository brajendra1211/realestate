"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { getSiteSettings } from "@/lib/site-settings";
import { getListingAgent, notifyPropertyAgent } from "@/lib/propertyRing";

export type SubmitEnquiryState = { sent?: boolean; error?: boolean };

export async function submitEnquiry(
  _prevState: SubmitEnquiryState,
  formData: FormData
): Promise<SubmitEnquiryState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!propertyId || !slug || !name || !phone) {
    return { error: true };
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
    const enquiryMessage = `New enquiry on "${enquiry.property.title}" from ${name} (${phone}).${message ? ` Message: ${message}` : ""}`;

    // A company-held property's "owner" is the admin account, which can't go
    // show it in person — route to the assigned agent instead when one
    // exists. Ordinary dealer/owner listings with no assigned agent keep the
    // original behavior of notifying the owner directly.
    const agent = await getListingAgent(propertyId);
    if (agent) {
      await notifyPropertyAgent(
        agent,
        { title: "New enquiry on your listing", body: enquiryMessage },
        {
          type: "property-enquiry",
          propertyId,
          propertyTitle: enquiry.property.title,
          buyerName: name,
          buyerPhone: phone,
        }
      );
    } else {
      const { siteName } = await getSiteSettings();
      await notifyUser(
        enquiry.property.owner,
        `${enquiryMessage} View it in your ${siteName} dashboard.`,
        "New enquiry on your listing"
      );
    }
  }

  return { sent: true };
}
