import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm border">
        <Link
          href="/dashboard/settings/billing"
          className="block p-4 hover:bg-gray-50 border-b"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Billing</h2>
              <p className="text-sm text-gray-600">Manage your subscription and payment methods</p>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </Link>
        
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Organization Settings</h2>
              <p className="text-sm text-gray-600">Manage your organization details</p>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </div>
      </div>
    </div>
  )
}
