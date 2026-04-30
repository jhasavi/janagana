import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GitMerge, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

export default async function DuplicatesPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  const suggestions = await prisma.duplicateSuggestion.findMany({
    where: { tenantId: tenant.id, status: 'PENDING' },
    include: {
      contactA: { select: { id: true, firstName: true, lastName: true, emails: true, email: true, lifecycleStage: true } },
      contactB: { select: { id: true, firstName: true, lastName: true, emails: true, email: true, lifecycleStage: true } },
    },
    orderBy: { confidenceScore: 'desc' },
  })

  const resolvedCount = await prisma.duplicateSuggestion.count({
    where: { tenantId: tenant.id, status: { in: ['MERGED', 'DISMISSED'] } },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitMerge className="h-8 w-8 text-indigo-600" />
            Duplicate People
          </h1>
          <p className="text-muted-foreground mt-1">
            Soft-match suggestions for review. Only privileged admins can merge records.
            All merges are audited and reversible.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Pending Review
            </CardDescription>
            <CardTitle className="text-2xl">{suggestions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Resolved
            </CardDescription>
            <CardTitle className="text-2xl">{resolvedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <GitMerge className="h-4 w-4 text-indigo-600" />
              Detection policy
            </CardDescription>
            <CardTitle className="text-sm font-medium pt-2">Soft warning + admin merge</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Duplicate Suggestions</CardTitle>
          <CardDescription>
            Review these matches and either merge the records or dismiss the suggestion.
            High confidence scores indicate stronger evidence of duplication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-70" />
              <p className="font-medium">No pending duplicates</p>
              <p className="text-sm mt-1">
                The system will flag potential duplicates here when contacts are created via
                imports, website forms, or API integrations.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact A</TableHead>
                  <TableHead>Contact B</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Match Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s) => {
                  const emailA = s.contactA.emails?.[0] ?? s.contactA.email ?? '—'
                  const emailB = s.contactB.emails?.[0] ?? s.contactB.email ?? '—'
                  const confidenceColor =
                    s.confidenceScore >= 80
                      ? 'bg-red-100 text-red-800'
                      : s.confidenceScore >= 50
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'

                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/dashboard/crm/contacts/${s.contactAId}`}
                            className="font-medium hover:underline"
                          >
                            {s.contactA.firstName} {s.contactA.lastName}
                          </Link>
                          <p className="text-xs text-muted-foreground">{emailA}</p>
                          {s.contactA.lifecycleStage && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {s.contactA.lifecycleStage}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Link
                            href={`/dashboard/crm/contacts/${s.contactBId}`}
                            className="font-medium hover:underline"
                          >
                            {s.contactB.firstName} {s.contactB.lastName}
                          </Link>
                          <p className="text-xs text-muted-foreground">{emailB}</p>
                          {s.contactB.lifecycleStage && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {s.contactB.lifecycleStage}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={confidenceColor}>{s.confidenceScore}%</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.matchReason ?? '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          asChild
                          variant="default"
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Link href={`/dashboard/crm/duplicates/${s.id}/merge`}>
                            Merge
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/crm/duplicates/${s.id}/dismiss`}>
                            Dismiss
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="py-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Deduplication policy
          </p>
          <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
            <li>Matching uses email, phone, then name + postal code (soft match only)</li>
            <li>New contact creation never hard-blocks — always soft warning</li>
            <li>Merge requires a privileged admin; action is audited</li>
            <li>Merge survivorship: prefer verified, latest, or high-confidence field values</li>
            <li>All source values and aliases are preserved in history after merge</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
