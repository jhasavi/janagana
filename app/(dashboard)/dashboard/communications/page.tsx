import type { EmailCampaign } from '@prisma/client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Mail, Send, FileEdit, MessageSquare } from 'lucide-react'
import { getEmailCampaigns } from '@/lib/actions/communications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Communications' }

const statusConfig = {
  DRAFT:     { label: 'Draft',     variant: 'secondary' as const },
  SCHEDULED: { label: 'Scheduled', variant: 'warning'   as const },
  SENDING:   { label: 'Sending',   variant: 'info'      as const },
  SENT:      { label: 'Sent',      variant: 'success'   as const },
  FAILED:    { label: 'Failed',    variant: 'destructive' as const },
}

export default async function CommunicationsPage() {
  const result = await getEmailCampaigns()
  const campaigns = (result.data ?? []) as EmailCampaign[]

  const sent     = campaigns.filter((c) => c.status === 'SENT').length
  const drafts   = campaigns.filter((c) => c.status === 'DRAFT').length
  const totalRec = campaigns.reduce((s, c) => s + (c.recipientCount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground text-sm mt-1">Email campaigns for your members.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/communications/sms">
              <MessageSquare className="h-4 w-4" /> SMS Blast
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/communications/new">
              <Plus className="h-4 w-4" /> New Campaign
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Campaigns Sent</p>
            <p className="text-3xl font-bold mt-1">{sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Drafts</p>
            <p className="text-3xl font-bold mt-1">{drafts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Total Recipients</p>
            <p className="text-3xl font-bold mt-1">{totalRec.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Mail className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No campaigns yet</p>
            <Button asChild size="sm">
              <Link href="/dashboard/communications/new"><Plus className="h-4 w-4" /> Create First Campaign</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const status = statusConfig[c.status as keyof typeof statusConfig]
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <CardTitle className="text-base line-clamp-1">{c.name}</CardTitle>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-1">{c.subject}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Send className="h-3.5 w-3.5" />
                      {c.recipientCount} recipients
                    </span>
                    <span>{c.sentAt ? `Sent ${formatDate(c.sentAt)}` : `Created ${formatDate(c.createdAt)}`}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/communications/${c.id}`}>View</Link>
                    </Button>
                    {c.status === 'DRAFT' && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/communications/${c.id}/edit`}>
                          <FileEdit className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
