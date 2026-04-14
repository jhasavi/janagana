import { getDashboardStats } from '@/lib/actions'
import { Users, Calendar, Clock, Building2, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const { memberCount, eventCount, volunteerCount, clubCount } = await getDashboardStats()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-600" />
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{memberCount}</h3>
          <p className="text-gray-600 mt-1">Total Members</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 text-purple-600" />
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{eventCount}</h3>
          <p className="text-gray-600 mt-1">Total Events</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-orange-600" />
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{volunteerCount}</h3>
          <p className="text-gray-600 mt-1">Volunteer Opportunities</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-8 h-8 text-green-600" />
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{clubCount}</h3>
          <p className="text-gray-600 mt-1">Active Clubs</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/dashboard/members" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Manage Members</span>
              </div>
            </a>
            <a href="/dashboard/events" className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900">Create Event</span>
              </div>
            </a>
            <a href="/dashboard/volunteers" className="block p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-gray-900">Manage Volunteers</span>
              </div>
            </a>
            <a href="/dashboard/clubs" className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">Manage Clubs</span>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Welcome to your dashboard! Get started by adding members or creating an event.</p>
              <p className="text-xs text-gray-400 mt-1">Just now</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-blue-600" />
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{memberCount}</h3>
              <p className="text-gray-600 mt-1">Total Members</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{eventCount}</h3>
              <p className="text-gray-600 mt-1">Total Events</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 text-orange-600" />
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{volunteerCount}</h3>
              <p className="text-gray-600 mt-1">Volunteer Opportunities</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <Building2 className="w-8 h-8 text-green-600" />
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{clubCount}</h3>
              <p className="text-gray-600 mt-1">Active Clubs</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <a href="/dashboard/members" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Manage Members</span>
                  </div>
                </a>
                <a href="/dashboard/events" className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-900">Create Event</span>
                  </div>
                </a>
                <a href="/dashboard/volunteers" className="block p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-gray-900">Manage Volunteers</span>
                  </div>
                </a>
                <a href="/dashboard/clubs" className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Manage Clubs</span>
                  </div>
                </a>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Welcome to your dashboard! Get started by adding members or creating an event.</p>
                  <p className="text-xs text-gray-400 mt-1">Just now</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
