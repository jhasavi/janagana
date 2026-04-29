import { parseHelpContent, HelpArticle } from './content-parser'

export interface SearchResult {
  article: HelpArticle
  score: number
  highlights: string[]
}

/**
 * Build search index from all articles
 */
export async function buildSearchIndex(): Promise<HelpArticle[]> {
  const { articles } = await parseHelpContent()
  return articles
}

/**
 * Search articles by query
 */
export async function searchArticles(query: string): Promise<SearchResult[]> {
  const articles = await buildSearchIndex()
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return []
  }

  const results: SearchResult[] = []

  for (const article of articles) {
    const titleMatch = article.title.toLowerCase().includes(normalizedQuery)
    const contentMatch = article.content.toLowerCase().includes(normalizedQuery)
    const categoryMatch = article.category.toLowerCase().includes(normalizedQuery)

    if (titleMatch || contentMatch || categoryMatch) {
      let score = 0
      const highlights: string[] = []

      if (titleMatch) {
        score += 10
        highlights.push(article.title)
      }

      if (categoryMatch) {
        score += 5
      }

      if (contentMatch) {
        score += 3
        // Extract context around match
        const contentLower = article.content.toLowerCase()
        const matchIndex = contentLower.indexOf(normalizedQuery)
        if (matchIndex !== -1) {
          const start = Math.max(0, matchIndex - 30)
          const end = Math.min(article.content.length, matchIndex + query.length + 30)
          const context = article.content.substring(start, end)
          highlights.push('...' + context + '...')
        }
      }

      results.push({
        article,
        score,
        highlights: highlights.slice(0, 2)
      })
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score)

  return results
}
