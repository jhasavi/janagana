import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportCenterPanel } from './_components/import-center-panel'

export default function ImportCenterPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/dashboard/settings/organization-console">
            <ArrowLeft className="h-4 w-4" />
            Back to Organization Console
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Import Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Centralized import with preview validation, duplicate strategy controls, and audit trail.
        </p>
      </div>

      <ImportCenterPanel />
    </div>
  )
}
