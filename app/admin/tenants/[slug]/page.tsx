import Link from 'next/link'
import { getTenantForAdmin } from '@/lib/actions'

type Props = {
  params: {
    slug: string
  }
}

export default async function TenantAdminPage({ params }: Props) {
  const tenant = await getTenantForAdmin(params.slug)
  if (!tenant) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">Tenant not found</h1>
        <p className="text-gray-600 mt-2">The requested tenant does not exist.</p>
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to admin
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-gray-600">Slug: {tenant.slug}</p>
        </div>
        <Link href="/admin" className="text-blue-600 hover:text-blue-800">
          Back to admin
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Tenant status</h2>
          <p className="text-sm text-gray-600 mb-2">ID: {tenant.id}</p>
          <p className="text-sm text-gray-600 mb-2">Active: {tenant.isActive ? 'Yes' : 'No'}</p>
          <p className="text-sm text-gray-600 mb-2">Created: {new Date(tenant.createdAt).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Updated: {new Date(tenant.updatedAt).toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Subscription</h2>
          <p className="text-sm text-gray-600 mb-2">Plan: {tenant.subscription?.plan?.slug ?? 'None'}</p>
          <p className="text-sm text-gray-600">Subscription status: {tenant.subscription?.status ?? 'None'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Counts</h2>
          <ul className="space-y-3 text-sm text-gray-700">
            <li>Users: {tenant._count.users}</li>
            <li>Members: {tenant._count.members}</li>
            <li>Events: {tenant._count.events}</li>
            <li>Volunteer opportunities: {tenant._count.volunteerOpportunities}</li>
            <li>Clubs: {tenant._count.clubs}</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
          <p className="text-sm text-gray-600">
            Use this tenant detail view to validate tenant health, subscription status, and counts before
            investigating further.
          </p>
        </div>
      </div>
    </div>
  )
}
