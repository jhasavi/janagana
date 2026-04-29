import fs from 'fs'
import path from 'path'

export interface HelpArticle {
  id: string
  category: string
  categorySlug: string
  title: string
  content: string
  slug: string
  link?: string
}

export interface HelpCategory {
  id: string
  name: string
  slug: string
  articles: HelpArticle[]
}

export interface HelpContent {
  categories: HelpCategory[]
  articles: HelpArticle[]
}

/**
 * Parse HELP_CONTENT.md into structured data
 */
export async function parseHelpContent(): Promise<HelpContent> {
  const filePath = path.join(process.cwd(), 'docs', 'HELP_CONTENT.md')
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  const lines = fileContent.split('\n')
  const categories: HelpCategory[] = []
  const articles: HelpArticle[] = []

  let currentCategory: HelpCategory | null = null
  let currentArticle: Partial<HelpArticle> | null = null
  let contentLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Category header (## Category Name)
    if (line.startsWith('## ') && !line.startsWith('###')) {
      // Save previous article if exists
      if (currentArticle && currentCategory) {
        currentArticle.content = contentLines.join('\n').trim()
        currentArticle.id = `${currentCategory.slug}-${slugify(currentArticle.title!)}`
        currentArticle.slug = `${currentCategory.slug}/${slugify(currentArticle.title!)}`
        currentArticle.category = currentCategory.name
        currentArticle.categorySlug = currentCategory.slug
        articles.push(currentArticle as HelpArticle)
        currentCategory.articles.push(currentArticle as HelpArticle)
      }

      // Start new category
      const categoryName = line.replace('## ', '').trim()
      const categorySlug = slugify(categoryName)
      currentCategory = {
        id: categorySlug,
        name: categoryName,
        slug: categorySlug,
        articles: []
      }
      categories.push(currentCategory)
      currentArticle = null
      contentLines = []
    }

    // Article header (### Article Name)
    else if (line.startsWith('### ')) {
      // Save previous article if exists
      if (currentArticle && currentCategory) {
        currentArticle.content = contentLines.join('\n').trim()
        currentArticle.id = `${currentCategory.slug}-${slugify(currentArticle.title!)}`
        currentArticle.slug = `${currentCategory.slug}/${slugify(currentArticle.title!)}`
        currentArticle.category = currentCategory.name
        currentArticle.categorySlug = currentCategory.slug
        articles.push(currentArticle as HelpArticle)
        currentCategory.articles.push(currentArticle as HelpArticle)
      }

      // Start new article
      currentArticle = {}
      contentLines = []
    }

    // Title line
    else if (line.startsWith('**Title:**')) {
      if (currentArticle) {
        currentArticle.title = line.replace('**Title:**', '').trim()
      }
    }

    // Content line
    else if (line.startsWith('**Content:**')) {
      // Content starts on next line
      continue
    }

    // Link line
    else if (line.startsWith('**Link:**')) {
      if (currentArticle) {
        currentArticle.link = line.replace('**Link:**', '').trim()
      }
    }

    // Content body (after **Content:** until next header)
    else if (currentArticle && !line.startsWith('**') && !line.startsWith('##') && !line.startsWith('---')) {
      contentLines.push(line)
    }

    // Skip separator lines
    else if (line === '---') {
      continue
    }
  }

  // Save last article
  if (currentArticle && currentCategory) {
    currentArticle.content = contentLines.join('\n').trim()
    currentArticle.id = `${currentCategory.slug}-${slugify(currentArticle.title!)}`
    currentArticle.slug = `${currentCategory.slug}/${slugify(currentArticle.title!)}`
    currentArticle.category = currentCategory.name
    currentArticle.categorySlug = currentCategory.slug
    articles.push(currentArticle as HelpArticle)
    currentCategory.articles.push(currentArticle as HelpArticle)
  }

  return { categories, articles }
}

/**
 * Convert string to URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Get article by category and slug
 */
export async function getArticle(categorySlug: string, articleSlug: string): Promise<HelpArticle | null> {
  const { articles } = await parseHelpContent()
  return articles.find(a => a.slug === `${categorySlug}/${articleSlug}`) || null
}

/**
 * Get all articles in a category
 */
export async function getCategoryArticles(categorySlug: string): Promise<HelpArticle[]> {
  const { articles } = await parseHelpContent()
  return articles.filter(a => a.categorySlug === categorySlug)
}

/**
 * Get category by slug
 */
export async function getCategory(categorySlug: string): Promise<HelpCategory | null> {
  const { categories } = await parseHelpContent()
  return categories.find(c => c.slug === categorySlug) || null
}
