import { ImportCenterPanel } from '@/app/(dashboard)/dashboard/settings/organization-console/import-center/_components/import-center-panel'

export const dynamic = 'force-dynamic'

export default function PreviewImportCenterPage() {
  return (
    <main className="max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Import Center</h1>
      <ImportCenterPanel />
    </main>
  )
}
