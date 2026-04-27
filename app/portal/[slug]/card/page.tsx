import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPortalContext } from '@/lib/actions/portal'
import { QRCodeDisplay } from '@/components/dashboard/qr-code-display'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Membership Card' }

export default async function MembershipCardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ctx = await getPortalContext(slug)
  if (!ctx) notFound()

  const { tenant, member } = ctx

  const statusLabel: Record<string, string> = {
    ACTIVE: 'Active',
    PENDING: 'Pending',
    INACTIVE: 'Inactive',
    BANNED: 'Suspended',
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Membership Card</h1>
        <p className="text-muted-foreground text-sm">Print or save your digital membership card</p>
      </div>

      {/* Print button — hidden when printing */}
      <button
        onClick={() => window.print()}
        className="print:hidden px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Print / Save as PDF
      </button>

      {/* Card — styled for print */}
      <div
        id="membership-card"
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl border bg-card print:shadow-none print:border-2"
        style={{ aspectRatio: '1.586 / 1' }}
      >
        {/* Top color band */}
        <div
          className="h-3 w-full"
          style={{ backgroundColor: tenant.primaryColor }}
        />

        <div className="p-5 flex flex-col h-[calc(100%-12px)]">
          {/* Org name */}
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: tenant.primaryColor }}
            >
              {tenant.name}
            </p>
            <Badge
              variant={member.status === 'ACTIVE' ? 'success' : 'secondary'}
              className="text-xs"
            >
              {statusLabel[member.status] ?? member.status}
            </Badge>
          </div>

          <Separator className="mb-3" />

          {/* Member name + tier */}
          <div className="flex-1">
            <h2 className="text-xl font-bold leading-tight">
              {member.firstName} {member.lastName}
            </h2>
            {member.tier && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {member.tier.name} Member
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
          </div>

          {/* Dates + QR */}
          <div className="flex items-end justify-between mt-3">
            <div className="space-y-1">
              <div className="text-xs">
                <span className="text-muted-foreground">Since </span>
                <span className="font-medium">{formatDate(member.joinedAt)}</span>
              </div>
              {member.renewsAt && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Renews </span>
                  <span className="font-medium">{formatDate(member.renewsAt)}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground font-mono break-all mt-1">
                ID: {member.id.slice(-8).toUpperCase()}
              </div>
            </div>

            <QRCodeDisplay value={member.id} size={72} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center print:hidden max-w-xs">
        This card is for identification purposes. Present it to staff at events and check-in points.
      </p>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #membership-card, #membership-card * { visibility: visible; }
          #membership-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  )
}
