import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendEmail, isMailerConfigured } from "@/lib/mailer";
import { getSiteSettings } from "@/lib/site-settings";

// WhatsApp first, email as fallback — matches how OTP delivery is prioritized.
export async function notifyUser(
  user: { phone: string | null; email: string | null },
  message: string,
  subject?: string
) {
  if (user.phone && isWhatsAppConfigured()) {
    const sent = await sendWhatsAppText(user.phone, message);
    if (sent) return true;
  }

  if (user.email && isMailerConfigured()) {
    const resolvedSubject = subject ?? (await getSiteSettings()).siteName;
    return sendEmail(user.email, resolvedSubject, `<p>${message}</p>`);
  }

  return false;
}
