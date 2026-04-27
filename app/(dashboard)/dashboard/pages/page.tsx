import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Globe, FileText, Eye, EyeOff, Navigation } from 'lucide-react'
import { getContentPages } from '@/lib/actions/pages'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Pages' }

export default async function PagesPage() {
  const result = await getContentPages()
  const pages = result.data ?? []

  const published = pages.filter((p) => p.isPublished).length
  const drafts    = pages.filter((p) => !p.isPublished).length
  const inNav     = pages.filter((p) => p.showInNav).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create public pages for your member portal (About, FAQ, Contact, etc.)
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/pages/new">
            <Plus className="h-4 w-4" /> New Page
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Published</p>
            <p className="text-3xl font-bold mt-1">{published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Drafts</p>
            <p className="text-3xl font-bold mt-1">{drafts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">In Portal Nav</p>
            <p className="text-3xl font-bold mt-1">{inNav}</p>
          </CardContent>
        </Card>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No pages yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Create pages like About Us, Contact, FAQ to display on your member portal.
            </p>
            <Button asChild size="sm">
              <Link href="/dashboard/pages/new"><Plus className="h-4 w-4" /> Create First Page</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base line-clamp-1">{page.title}</CardTitle>
                <div className="flex items-center gap-1.5 shrink-0">
                  {page.showInNav && (
                    <Navigation className="h-3.5 w-3.5 text-blue-500" aria-label="Shown in navigation" />
                  )}
                  <Badge variant={page.isPublished ? 'success' : 'secondary'}>
                    {page.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {page.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{page.excerpt}</p>
                )}
                <p className="text-xs text-muted-foreground font-mono">
                  /{page.slug}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Updated {formatDate(page.updatedAt)}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/dashboard/pages/${page.id}`}>Edit</Link>
                  </Button>
                  {page.isPublished && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={`#portal-preview`} title="View on portal">
                        <Globe className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
