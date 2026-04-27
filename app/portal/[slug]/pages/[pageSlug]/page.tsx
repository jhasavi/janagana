import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicContentPage } from '@/lib/actions/pages'
import { formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string; pageSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageSlug } = await params
  const result = await getPublicContentPage(slug, pageSlug)
  if (!result.data) return { title: 'Page Not Found' }
  return {
    title: result.data.title,
    description: result.data.excerpt ?? undefined,
  }
}

export default async function PortalPagePage({ params }: Props) {
  const { slug, pageSlug } = await params
  const result = await getPublicContentPage(slug, pageSlug)

  if (!result.success || !result.data) notFound()
  const page = result.data

  return (
    <article className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        {page.excerpt && (
          <p className="text-muted-foreground text-lg">{page.excerpt}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Last updated {formatDate(page.updatedAt)}
        </p>
      </header>

      <div
        className="prose prose-sm sm:prose max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </article>
  )
}
