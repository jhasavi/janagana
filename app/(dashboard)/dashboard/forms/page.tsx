import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, ClipboardList, ExternalLink } from 'lucide-react'
import { getForms } from '@/lib/actions/forms'
import { getTenantSettings } from '@/lib/actions/tenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'Forms' }

export default async function FormsPage() {
  const [formResult, tenantResult] = await Promise.all([getForms(), getTenantSettings()])
  const forms = formResult.data ?? []
  const slug = tenantResult.data?.slug

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build custom forms for member registration, surveys, and event intake.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/forms/new">
            <Plus className="h-4 w-4" />
            New Form
          </Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No forms yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Build online forms for member sign-ups, event registration, feedback, and more.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/dashboard/forms/new">
                <Plus className="h-4 w-4" />
                Create your first form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardContent className="flex items-start gap-4 py-4 px-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/dashboard/forms/${form.id}`} className="font-semibold text-sm hover:underline">
                      {form.title}
                    </Link>
                    <Badge variant={form.isPublished ? 'default' : 'secondary'} className="text-xs">
                      {form.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    {form.requiresAuth && <Badge variant="outline" className="text-xs">Members only</Badge>}
                  </div>
                  {form.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{form.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{form._count.fields} fields</span>
                    <span>{form._count.submissions} submissions</span>
                    <span>Created {formatDistanceToNow(form.createdAt, { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {form.isPublished && slug && (
                    <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0" title="View public form">
                      <Link href={`/portal/${slug}/forms/${form.slug}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/forms/${form.id}`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
