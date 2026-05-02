import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BulkOperationsPanel } from './_components/bulk-operations-panel'

export default function BulkOperationsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/dashboard/settings/organization-console">
            <ArrowLeft className="h-4 w-4" />
            Back to Organization Console
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Operations Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Run tenant-scoped bulk actions with validation, preview, and typed confirmation.
        </p>
      </div>

      <BulkOperationsPanel />
    </div>
  )
}
