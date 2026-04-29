import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCategory } from '@/lib/help/content-parser'
import { Book, Users, Calendar, Heart, DollarSign, Code, Settings } from 'lucide-react'

const categoryIcons: Record<string, any> = {
  'getting-started': Book,
  'crm': Users,
  'events': Calendar,
  'volunteers': Heart,
  'fundraising': DollarSign,
  'members': Users,
  'integrations': Code,
  'api': Code,
  'settings': Settings,
}

interface CategoryCardProps {
  category: HelpCategory
  href?: string
}

export function CategoryCard({ category, href }: CategoryCardProps) {
  const Icon = categoryIcons[category.slug] || Book
  const linkHref = href || `/help/${category.slug}`

  return (
    <Link href={linkHref}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5" />
            {category.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {category.articles.length} articles
          </p>
          <ul className="space-y-2">
            {category.articles.slice(0, 3).map((article) => (
              <li key={article.id}>
                <span className="text-sm text-muted-foreground">
                  {article.title}
                </span>
              </li>
            ))}
            {category.articles.length > 3 && (
              <li>
                <span className="text-sm text-muted-foreground">
                  +{category.articles.length - 3} more
                </span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </Link>
  )
}
