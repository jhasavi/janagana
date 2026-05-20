import { HelpArticle } from '@/lib/help/content-parser'

interface ArticleContentProps {
  article: HelpArticle
}

type Block =
  | { type: 'code'; lang: string; code: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }

function getListItem(line: string) {
  const unordered = line.match(/^\s*[-*]\s+(.+)$/)
  if (unordered) return { ordered: false, text: unordered[1] }

  const ordered = line.match(/^\s*\d+\.\s+(.+)$/)
  if (ordered) return { ordered: true, text: ordered[1] }

  return null
}

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') })
      i++ // skip closing ```
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, text: line.slice(4).trim() })
      i++
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: line.slice(3).trim() })
      i++
      continue
    }

    // Blank line — paragraph break
    if (line.trim() === '') {
      i++
      continue
    }

    const listItem = getListItem(line)
    if (listItem) {
      const ordered = listItem.ordered
      const items: string[] = []
      while (i < lines.length) {
        const item = getListItem(lines[i])
        if (!item || item.ordered !== ordered) break
        items.push(item.text.trim())
        i++
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    // Accumulate paragraph lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trimStart().startsWith('```') &&
      !lines[i].startsWith('## ') &&
      !lines[i].startsWith('### ') &&
      !getListItem(lines[i])
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') })
    }
  }

  return blocks
}

/** Render inline markdown: **bold**, `code` */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

export function ArticleContent({ article }: ArticleContentProps) {
  const blocks = parseBlocks(article.content)

  return (
    <div className="prose prose-sm max-w-none space-y-3">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <pre
              key={idx}
              className="bg-muted rounded-md p-4 overflow-x-auto text-xs font-mono leading-relaxed"
            >
              <code>{block.code}</code>
            </pre>
          )
        }

        if (block.type === 'heading') {
          const Tag = block.level === 2 ? 'h2' : 'h3'
          const cls =
            block.level === 2
              ? 'text-base font-semibold mt-5 mb-1'
              : 'text-sm font-semibold mt-4 mb-1'
          return (
            <Tag key={idx} className={cls}>
              {block.text}
            </Tag>
          )
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          return (
            <ListTag
              key={idx}
              className={`text-sm text-muted-foreground space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ListTag>
          )
        }

        return (
          <p key={idx} className="text-muted-foreground text-sm leading-6">
            {renderInline(block.text)}
          </p>
        )
      })}

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
