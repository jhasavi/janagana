import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Building2, Globe, MapPin, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanyTable } from '../../_components/company-table'

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  const { id } = await params

  const company = await prisma.company.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      contacts: {
        orderBy: { firstName: 'asc' },
      },
      deals: {
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          contacts: true,
          deals: true,
        },
      },
    },
  })

  if (!company) {
    notFound()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/crm/companies">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{company.name}</h1>
            {company.industry && (
              <p className="text-muted-foreground mt-1">{company.industry}</p>
            )}
          </div>
          <Button asChild>
            <Link href={`/dashboard/crm/companies/${company.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Company
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              {(company.address || company.city || company.state) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {company.address && <div>{company.address}</div>}
                    {(company.city || company.state) && (
                      <div>
                        {company.city}{company.city && company.state && ', '}{company.state}
                        {company.postalCode && ` ${company.postalCode}`}
                      </div>
                    )}
                    {company.country && <div>{company.country}</div>}
                  </div>
                </div>
              )}
              {company.description && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {company.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Contacts:</span>
                <span className="text-sm">{company._count.contacts}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Deals:</span>
                <span className="text-sm">{company._count.deals}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts & Deals */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contacts ({company.contacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {company.contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No contacts yet</p>
              ) : (
                <div className="space-y-2">
                  {company.contacts.map((contact) => (
                    <Link
                      key={contact.id}
                      href={`/dashboard/crm/contacts/${contact.id}`}
                      className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium text-sm">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{contact.email}</div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deals ({company.deals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {company.deals.length === 0 ? (
                <p className="text-muted-foreground text-sm">No deals yet</p>
              ) : (
                <div className="space-y-2">
                  {company.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/dashboard/crm/deals/${deal.id}`}
                      className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium text-sm">{deal.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Stage: {deal.stage} • ${(deal.valueCents / 100).toLocaleString()}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
