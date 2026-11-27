import { prisma } from "@/lib/prisma";
import { isValidMobile, isPersonName, normalizePhone } from "@/lib/validators";
import { hashPassword } from "@/lib/password";

export class AdminUserError extends Error {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function phoneTakenByOther(digits: string, exceptUserId?: string) {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM User
    WHERE phone IS NOT NULL
      AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', ''), 10) = ${digits}
    LIMIT 5`;
  return rows.some((r) => r.id !== exceptUserId);
}

export type EditUserInput = {
  id: string;
  name: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  whatsappNumber: string;
  company: string;
  address: string;
};

/** Admin edits the basic account fields of any user. Throws AdminUserError with a readable message. */
export async function updateUserByAdmin(input: EditUserInput) {
  const name = input.name.trim();
  if (!name || !isPersonName(name)) throw new AdminUserError("Name can only contain letters.");

  const email = input.email.trim().toLowerCase();
  if (email && !EMAIL.test(email)) throw new AdminUserError("Enter a valid email.");

  for (const [label, v] of [
    ["Mobile", input.phone],
    ["Secondary mobile", input.secondaryPhone],
    ["WhatsApp number", input.whatsappNumber],
  ] as const) {
    if (v.trim() && !isValidMobile(v)) throw new AdminUserError(`${label} must be a valid 10-digit number (starting with 6, 7, 8 or 9).`);
  }

  const user = await prisma.user.findUnique({ where: { id: input.id }, select: { id: true, role: true } });
  if (!user) throw new AdminUserError("User not found.");

  if (email) {
    const other = await prisma.user.findUnique({ where: { email } });
    if (other && other.id !== user.id) throw new AdminUserError("Another account already uses this email.");
  }
  const phone = input.phone.trim() ? normalizePhone(input.phone) : null;
  if (phone && (await phoneTakenByOther(phone, user.id))) throw new AdminUserError("Another account already uses this mobile number.");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      email: email || null,
      phone,
      secondaryPhone: input.secondaryPhone.trim() ? normalizePhone(input.secondaryPhone) : null,
      whatsappNumber: input.whatsappNumber.trim() ? normalizePhone(input.whatsappNumber) : null,
      company: input.company.trim() || null,
      address: input.address.trim() || null,
    },
  });
}

/** Admin creates a Buyer or Owner. Agents and investors register themselves (they need KYC and a plan). */
export async function createUserByAdmin(input: { name: string; phone: string; email: string; role: string; password: string }) {
  const name = input.name.trim();
  if (!name || !isPersonName(name)) throw new AdminUserError("Name can only contain letters.");
  if (input.role !== "BUYER" && input.role !== "OWNER") throw new AdminUserError("Only Buyer or Owner accounts can be created here.");
  if (!isValidMobile(input.phone)) throw new AdminUserError("Enter a valid 10-digit mobile number (starting with 6, 7, 8 or 9).");
  const phone = normalizePhone(input.phone);
  if (await phoneTakenByOther(phone)) throw new AdminUserError("This mobile number is already registered.");

  const email = input.email.trim().toLowerCase();
  if (email) {
    if (!EMAIL.test(email)) throw new AdminUserError("Enter a valid email.");
    if (await prisma.user.findUnique({ where: { email } })) throw new AdminUserError("This email is already registered.");
  }
  if (input.role === "OWNER" && !email) throw new AdminUserError("Owners need an email (used with a password to log in).");
  if (input.role === "OWNER" && input.password.length < 8) throw new AdminUserError("Owner password must be at least 8 characters.");

  return prisma.user.create({
    data: {
      name,
      phone,
      email: email || null,
      role: input.role,
      verified: true,
      passwordHash: input.password ? await hashPassword(input.password) : null,
    },
  });
}

/**
 * Admin deletes a user. Keeps the properties (re-assigned to the acting admin) and the partner
 * listings (detached from their agent). Refuses to delete admins, yourself, or an agent who still
 * has referral partners (those need to be removed or moved first).
 */
export async function deleteUserByAdmin(userId: string, actingAdminId: string) {
  if (userId === actingAdminId) throw new AdminUserError("You cannot delete your own account.");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true, agentProfile: { select: { id: true } } },
  });
  if (!user) throw new AdminUserError("User not found.");
  if (user.role === "ADMIN") throw new AdminUserError("Admin accounts cannot be deleted here.");

  const agentId = user.agentProfile?.id;
  if (agentId) {
    const investors = await prisma.investorProfile.count({ where: { referringAgentId: agentId } });
    if (investors > 0) {
      throw new AdminUserError(
        `This channel partner has ${investors} referral partner(s). Delete those people first, then delete this partner.`
      );
    }
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.property.updateMany({ where: { ownerId: userId }, data: { ownerId: actingAdminId } });
        await tx.cartItem.deleteMany({ where: { userId } });
        await tx.cartShare.deleteMany({ where: { OR: [{ userId }, ...(agentId ? [{ agentId }] : [])] } });
        await tx.watchRequirement.deleteMany({ where: { buyerId: userId } });
        if (agentId) {
          await tx.agentListing.updateMany({ where: { agentId }, data: { agentId: null } });
          await tx.agentProfile.updateMany({ where: { referringAgentId: agentId }, data: { referringAgentId: null } });
          await tx.officeVisitor.deleteMany({ where: { agentId } });
          await tx.agentOfficeVisit.deleteMany({ where: { agentId } });
        }
        await tx.user.delete({ where: { id: userId } });
      },
      { timeout: 60000 }
    );
  } catch (e) {
    if (e instanceof AdminUserError) throw e;
    throw new AdminUserError("Could not delete: this user still has linked records that block deletion.");
  }
  return user.name;
}
