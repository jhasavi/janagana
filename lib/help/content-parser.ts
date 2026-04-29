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
  
  if (!fs.existsSync(filePath)) {
    console.error(`Help content file not found: ${filePath}`)
    return { categories: [], articles: [] }
  }
  
  let fileContent: string
  try {
    fileContent = fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    console.error(`Error reading help content file: ${error}`)
    return { categories: [], articles: [] }
  }

  const lines = fileContent.split('\n')
  const categories: HelpCategory[] = []
  const articles: HelpArticle[] = []

  let currentCategory: HelpCategory | null = null
  let currentArticle: Partial<HelpArticle> | null = null
  let contentLines: string[] = []
  let inArticleContent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Category header (## Category Name) - only when NOT in article content
    if (line.startsWith('## ') && !line.startsWith('###') && !inArticleContent) {
      // Save previous category's articles
      if (currentCategory) {
        // Save last article in category
        if (currentArticle && currentArticle.title) {
          currentArticle.content = contentLines.join('\n').trim()
          currentArticle.id = `${currentCategory.slug}-${slugify(currentArticle.title)}`
          currentArticle.slug = `${currentCategory.slug}/${slugify(currentArticle.title)}`
          currentArticle.category = currentCategory.name
          currentArticle.categorySlug = currentCategory.slug
          articles.push(currentArticle as HelpArticle)
          currentCategory.articles.push(currentArticle as HelpArticle)
        }
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
      inArticleContent = false
    }

    // ## headers inside article content are treated as content
    else if (line.startsWith('## ') && inArticleContent && currentArticle) {
      contentLines.push(line)
    }

    // Article header (### Article Name) - only if followed by **Title:** and NOT in article content
    else if (line.startsWith('### ') && !inArticleContent) {
      // Check if next non-empty line is **Title:** - if so, it's a new article
      let isArticleHeader = false
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim()
        if (nextLine === '') continue
        if (nextLine.startsWith('**Title:**')) {
          isArticleHeader = true
          break
        }
        break // Found non-empty line that's not **Title:**
      }

      if (isArticleHeader) {
        // Save previous article if exists and has title
        if (currentArticle && currentCategory) {
          if (!currentArticle.title) {
            console.warn(`Article in category ${currentCategory.name} is missing a title, skipping`)
          } else {
            currentArticle.content = contentLines.join('\n').trim()
            currentArticle.id = `${currentCategory.slug}-${slugify(currentArticle.title)}`
            currentArticle.slug = `${currentCategory.slug}/${slugify(currentArticle.title)}`
            currentArticle.category = currentCategory.name
            currentArticle.categorySlug = currentCategory.slug
            articles.push(currentArticle as HelpArticle)
            currentCategory.articles.push(currentArticle as HelpArticle)
          }
        }

        // Start new article
        currentArticle = {}
        contentLines = []
        inArticleContent = false
      }
    }

    // ### headers inside article content are treated as content
    else if (line.startsWith('### ') && inArticleContent && currentArticle) {
      contentLines.push(line)
    }

    // Title line - only accepted before content starts
    else if (!inArticleContent && line.startsWith('**Title:**')) {
      if (!currentArticle) {
        currentArticle = {}
      }
      currentArticle.title = line.replace('**Title:**', '').trim()
    }

    // Content line - only accepted before content starts
    else if (!inArticleContent && line === '**Content:**') {
      if (currentArticle) {
        inArticleContent = true
      }
      continue
    }

    // Link line - only accepted before content starts
    else if (!inArticleContent && line.startsWith('**Link:**')) {
      if (currentArticle) {
        currentArticle.link = line.replace('**Link:**', '').trim()
      }
    }

    // Skip separator lines - they end article content
    else if (line === '---' || line === '----') {
      if (inArticleContent && currentArticle && currentCategory) {
        // Save current article
        if (!currentArticle.title) {
          console.warn(`Article in category ${currentCategory.name} is missing a title, skipping`)
        } else {
          currentArticle.content = contentLines.join('\n').trim()
          currentArticle.id = `${currentCategory.slug}-${slugify(currentArticle.title)}`
          currentArticle.slug = `${currentCategory.slug}/${slugify(currentArticle.title)}`
          currentArticle.category = currentCategory.name
          currentArticle.categorySlug = currentCategory.slug
          articles.push(currentArticle as HelpArticle)
          currentCategory.articles.push(currentArticle as HelpArticle)
        }
        currentArticle = null
        contentLines = []
        inArticleContent = false
      }
      continue
    }

    // Content body (after **Content:** until next ### article header)
    // Allow all other content including ## headers, --- separators, and **bold** text
    // Only exclude new article headers (###)
    else if (currentArticle && inArticleContent && !line.startsWith('###')) {
      contentLines.push(line)
    }
  }

  // Save last article
  if (currentArticle && currentCategory) {
    if (!currentArticle.title) {
      console.warn(`Article in category ${currentCategory.name} is missing a title, skipping`)
    } else {
      currentArticle.content = contentLines.join('\n').trim()
      currentArticle.id = `${currentCategory.slug}-${slugify(currentArticle.title)}`
      currentArticle.slug = `${currentCategory.slug}/${slugify(currentArticle.title)}`
      currentArticle.category = currentCategory.name
      currentArticle.categorySlug = currentCategory.slug
      articles.push(currentArticle as HelpArticle)
      currentCategory.articles.push(currentArticle as HelpArticle)
    }
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
