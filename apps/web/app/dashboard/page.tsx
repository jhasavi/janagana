export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
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
  )
}
