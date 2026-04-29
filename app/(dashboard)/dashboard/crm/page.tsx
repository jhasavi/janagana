import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'

export default async function CRMPage() {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const contacts = await prisma.contact.findMany({
    where: { tenantId: tenant.id },
    include: {
      member: true,
      company: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const activities = await prisma.activity.findMany({
    where: { tenantId: tenant.id },
    include: {
      contact: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">CRM Contacts</h1>
        <p className="text-muted-foreground">
          Track all contacts including members, donors, and external people
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contacts Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Contacts ({contacts.length})</h2>
          {contacts.length === 0 ? (
            <p className="text-muted-foreground">No contacts yet</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="border-b pb-3 last:border-0">
                  <div className="font-medium">
                    {contact.firstName} {contact.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">{contact.email}</div>
                  {contact.phone && (
                    <div className="text-sm text-muted-foreground">{contact.phone}</div>
                  )}
                  {contact.member && (
                    <div className="text-xs text-green-600 mt-1">Member</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activities Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Recent Activities ({activities.length})</h2>
          {activities.length === 0 ? (
            <p className="text-muted-foreground">No activities yet</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="border-b pb-3 last:border-0">
                  <div className="font-medium">{activity.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {activity.contact?.firstName} {activity.contact?.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
