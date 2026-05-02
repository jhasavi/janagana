import Link from 'next/link'
import { ArrowLeft, GitMerge, ShieldCheck, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDataCleanupSummary } from '@/lib/actions/organization-console'

export default async function DataCleanupPage() {
  const result = await getDataCleanupSummary()
  const data = result.data

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/dashboard/settings/organization-console">
            <ArrowLeft className="h-4 w-4" />
            Back to Organization Console
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Data Cleanup Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review duplicates, invalid records, archived entries, and linked data quality issues.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Duplicate contacts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{data?.duplicates ?? 0}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/crm/duplicates">
                <GitMerge className="h-4 w-4" />
                Review duplicates
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Archived contacts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{data?.archivedContacts ?? 0}</p>
            <p className="text-xs text-muted-foreground">Restore from Bulk Operations with segment set to Archived.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Potential invalid emails</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{data?.invalidEmailCandidates ?? 0}</p>
            <p className="text-xs text-muted-foreground">These records likely need manual cleanup.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data quality checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span>Contacts missing email</span>
            <span className="font-medium">{data?.missingEmail ?? 0}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span>Contacts missing first or last name</span>
            <span className="font-medium">{data?.missingName ?? 0}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span>Orphaned membership enrollments</span>
            <span className="font-medium">{data?.orphanedEnrollments ?? 0}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Safety defaults in this console</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Role-gated admin access for bulk operations</p>
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Preview + affected counts before commit</p>
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Typed CONFIRM for high-risk scopes</p>
          <p className="flex items-center gap-2"><Undo2 className="h-4 w-4" /> Archive/restore pattern instead of hard delete</p>
        </CardContent>
      </Card>
    </div>
  )
}
