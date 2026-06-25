import Link from "next/link";
import { redirect } from "next/navigation";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { createContact } from "@/lib/actions/contacts";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard, tenantIdFromMutation } from "@/lib/tenant";

export default async function NewContactPage() {
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  async function createContactAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await createContact(
      {
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        type: "OTHER",
        notes: String(formData.get("notes") ?? ""),
        tags: String(formData.get("tags") ?? ""),
      },
      { tenantIdHint: tenantHint },
    );

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create contact";
      const tenantId = tenantIdFromMutation(tenantHint);
      if (tenantId) {
        redirectWithActiveTenant(tenantId, `/dashboard/members/new?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/members/new?error=${encodeURIComponent(errorMessage)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/members?success=1");
  }

  return (
    <section className="mx-auto max-w-lg space-y-4">
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}
      <Link href="/dashboard/members" className="text-sm text-teal-900 hover:underline">
        ← Back to contacts
      </Link>
      <h1 className="text-xl font-semibold text-slate-950">Add contact</h1>
      <form action={createContactAction} className="grid gap-3 rounded-md border border-stone-200 bg-white p-4">
        {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
        <input name="firstName" required placeholder="First name" className="rounded border border-stone-300 px-3 py-2 text-sm" />
        <input name="lastName" required placeholder="Last name" className="rounded border border-stone-300 px-3 py-2 text-sm" />
        <input name="email" required type="email" placeholder="Email" className="rounded border border-stone-300 px-3 py-2 text-sm" />
        <input name="phone" placeholder="Phone" className="rounded border border-stone-300 px-3 py-2 text-sm" />
        <input name="tags" placeholder="Tags (comma-separated)" className="rounded border border-stone-300 px-3 py-2 text-sm" />
        <textarea name="notes" rows={3} placeholder="Notes (optional)" className="rounded border border-stone-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-slate-950 px-4 py-2 text-sm text-white hover:bg-teal-900">
          Save contact
        </button>
      </form>
    </section>
  );
}
