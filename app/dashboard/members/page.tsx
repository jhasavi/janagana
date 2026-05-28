import { redirect } from "next/navigation";
import Link from "next/link";
import { createContact, listContacts, updateContact } from "@/lib/actions/contacts";
import { resolveTenantForDashboard } from "@/lib/tenant";
import { getTenantDashboardSummary } from "@/lib/dashboard/tenant-summary";

function contactTypeLabel(type: string) {
  switch (type) {
    case "REGISTRANT":
      return "Event registrant";
    case "MEMBER":
      return "Member (manual tag)";
    case "DONOR":
      return "Donor";
    case "VOLUNTEER":
      return "Volunteer";
    default:
      return "Lead / inquiry";
  }
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const summary = tenant ? await getTenantDashboardSummary(tenant.id) : null;

  async function createContactAction(formData: FormData) {
    "use server";

    const result = await createContact({
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      type: String(formData.get("type") ?? "MEMBER"),
    });

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create contact";
      redirect(`/dashboard/members?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect("/dashboard/members?success=1");
  }

  async function updateContactAction(formData: FormData) {
    "use server";

    const result = await updateContact({
      contactId: String(formData.get("contactId") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      type: String(formData.get("type") ?? "MEMBER"),
    });

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to update contact";
      redirect(`/dashboard/members?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect("/dashboard/members?success=updated");
  }

  const contactsResult = await listContacts();
  const contacts = contactsResult.ok ? contactsResult.data : [];

  return (
    <section>
      <h1 className="text-2xl font-semibold">Contacts &amp; leads</h1>
      <p className="mt-2 text-sm text-gray-600 max-w-2xl">
        Everyone captured for this organization: public event registrations, newsletter signups, investment inquiries,
        and contacts you add manually. Formal paid memberships are separate and not enabled yet.
      </p>

      {summary && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <span className="text-gray-500">Total contacts</span>
            <p className="text-lg font-semibold text-gray-900">{summary.contactsTotal}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <span className="text-gray-500">Event registrations</span>
            <p className="text-lg font-semibold text-gray-900">{summary.eventRegistrationsConfirmed}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <span className="text-gray-500">Formal memberships</span>
            <p className="text-lg font-semibold text-gray-900">{summary.formalMemberships}</p>
            <p className="text-xs text-gray-400">Enrollment deferred</p>
          </div>
        </div>
      )}

      {params.error && <p className="mt-4 text-sm text-red-700">{params.error}</p>}
      {params.success === "1" && <p className="mt-4 text-sm text-green-700">Contact created.</p>}
      {params.success === "updated" && <p className="mt-4 text-sm text-green-700">Contact updated.</p>}

      <form action={createContactAction} className="mt-6 grid gap-3 rounded-md border border-gray-200 bg-white p-4 md:grid-cols-2">
        <input name="firstName" required placeholder="First name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="lastName" required placeholder="Last name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="email" required type="email" placeholder="Email" className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
        <input name="phone" placeholder="Phone" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <select name="type" defaultValue="MEMBER" className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="MEMBER">MEMBER (manual)</option>
          <option value="REGISTRANT">REGISTRANT</option>
          <option value="VOLUNTEER">VOLUNTEER</option>
          <option value="DONOR">DONOR</option>
          <option value="OTHER">OTHER (lead)</option>
        </select>
        <div className="md:col-span-2">
          <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
            Add contact manually
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        {contacts.length === 0 ? (
          <div className="text-sm text-gray-500 space-y-2">
            <p>No contacts yet for this organization.</p>
            <p>
              People appear here after a public visitor registers for a <strong>published</strong> event or submits your{" "}
              {tenant && (
                <Link href={`/portal/${tenant.slug}/contact`} className="text-blue-700 underline">
                  portal contact form
                </Link>
              )}
              .
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Registrations</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-4">
                      {contact.firstName} {contact.lastName}
                    </td>
                    <td className="py-2 pr-4">{contact.email}</td>
                    <td className="py-2 pr-4">{contactTypeLabel(contact.type)}</td>
                    <td className="py-2 pr-4">{contact._count.registrations}</td>
                    <td className="py-2 pr-4">{contact.phone ?? "-"}</td>
                    <td className="py-2 pr-4">
                      <details>
                        <summary className="cursor-pointer text-blue-700 underline">Edit</summary>
                        <form action={updateContactAction} className="mt-2 grid gap-2">
                          <input type="hidden" name="contactId" value={contact.id} />
                          <input
                            name="firstName"
                            defaultValue={contact.firstName}
                            required
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                          />
                          <input
                            name="lastName"
                            defaultValue={contact.lastName}
                            required
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                          />
                          <input
                            name="phone"
                            defaultValue={contact.phone ?? ""}
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                          />
                          <select
                            name="type"
                            defaultValue={contact.type}
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                          >
                            <option value="MEMBER">MEMBER (manual)</option>
                            <option value="REGISTRANT">REGISTRANT</option>
                            <option value="VOLUNTEER">VOLUNTEER</option>
                            <option value="DONOR">DONOR</option>
                            <option value="OTHER">OTHER (lead)</option>
                          </select>
                          <button type="submit" className="rounded bg-gray-800 px-2 py-1 text-xs text-white">
                            Save
                          </button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
