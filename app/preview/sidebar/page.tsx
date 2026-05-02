import { Sidebar } from '@/components/dashboard/Sidebar'

export default function PreviewSidebarPage() {
  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold">Sidebar IA Preview</h1>
        <p className="text-muted-foreground">Grouped sections and contacts-first navigation.</p>
      </div>
    </div>
  )
}
