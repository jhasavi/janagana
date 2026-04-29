import { parseHelpContent, HelpArticle } from './content-parser'

export interface SearchResult {
  article: HelpArticle
  score: number
  highlights: string[]
}

// Simple in-memory cache with 5-minute TTL
let searchIndexCache: HelpArticle[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Build search index from all articles
 */
export async function buildSearchIndex(): Promise<HelpArticle[]> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (searchIndexCache && (now - cacheTimestamp) < CACHE_TTL) {
    return searchIndexCache
  }
  
  const { articles } = await parseHelpContent()
  searchIndexCache = articles
  cacheTimestamp = now
  return articles
}

/**
 * Clear the search index cache (call after content updates)
 */
export function clearSearchCache(): void {
  searchIndexCache = null
  cacheTimestamp = 0
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
          const end = Math.min(article.content.length, matchIndex + normalizedQuery.length + 30)
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
