import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MessageSquare, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SupportStatusSelect } from './_components/support-status-select'

export const metadata: Metadata = { title: 'Support Requests' }

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'open') return <Badge variant="destructive" className="capitalize">Open</Badge>
  if (status === 'in_progress') return <Badge variant="warning" className="capitalize">In Progress</Badge>
  if (status === 'resolved') return <Badge variant="success" className="capitalize">Resolved</Badge>
  return <Badge variant="secondary" className="capitalize">{status}</Badge>
}

export default async function SupportQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const { status } = await searchParams
  const filterStatus = status && ['open', 'in_progress', 'resolved', 'closed'].includes(status) ? status : undefined

  const [requests, counts] = await Promise.all([
    prisma.supportRequest.findMany({
      where: {
        tenantId: tenant.id,
        ...(filterStatus ? { status: filterStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.supportRequest.groupBy({
      by: ['status'],
      where: { tenantId: tenant.id },
      _count: { id: true },
    }),
  ])

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count.id]))
  const totalOpen = countMap['open'] ?? 0
  const totalInProgress = countMap['in_progress'] ?? 0
  const totalResolved = countMap['resolved'] ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Messages submitted by members and visitors via the support form.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{totalOpen}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{totalInProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{totalResolved}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'All', value: '' },
          { label: 'Open', value: 'open' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Resolved', value: 'resolved' },
        ].map((f) => (
          <a
            key={f.value}
            href={f.value ? `/dashboard/support?status=${f.value}` : '/dashboard/support'}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (filterStatus ?? '') === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
            {f.value && countMap[f.value] ? (
              <span className="ml-1.5 text-xs opacity-70">{countMap[f.value]}</span>
            ) : null}
          </a>
        ))}
      </div>

      {/* Request list */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No support requests yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/dashboard/support/${req.id}`} className="text-sm font-medium truncate hover:underline">
                        {req.name || req.email || 'Anonymous'}
                      </Link>
                      {req.email && req.name && (
                        <p className="text-xs text-muted-foreground truncate">{req.email}</p>
                      )}
                      {req.context && (
                        <Badge variant="outline" className="text-xs">{req.context}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {req.message}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={req.status} />
                    <SupportStatusSelect id={req.id} currentStatus={req.status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
