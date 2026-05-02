import Link from 'next/link'
import { UserPlus, Upload, Download, ShieldCheck, GitMerge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PreviewContactsPage() {
  return (
    <main className="p-6 space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900">Contacts: Your master CRM records</h3>
        <p className="text-sm text-green-700 mt-1">
          Every person starts as a Contact. Memberships, donations, volunteering, event registrations,
          deals, tasks, and communication history all attach to that same contact record.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Add and manage people as contacts first.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import Contacts</Button>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button variant="outline"><ShieldCheck className="h-4 w-4 mr-2" />Bulk Actions</Button>
          <Button variant="outline"><GitMerge className="h-4 w-4 mr-2" />Duplicate Review</Button>
          <Button><UserPlus className="h-4 w-4 mr-2" />Add Contact</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Table preview intentionally omitted in authless harness.</p>
          <p className="text-sm mt-2">Filters shown in implemented table: All Contacts, Members, Donors, Volunteers, Attendees, Leads.</p>
          <p className="text-sm mt-2"><Link className="text-blue-600 underline" href="/dashboard/crm">Open real route</Link> (requires auth).</p>
        </CardContent>
      </Card>
    </main>
  )
}
