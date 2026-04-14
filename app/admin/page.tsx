import Link from 'next/link'
import { getAllTenantsForAdmin } from '@/lib/actions'

export default async function AdminDashboardPage() {
  const tenants = await getAllTenantsForAdmin()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Admin</h1>
          <p className="text-gray-600 mt-2">View all tenants, troubleshoot issues, and inspect tenant health.</p>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border">
        <table className="min-w-full text-left divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Tenant</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Slug</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Members</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Events</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Volunteers</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Clubs</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Plan</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-900">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{tenant.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant.slug}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant._count.members}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant._count.events}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant._count.volunteerOpportunities}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant._count.clubs}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tenant.subscription?.plan?.slug ?? 'None'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Link href={`/admin/tenants/${tenant.slug}`} className="text-blue-600 hover:text-blue-800">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
