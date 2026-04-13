import { auth, currentUser } from '@clerk/nextjs/server'

export default async function ProfilePage() {
  const user = await currentUser()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
      
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-6 mb-6">
          {user?.imageUrl && (
            <img
              src={user.imageUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full"
            />
          )}
          <div>
            <h2 className="text-2xl font-semibold">{user?.fullName || 'User'}</h2>
            <p className="text-gray-600">{user?.emailAddresses[0]?.emailAddress}</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <div className="text-gray-900">{user?.firstName || '-'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <div className="text-gray-900">{user?.lastName || '-'}</div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-gray-900">{user?.emailAddresses[0]?.emailAddress}</div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Membership Status</h3>
          <p className="text-gray-600">
            Your membership information will appear here once you&apos;ve been added to an organization.
          </p>
        </div>
      </div>
    </div>
  )
}
