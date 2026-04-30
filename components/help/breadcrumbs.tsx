import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
  id?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  homeHref?: string
}

export function Breadcrumbs({ items, homeHref = '/help' }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link href={homeHref} className="hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <div key={item.id || item.label || index} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
