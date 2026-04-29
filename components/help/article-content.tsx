import { HelpArticle } from '@/lib/help/content-parser'

interface ArticleContentProps {
  article: HelpArticle
}

export function ArticleContent({ article }: ArticleContentProps) {
  const formatContent = (content: string) => {
    // Convert numbered lists
    let formatted = content.replace(/^(\d+)\.\s/gm, '$1. ')

    // Convert bullet points
    formatted = formatted.replace(/^-\s/gm, '• ')

    // Convert bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Convert line breaks to paragraphs
    const paragraphs = formatted.split('\n\n').filter(p => p.trim())

    return paragraphs.map((paragraph, index) => {
      if (paragraph.includes('\n')) {
        // Handle multi-line content (like lists)
        const lines = paragraph.split('\n').filter(l => l.trim())
        return (
          <div key={index} className="space-y-1 my-4">
            {lines.map((line, lineIndex) => (
              <p key={lineIndex} className="text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        )
      }
      return (
        <p key={index} className="text-muted-foreground my-4">
          {paragraph}
        </p>
      )
    })
  }

  return (
    <div className="prose prose-sm max-w-none">
      {formatContent(article.content)}
      {article.link && (
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-block mt-4"
        >
          Learn more →
        </a>
      )}
    </div>
  )
}
