import Link from 'next/link'
import { CheckCircle2, Circle, ShieldCheck, Upload, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const checklist = [
  ['Import contacts', true],
  ['Review duplicate contacts', false],
  ['Configure membership tiers', true],
  ['Set backup/restore policy', false],
]

export default function PreviewOrganizationConsolePage() {
  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Organization Console</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Checklist Progress</p><p className="text-2xl font-semibold">2/4</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">High-risk actions</p><p className="text-2xl font-semibold">Guarded</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tenant safety</p><p className="text-2xl font-semibold">Enabled</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Owner Action Center / Setup Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {checklist.map(([label, done]) => (
            <div key={String(label)} className="rounded border p-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">{done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4" />}<span>{label}</span></div>
              <span>{done ? 'Done' : 'Pending'}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Bulk Operations</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" />Import Center</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" />Data Cleanup</CardTitle></CardHeader></Card>
      </div>
      <p className="text-sm"><Link href="/dashboard/settings/organization-console" className="text-blue-600 underline">Open real route</Link> (requires auth).</p>
    </main>
  )
}
