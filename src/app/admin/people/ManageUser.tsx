import { SmartInput } from "@/components/forms/FormKit";
import { btnDanger, btnPrimary, inputCls } from "@/components/admin/ui";
import { createUserAction, deleteUserAction, updateUserAction } from "./actions";

type U = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  whatsappNumber: string | null;
  company: string | null;
  address: string | null;
  role: string;
};

const lab = "mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400";

/** Edit + delete for one account (admin only). */
export function EditUserCard({ user, isSelf }: { user: U; isSelf: boolean }) {
  const phone = (v: string | null) => (v ?? "").replace(/\D/g, "").slice(-10);
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold text-ink">Edit account</h2>
      <form action={updateUserAction} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={user.id} />
        <label>
          <span className={lab}>Name</span>
          <SmartInput kind="letters" name="name" required defaultValue={user.name} />
        </label>
        <label>
          <span className={lab}>Email</span>
          <input type="email" name="email" defaultValue={user.email ?? ""} className={inputCls} />
        </label>
        <label>
          <span className={lab}>Mobile</span>
          <SmartInput kind="mobile" name="phone" defaultValue={phone(user.phone)} placeholder="10-digit mobile" />
        </label>
        <label>
          <span className={lab}>Secondary mobile</span>
          <SmartInput kind="mobile" name="secondaryPhone" defaultValue={phone(user.secondaryPhone)} placeholder="Optional" />
        </label>
        <label>
          <span className={lab}>WhatsApp number</span>
          <SmartInput kind="mobile" name="whatsappNumber" defaultValue={phone(user.whatsappNumber)} placeholder="Optional" />
        </label>
        <label>
          <span className={lab}>Company</span>
          <input name="company" defaultValue={user.company ?? ""} className={inputCls} />
        </label>
        <label className="md:col-span-2">
          <span className={lab}>Address</span>
          <input name="address" defaultValue={user.address ?? ""} className={inputCls} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" className={btnPrimary}>
            Save changes
          </button>
        </div>
      </form>

      {user.role !== "ADMIN" && !isSelf && (
        <form action={deleteUserAction} className="border-t border-slate-100 pt-4">
          <input type="hidden" name="id" value={user.id} />
          <p className="mb-2 text-sm text-slate-500">
            Deleting removes this person and their own data (wallet, deals, documents, saved items). Properties stay and move to your account.
            This cannot be undone.
          </p>
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
            <input type="checkbox" name="confirm" required className="h-4 w-4 accent-red-600" /> I understand, delete {user.name}
          </label>
          <button type="submit" className={btnDanger}>
            Delete user
          </button>
        </form>
      )}
    </div>
  );
}

/** Create a Buyer or Owner from the people list. */
export function CreateUserCard() {
  return (
    <details className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
      <summary className="cursor-pointer text-sm font-bold text-ink">+ Add a buyer or owner</summary>
      <form action={createUserAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <label>
          <span className={lab}>Name</span>
          <SmartInput kind="letters" name="name" required />
        </label>
        <label>
          <span className={lab}>Mobile</span>
          <SmartInput kind="mobile" name="phone" required placeholder="10-digit mobile" />
        </label>
        <label>
          <span className={lab}>Email (needed for owners)</span>
          <input type="email" name="email" className={inputCls} />
        </label>
        <label>
          <span className={lab}>Role</span>
          <select name="role" className={inputCls} defaultValue="BUYER">
            <option value="BUYER">Buyer</option>
            <option value="OWNER">Owner</option>
          </select>
        </label>
        <label className="md:col-span-2">
          <span className={lab}>Password (owners only, min 8 characters)</span>
          <input type="text" name="password" className={inputCls} autoComplete="off" />
        </label>
        <p className="text-xs text-slate-400 md:col-span-2">
          Channel partners and referral partners register themselves (they need KYC documents and a plan).
        </p>
        <div className="md:col-span-2">
          <button type="submit" className={btnPrimary}>
            Create user
          </button>
        </div>
      </form>
    </details>
  );
}
