import { Search, MessageCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchBar } from '@/components/help/search-bar'
import { CategoryCard } from '@/components/help/category-card'
import { parseHelpContent } from '@/lib/help/content-parser'

const quickLinks = [
  { title: 'How do I add a contact?', slug: 'crm/add-manage-contacts' },
  { title: 'How do I create an event?', slug: 'events/create-an-event' },
  { title: 'How do I embed on my website?', slug: 'integrations/quick-start-guide' },
  { title: 'How do I invite team members?', slug: 'getting-started/invite-team-members' },
]

export default async function HelpPage() {
  const { categories, articles } = await parseHelpContent()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground mt-2">
          Find answers, guides, and documentation for JanaGana
        </p>
      </div>

      <div className="max-w-2xl">
        <SearchBar placeholder="Search for help..." className="w-full" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Quick Answers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.slug}
                href={`/dashboard/help/${link.slug}`}
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{link.title}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-semibold mb-6">Browse by Category</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} href={`/dashboard/help/${category.slug}`} />
          ))}
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Still need help?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Can&apos;t find what you&apos;re looking for? Contact our support team.
              </p>
            </div>
            <Link
              href="mailto:support@janagana.com"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
