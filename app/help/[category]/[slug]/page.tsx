import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getArticle, getCategoryArticles, getCategory } from '@/lib/help/content-parser'
import { ArticleContent } from '@/components/help/article-content'
import { Breadcrumbs } from '@/components/help/breadcrumbs'
import { ArticleFeedback } from '@/components/help/article-feedback'

interface ArticlePageProps {
  params: Promise<{
    category: string
    slug: string
  }>
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { category, slug } = await params
  const article = await getArticle(category, slug)

  if (!article) {
    notFound()
  }

  const categoryData = await getCategory(category)
  const categoryArticles = await getCategoryArticles(category)
  const currentIndex = categoryArticles.findIndex(a => a.id === article.id)
  const prevArticle = currentIndex > 0 ? categoryArticles[currentIndex - 1] : null
  const nextArticle = currentIndex < categoryArticles.length - 1 ? categoryArticles[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <Breadcrumbs
            items={[
              { label: categoryData?.name || '', href: `/help/${category}` },
              { label: article.title }
            ]}
          />

          <div>
            <h1 className="text-3xl font-bold">{article.title}</h1>
          </div>

          <Card>
            <CardContent className="p-8">
              <ArticleContent article={article} />
            </CardContent>
          </Card>

          <ArticleFeedback />

          <div className="flex items-center justify-between">
            {prevArticle && (
              <Link href={`/help/${prevArticle.slug}`}>
                <Button variant="outline" className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  {prevArticle.title}
                </Button>
              </Link>
            )}
            {!prevArticle && <div />}

            {nextArticle && (
              <Link href={`/help/${nextArticle.slug}`}>
                <Button variant="outline" className="gap-2">
                  {nextArticle.title}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          <div className="border-t pt-8">
            <h3 className="font-semibold mb-4">More in {categoryData?.name}</h3>
            <div className="space-y-2">
              {categoryArticles
                .filter(a => a.id !== article.id)
                .slice(0, 5)
                .map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    href={`/help/${relatedArticle.slug}`}
                    className="block text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {relatedArticle.title}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
