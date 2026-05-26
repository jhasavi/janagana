import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTenantByClerkOrgId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function MembersPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const tenant = await getTenantByClerkOrgId(orgId);
  if (!tenant) redirect("/onboarding/create-organization");

  const contacts = await prisma.contact.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      type: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <Link
          href="/dashboard/members/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add member
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No members yet.</p>
          <Link
            href="/dashboard/members/new"
            className="text-sm text-blue-600 hover:underline mt-2 inline-block"
          >
            Add your first member
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{c.type.toLowerCase()}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
