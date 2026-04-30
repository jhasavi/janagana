import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCategory, getCategoryArticles } from '@/lib/help/content-parser'
import { Breadcrumbs } from '@/components/help/breadcrumbs'

interface CategoryPageProps {
  params: Promise<{
    category: string
  }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params
  const categoryData = await getCategory(category)
  const articles = await getCategoryArticles(category)

  if (!categoryData) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        homeHref="/dashboard/help"
        items={[
          { label: 'Help Center', href: '/dashboard/help' },
          { label: categoryData.name }
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">{categoryData.name}</h1>
        <p className="text-muted-foreground mt-2">
          {articles.length} articles
        </p>
      </div>

      <div className="space-y-4">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/dashboard/help/${article.slug}`}
            className="block"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {article.content.substring(0, 150)}...
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="pt-4">
        <Link href="/dashboard/help">
          <Button variant="outline" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Help Center
          </Button>
        </Link>
      </div>
    </div>
  )
}
