import { redirect } from "next/navigation";
import { createContact, listContacts } from "@/lib/actions/contacts";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

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

  const contactsResult = await listContacts();
  const contacts = contactsResult.ok ? contactsResult.data : [];

  return (
    <section>
      <h1 className="text-2xl font-semibold">Members / Contacts</h1>
      <p className="mt-2 text-sm text-gray-600">Create and view tenant-scoped contacts.</p>

      {params.error && <p className="mt-4 text-sm text-red-700">{params.error}</p>}
      {params.success && <p className="mt-4 text-sm text-green-700">Contact created.</p>}

      <form action={createContactAction} className="mt-6 grid gap-3 rounded-md border border-gray-200 bg-white p-4 md:grid-cols-2">
        <input name="firstName" required placeholder="First name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="lastName" required placeholder="Last name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="email" required type="email" placeholder="Email" className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
        <input name="phone" placeholder="Phone" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <select name="type" defaultValue="MEMBER" className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="MEMBER">MEMBER</option>
          <option value="REGISTRANT">REGISTRANT</option>
          <option value="VOLUNTEER">VOLUNTEER</option>
          <option value="DONOR">DONOR</option>
          <option value="OTHER">OTHER</option>
        </select>
        <div className="md:col-span-2">
          <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
            Create contact
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-500">No contacts yet for this tenant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Phone</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{contact.firstName} {contact.lastName}</td>
                    <td className="py-2 pr-4">{contact.email}</td>
                    <td className="py-2 pr-4">{contact.type}</td>
                    <td className="py-2 pr-4">{contact.phone ?? "-"}</td>
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
