import Link from 'next/link'
import { CheckCircle2, Circle, ShieldCheck, Upload, Wrench, ArrowRight } from 'lucide-react'
import { getOrganizationConsoleChecklist } from '@/lib/actions/organization-console'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function OrganizationConsolePage() {
  const checklistResult = await getOrganizationConsoleChecklist()
  const checklist = checklistResult.data ?? []
  const completed = checklist.filter((item) => item.done).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Console</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Self-service setup, bulk operations, and cleanup tools for organization owners and admins.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Checklist Progress</p>
            <p className="text-2xl font-semibold mt-1">{completed}/{checklist.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">High-risk actions</p>
            <p className="text-2xl font-semibold mt-1">Guarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tenant safety</p>
            <p className="text-2xl font-semibold mt-1">Enabled</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Owner Action Center / Setup Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.done ? 'Done' : 'Pending'}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Bulk Operations Center
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Preview and run controlled bulk actions with typed confirmation and audit logging.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings/organization-console/bulk-operations">
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Center
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload CSV, preview validation and duplicates, then commit with import strategy controls.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings/organization-console/import-center">
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Data Cleanup Center
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Review duplicates, invalid data, archived records, and broken links with safer recovery.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings/organization-console/data-cleanup">
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
