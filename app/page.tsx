import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-700">Jana Gana</h1>
        <div className="flex gap-4">
          <Link href="/sign-in" 
            className="px-4 py-2 text-blue-700 hover:text-blue-900">
            Sign In
          </Link>
          <Link href="/sign-up"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Start Free Trial
          </Link>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-8 py-24 text-center">
        <h2 className="text-6xl font-bold text-gray-900 mb-6">
          Manage Your Organization<br/>
          <span className="text-blue-600">All In One Place</span>
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Members, Events, Volunteers, and Clubs — everything your 
          non-profit or association needs to thrive.
        </p>
        <Link href="/sign-up"
          className="px-8 py-4 bg-blue-600 text-white text-xl 
                     rounded-xl hover:bg-blue-700 inline-block">
          Start 30-Day Free Demo
        </Link>
        
        <div className="grid grid-cols-4 gap-8 mt-24 text-left">
          {[
            { icon: '👥', title: 'Members', desc: 'Track members, tiers, renewals' },
            { icon: '📅', title: 'Events', desc: 'Create events, sell tickets, check-in' },
            { icon: '🙋', title: 'Volunteers', desc: 'Recruit and track volunteer hours' },
            { icon: '🏘️', title: 'Clubs', desc: 'Sub-groups and discussions' },
          ].map(f => (
            <div key={f.title} className="p-6 bg-white rounded-xl shadow-sm border">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
