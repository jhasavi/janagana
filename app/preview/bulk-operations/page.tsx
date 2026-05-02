import { BulkOperationsPanel } from '@/app/(dashboard)/dashboard/settings/organization-console/bulk-operations/_components/bulk-operations-panel'

export default function PreviewBulkOperationsPage() {
  return (
    <main className="max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bulk Operations Center</h1>
      <BulkOperationsPanel />
    </main>
  )
}
