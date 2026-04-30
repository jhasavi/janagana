import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, UserCheck, Users2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function GovernancePage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const [offices, committees, activeTerms] = await Promise.all([
    prisma.governanceOffice.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { terms: true } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.committee.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { memberships: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.officerTerm.findMany({
      where: { tenantId: tenant.id, status: 'ACTIVE' },
      include: {
        office: true,
        contact: { select: { id: true, firstName: true, lastName: true, emails: true, email: true } },
      },
      orderBy: { startDate: 'desc' },
    }),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-indigo-600" />
            Governance
          </h1>
          <p className="text-muted-foreground mt-1">
            Board offices, officer terms, and committee memberships — separate from volunteer roles.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/governance/offices/new">
              <Plus className="h-4 w-4 mr-2" />
              New Office
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/governance/committees/new">
              <Plus className="h-4 w-4 mr-2" />
              New Committee
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Governance Offices</CardDescription>
            <CardTitle className="text-2xl">{offices.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              e.g. President, Secretary, Board Member
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Officer Terms</CardDescription>
            <CardTitle className="text-2xl">{activeTerms.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Currently serving officers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Committees</CardDescription>
            <CardTitle className="text-2xl">{committees.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active working groups and standing committees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Officers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Current Officers
            </CardTitle>
            <CardDescription>
              People currently serving in board or executive positions
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard/governance/terms/new">
              <Plus className="h-4 w-4 mr-2" />
              Assign Officer
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activeTerms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No active officer terms</p>
              <p className="text-sm mt-1">
                Create governance offices first, then assign people to terms.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/dashboard/governance/offices/new">
                  Create first office
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Office / Title</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTerms.map((term) => {
                  const email = term.contact.emails?.[0] ?? term.contact.email ?? '—'
                  const name = `${term.contact.firstName} ${term.contact.lastName}`
                  return (
                    <TableRow key={term.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{term.office.title}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(term.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Offices & Committees side by side */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Governance Offices
            </CardTitle>
            <CardDescription>
              Defined roles like President, Secretary, Treasurer, Board Member
            </CardDescription>
          </CardHeader>
          <CardContent>
            {offices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No offices defined yet.{' '}
                <Link href="/dashboard/governance/offices/new" className="underline">
                  Create one
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {offices.map((office) => (
                  <div
                    key={office.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{office.title}</p>
                      {office.description && (
                        <p className="text-xs text-muted-foreground">{office.description}</p>
                      )}
                    </div>
                    <Badge variant="outline">{office._count.terms} term{office._count.terms !== 1 ? 's' : ''}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Committees
            </CardTitle>
            <CardDescription>
              Working groups, standing committees, and advisory bodies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {committees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No committees defined yet.{' '}
                <Link href="/dashboard/governance/committees/new" className="underline">
                  Create one
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {committees.map((committee) => (
                  <div
                    key={committee.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{committee.name}</p>
                      {committee.description && (
                        <p className="text-xs text-muted-foreground">{committee.description}</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {committee._count.memberships} member{committee._count.memberships !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Design note callout */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="py-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Design note:</strong> Governance offices and committee roles are distinct from volunteer roles.
            A person can simultaneously hold a board office, serve on a committee, and be a volunteer —
            each tracked independently with separate term dates and history.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
