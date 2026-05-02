import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PreviewDataCleanupPage() {
  return (
    <main className="max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Data Cleanup Center</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Duplicate contacts</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">12</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Archived contacts</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">34</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Potential invalid emails</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">7</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Data quality checks</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="rounded border p-2 flex justify-between"><span>Contacts missing email</span><span>18</span></div>
          <div className="rounded border p-2 flex justify-between"><span>Missing first or last name</span><span>4</span></div>
          <div className="rounded border p-2 flex justify-between"><span>Orphaned enrollments</span><span>0</span></div>
        </CardContent>
      </Card>
    </main>
  )
}
