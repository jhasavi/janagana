import type { Metadata } from 'next'
import { getAuditLogs } from '@/lib/actions/audit'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { FileClock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Audit Log' }

const actionConfig = {
  CREATE: { label: 'Created', variant: 'success'     as const },
  UPDATE: { label: 'Updated', variant: 'info'        as const },
  DELETE: { label: 'Deleted', variant: 'destructive' as const },
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ resourceType?: string; action?: string; page?: string }>
}) {
  const params = await searchParams
  const page   = parseInt(params.page ?? '1', 10)
  const limit  = 50
  const offset = (page - 1) * limit

  const result = await getAuditLogs({
    resourceType: params.resourceType,
    action: params.action,
    limit,
    offset,
  })

  const logs  = result.data  ?? []
  const total = result.total ?? 0
  const pages = Math.ceil(total / limit)

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileClock className="h-6 w-6" />
            Audit Log
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All create, update, and delete actions performed in your organization.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'All',       href: '/dashboard/settings/audit' },
          { label: 'Members',   href: '/dashboard/settings/audit?resourceType=Member' },
          { label: 'Events',    href: '/dashboard/settings/audit?resourceType=Event' },
          { label: 'Volunteers',href: '/dashboard/settings/audit?resourceType=VolunteerOpportunity' },
          { label: 'Creates',   href: '/dashboard/settings/audit?action=CREATE' },
          { label: 'Deletes',   href: '/dashboard/settings/audit?action=DELETE' },
        ].map((f) => (
          <Button key={f.href} asChild variant="outline" size="sm">
            <Link href={f.href}>{f.label}</Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{total} events</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No audit events found. Actions like creating or deleting members will appear here.
            </p>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const cfg = actionConfig[log.action]
                return (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Badge variant={cfg.variant} className="mt-0.5 shrink-0">
                        {cfg.label}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {log.resourceType}
                          {log.resourceName && (
                            <span className="text-muted-foreground font-normal"> — {log.resourceName}</span>
                          )}
                        </p>
                        {log.actorName && (
                          <p className="text-xs text-muted-foreground">by {log.actorName}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/settings/audit?page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            {page < pages && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/settings/audit?page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
