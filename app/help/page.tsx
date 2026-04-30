import { Search, MessageCircle, FileText, User, Code, Users, Layout } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryCard } from '@/components/help/category-card'
import { parseHelpContent } from '@/lib/help/content-parser'

const quickLinks = [
  { title: 'How do I add a contact?', slug: 'crm/add-manage-contacts' },
  { title: 'How do I create an event?', slug: 'events/create-an-event' },
  { title: 'How do I embed on my website?', slug: 'integrations/website-integration-quick-start' },
  { title: 'How do I invite team members?', slug: 'getting-started/invite-team-members' },
]

const roleBasedEntryPoints = [
  {
    title: 'I\'m an Organization Admin',
    description: 'Manage your organization, members, events, and settings',
    icon: User,
    links: [
      { title: 'Getting Started Guide', slug: 'getting-started/sign-up-create-organization' },
      { title: 'Organization Settings', slug: 'settings/organization-settings' },
      { title: 'CRM Overview', slug: 'crm/crm-overview' },
    ]
  },
  {
    title: 'I\'m a Member',
    description: 'Access the member portal, register for events, and manage your profile',
    icon: Users,
    links: [
      { title: 'Member Portal Guide', slug: 'members/member-portal' },
      { title: 'Register for Events', slug: 'events/event-registration' },
      { title: 'Update Your Profile', slug: 'getting-started/complete-your-profile' },
    ]
  },
  {
    title: 'I\'m Integrating JanaGana',
    description: 'Embed widgets on your website or use the API',
    icon: Code,
    links: [
      { title: 'Quick Start Integration', slug: 'integrations/website-integration-quick-start' },
      { title: 'Next.js Integration', slug: 'integrations/nextjs-integration' },
      { title: 'WordPress Setup', slug: 'integrations/wordpress-integration' },
    ]
  },
  {
    title: 'I\'m Using the API',
    description: 'Build custom integrations with our REST API',
    icon: Layout,
    links: [
      { title: 'API Overview', slug: 'api/api-overview' },
      { title: 'Authentication', slug: 'api/api-authentication' },
      { title: 'Webhooks', slug: 'api/webhooks' },
    ]
  },
]

export default async function HelpPage() {
  const { categories, articles } = await parseHelpContent()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Help Center</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Find answers, guides, and documentation for JanaGana
            </p>
          </div>

          <div className="max-w-2xl">
            <Link href="/help/search">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for help..."
                  className="pl-10 h-12 text-lg cursor-pointer"
                  readOnly
                />
              </div>
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">I am...</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {roleBasedEntryPoints.map((entry) => {
                const Icon = entry.icon
                return (
                  <Card key={entry.title} className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" />
                        {entry.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {entry.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {entry.links.map((link) => (
                          <li key={link.slug}>
                            <Link
                              href={`/help/${link.slug}`}
                              className="text-sm text-muted-foreground hover:text-foreground hover:underline block"
                            >
                              {link.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
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
                    href={`/help/${link.slug}`}
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
                <CategoryCard key={category.id} category={category} />
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
      </div>
    </div>
  )
}
