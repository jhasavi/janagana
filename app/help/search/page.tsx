import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Search, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { searchArticles } from '@/lib/help/search-index'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ''

  if (!query) {
    redirect('/help')
  }

  const results = await searchArticles(query)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <Link href="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            ← Back to Help Center
          </Link>

          <div>
            <h1 className="text-3xl font-bold mb-4">Search Results</h1>
            <form action="/help/search" method="GET">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Search for help..."
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </form>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
            </p>

            {results.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No results found. Try different keywords or browse categories.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <Link key={result.article.id} href={`/help/${result.article.slug}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{result.article.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {result.article.category}
                            </p>
                            {result.highlights.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {result.highlights[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
