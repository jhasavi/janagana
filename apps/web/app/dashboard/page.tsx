import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserTenant } from '@/lib/actions'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const tenant = await getUserTenant()
  
  if (!tenant) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">{tenant.name}</h1>
          <div className="flex gap-4">
            <span className="text-gray-600">Welcome!</span>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h2>
        
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Members</h3>
            <p className="text-gray-600">Manage your members</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Events</h3>
            <p className="text-gray-600">Create and manage events</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="text-4xl mb-4">🙋</div>
            <h3 className="text-xl font-semibold mb-2">Volunteers</h3>
            <p className="text-gray-600">Track volunteer hours</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="text-4xl mb-4">🏘️</div>
            <h3 className="text-xl font-semibold mb-2">Clubs</h3>
            <p className="text-gray-600">Manage clubs and groups</p>
          </div>
        </div>
      </div>
    </div>
  )
}
