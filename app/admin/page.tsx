import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Users, CalendarDays, Heart, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { getAllTenants, type TenantOwner } from '@/lib/actions/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Global Admin — Jana Gana' }

export default async function AdminPage() {
  const tenants = await getAllTenants()

  const totalMembers = tenants.reduce((s, t) => s + t._count.members, 0)
  const totalEvents = tenants.reduce((s, t) => s + t._count.events, 0)
  const activeOrgs = tenants.filter((t) => t.isActive).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {tenants.length} organizations · {totalMembers} members · {totalEvents} events
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Organizations', value: tenants.length, icon: Building2 },
          { label: 'Active Orgs', value: activeOrgs, icon: CheckCircle2 },
          { label: 'Total Members', value: totalMembers, icon: Users },
          { label: 'Total Events', value: totalEvents, icon: CalendarDays },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-8 w-8 text-indigo-500 shrink-0" />
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tenant table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Organizations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No organizations yet.</p>
          ) : (
            <div className="divide-y">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: tenant.primaryColor }}
                    >
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        /{tenant.slug} · Joined {formatDate(tenant.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Owners:{' '}
                        {tenant.owners?.length > 0 ? (
                          tenant.owners.map((owner: TenantOwner, index: number) => (
                            <span
                              key={`${owner.identifier}-${owner.role}-${index}`}
                              className="inline-flex flex-wrap items-center gap-1"
                            >
                              <span>{owner.fullName ?? owner.identifier}</span>
                              {owner.email ? (
                                <a
                                  href={`mailto:${owner.email}`}
                                  className="text-indigo-500 hover:underline"
                                >
                                  {owner.email}
                                </a>
                              ) : null}
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                {owner.role.replace('org:', '')}
                              </span>
                              {index < tenant.owners.length - 1 ? <span className="text-slate-400">,&nbsp;</span> : null}
                            </span>
                          ))
                        ) : (
                          'None'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground md:ml-auto">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {tenant._count.members}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {tenant._count.events}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {tenant._count.volunteerOpportunities}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={tenant.isActive ? 'success' : 'secondary'}>
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{tenant.planSlug}</Badge>
                    <Link
                      href={`/portal/${tenant.slug}`}
                      target="_blank"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Open member portal"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
