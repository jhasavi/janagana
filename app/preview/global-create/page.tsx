import { GlobalCreate } from '@/components/dashboard/global-create'

export default function PreviewGlobalCreatePage() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Global + Create Preview</h1>
      <p className="text-muted-foreground">Open the modal to see quick create options.</p>
      <GlobalCreate />
    </main>
  )
}
