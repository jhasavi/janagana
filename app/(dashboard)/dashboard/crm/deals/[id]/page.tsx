import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, DollarSign, Calendar, Building2, User, MessageSquare, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ActivityTimeline } from '../../_components/activity-timeline'

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const { id } = await params

  const deal = await prisma.deal.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      contact: true,
      company: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      tasks: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!deal) {
    notFound()
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: deal.currency,
    }).format(cents / 100)
  }

  const stageColors: Record<string, string> = {
    LEAD: 'bg-gray-100 text-gray-700',
    QUALIFIED: 'bg-blue-100 text-blue-700',
    PROPOSAL: 'bg-yellow-100 text-yellow-700',
    NEGOTIATION: 'bg-orange-100 text-orange-700',
    CLOSED_WON: 'bg-green-100 text-green-700',
    CLOSED_LOST: 'bg-red-100 text-red-700',
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/crm/deals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{deal.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={stageColors[deal.stage]}>{deal.stage}</Badge>
              <Badge variant="outline">{deal.probability}% probability</Badge>
            </div>
          </div>
          <Button asChild>
            <Link href={`/dashboard/crm/deals/${deal.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Deal
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Deal Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Value:</span>
                <span className="text-sm font-bold">{formatCurrency(deal.valueCents)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Contact:</span>
                <Link
                  href={`/dashboard/crm/contacts/${deal.contact.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {deal.contact.firstName} {deal.contact.lastName}
                </Link>
              </div>
              {deal.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Company:</span>
                  <span className="text-sm">{deal.company.name}</span>
                </div>
              )}
              {deal.expectedCloseDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Expected Close:</span>
                  <span className="text-sm">{formatDate(deal.expectedCloseDate)}</span>
                </div>
              )}
              {deal.actualCloseDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Actual Close:</span>
                  <span className="text-sm">{formatDate(deal.actualCloseDate)}</span>
                </div>
              )}
              {deal.source && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Source:</span>
                  <Badge variant="outline" className="text-xs">
                    {deal.source}
                  </Badge>
                </div>
              )}
              {deal.description && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {deal.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activities & Related */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{deal.activities.length}</p>
                    <p className="text-xs text-muted-foreground">Activities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{deal.tasks.length}</p>
                    <p className="text-xs text-muted-foreground">Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={deal.activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
