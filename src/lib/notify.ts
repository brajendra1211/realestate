import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendEmail, isMailerConfigured } from "@/lib/mailer";

// WhatsApp first, email as fallback — matches how OTP delivery is prioritized.
export async function notifyUser(
  user: { phone: string | null; email: string | null },
  message: string,
  subject = "BayaEstate"
) {
  if (user.phone && isWhatsAppConfigured()) {
    const sent = await sendWhatsAppText(user.phone, message);
    if (sent) return true;
  }

  if (user.email && isMailerConfigured()) {
    return sendEmail(user.email, subject, `<p>${message}</p>`);
  }

  return false;
}
