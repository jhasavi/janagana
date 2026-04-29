import { Search, Book, Video, Code, MessageCircle, Settings, Users, Calendar, Heart, DollarSign, FileText } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    description: 'New to JanaGana? Start here.',
    articles: [
      { title: 'Sign Up & Create Organization', slug: 'getting-started/sign-up' },
      { title: 'Complete Your Profile', slug: 'getting-started/profile' },
      { title: 'Invite Team Members', slug: 'getting-started/team' },
      { title: 'Dashboard Overview', slug: 'getting-started/dashboard' },
    ]
  },
  {
    id: 'crm',
    title: 'CRM & Contacts',
    icon: Users,
    description: 'Manage contacts, activities, deals, and tasks.',
    articles: [
      { title: 'CRM Overview', slug: 'crm/overview' },
      { title: 'Add & Manage Contacts', slug: 'crm/contacts' },
      { title: 'Track Activities', slug: 'crm/activities' },
      { title: 'Manage Deals Pipeline', slug: 'crm/deals' },
      { title: 'Create & Assign Tasks', slug: 'crm/tasks' },
      { title: 'Manage Companies', slug: 'crm/companies' },
    ]
  },
  {
    id: 'events',
    title: 'Events',
    icon: Calendar,
    description: 'Create and manage events, registrations.',
    articles: [
      { title: 'Create an Event', slug: 'events/create' },
      { title: 'Event Registration', slug: 'events/registration' },
      { title: 'Check-in Attendees', slug: 'events/checkin' },
      { title: 'Event Analytics', slug: 'events/analytics' },
    ]
  },
  {
    id: 'volunteers',
    title: 'Volunteers',
    icon: Heart,
    description: 'Manage volunteer opportunities and signups.',
    articles: [
      { title: 'Create Volunteer Opportunity', slug: 'volunteers/create' },
      { title: 'Manage Signups', slug: 'volunteers/signups' },
      { title: 'Track Volunteer Hours', slug: 'volunteers/hours' },
    ]
  },
  {
    id: 'fundraising',
    title: 'Fundraising',
    icon: DollarSign,
    description: 'Campaigns, donations, and fundraising.',
    articles: [
      { title: 'Create Donation Campaign', slug: 'fundraising/campaigns' },
      { title: 'Record Donations', slug: 'fundraising/donations' },
      { title: 'Donation Analytics', slug: 'fundraising/analytics' },
    ]
  },
  {
    id: 'members',
    title: 'Members',
    icon: Users,
    description: 'Membership management and tiers.',
    articles: [
      { title: 'Membership Tiers', slug: 'members/tiers' },
      { title: 'Member Management', slug: 'members/management' },
      { title: 'Member Portal', slug: 'members/portal' },
    ]
  },
  {
    id: 'integrations',
    title: 'Website Integration',
    icon: Code,
    description: 'Embed JanaGana on your website.',
    articles: [
      { title: 'Quick Start Guide', slug: 'integrations/quick-start' },
      { title: 'Newsletter Widget', slug: 'integrations/newsletter' },
      { title: 'Events Widget', slug: 'integrations/events' },
      { title: 'WordPress Setup', slug: 'integrations/wordpress' },
      { title: 'Wix Setup', slug: 'integrations/wix' },
      { title: 'Squarespace Setup', slug: 'integrations/squarespace' },
    ]
  },
  {
    id: 'api',
    title: 'API & Developers',
    icon: Code,
    description: 'API documentation for developers.',
    articles: [
      { title: 'API Overview', slug: 'api/overview' },
      { title: 'Authentication', slug: 'api/authentication' },
      { title: 'Contacts API', slug: 'api/contacts' },
      { title: 'Events API', slug: 'api/events' },
      { title: 'Webhooks', slug: 'api/webhooks' },
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    description: 'Configure your organization settings.',
    articles: [
      { title: 'Organization Settings', slug: 'settings/organization' },
      { title: 'API Keys', slug: 'settings/api-keys' },
      { title: 'Custom Fields', slug: 'settings/custom-fields' },
      { title: 'Webhooks', slug: 'settings/webhooks' },
    ]
  },
]

const quickLinks = [
  { title: 'How do I add a contact?', slug: 'crm/contacts#add-contact' },
  { title: 'How do I create an event?', slug: 'events/create' },
  { title: 'How do I embed on my website?', slug: 'integrations/quick-start' },
  { title: 'How do I invite team members?', slug: 'getting-started/team' },
]

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground mt-2">
          Find answers, guides, and documentation for JanaGana
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Quick Links */}
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

      {/* Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {helpCategories.map((category) => {
          const Icon = category.icon
          return (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {category.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.articles.map((article) => (
                    <li key={article.slug}>
                      <Link
                        href={`/dashboard/help/${article.slug}`}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline block"
                      >
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Contact Support */}
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
