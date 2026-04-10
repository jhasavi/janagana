import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Users, Calendar, Heart, Users2, Mail, Search, ChevronRight, Video, FileText, MessageCircle } from 'lucide-react';
import * as React from 'react';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const guides = [
    {
      icon: BookOpen,
      title: 'Getting Started Guide',
      description: 'Set up your organization in 5 minutes',
      href: '#getting-started',
    },
    {
      icon: Users,
      title: 'Member Management',
      description: 'Add, import, and manage your members',
      href: '#members',
    },
    {
      icon: Calendar,
      title: 'Events',
      description: 'Create events, sell tickets, check in attendees',
      href: '#events',
    },
    {
      icon: Heart,
      title: 'Volunteers',
      description: 'Recruit volunteers and track hours',
      href: '#volunteers',
    },
    {
      icon: Users2,
      title: 'Clubs & Groups',
      description: 'Create member communities',
      href: '#clubs',
    },
    {
      icon: Mail,
      title: 'Communications',
      description: 'Send email campaigns and announcements',
      href: '#communications',
    },
  ];

  const faqs = [
    {
      question: 'How do I add members to my organization?',
      answer: 'You can add members individually by clicking "Add Member" in the Members section, or import multiple members at once using our CSV template. You can also send sign-up links to members.',
    },
    {
      question: 'Can I import members from another system?',
      answer: 'Yes! We provide a CSV import template that makes it easy to migrate your existing member database. Go to Members → Import to download the template.',
    },
    {
      question: 'How do I create an event?',
      answer: 'Navigate to the Events section and click "Create Event". Fill in the event details, add ticket types if needed, and publish. Members can then register through your public event page.',
    },
    {
      question: 'How do volunteer hours work?',
      answer: 'Create volunteer opportunities in the Volunteers section. Members can sign up and log their hours. You can track total hours per member and generate reports.',
    },
    {
      question: 'What are clubs and groups?',
      answer: 'Clubs and groups allow members to create their own communities within your organization. Members can post, comment, and engage with each other in these spaces.',
    },
    {
      question: 'How do I send email campaigns?',
      answer: 'Go to Communications → Campaigns. Create a new campaign, select your audience, write your content, and schedule or send immediately.',
    },
    {
      question: 'Can I customize my organization\'s branding?',
      answer: 'Yes! Go to Settings → Branding to upload your logo, set custom colors, and configure your custom domain (on Growth and Pro plans).',
    },
    {
      question: 'How do I upgrade my plan?',
      answer: 'Go to Settings → Billing to view your current plan and upgrade options. You can choose monthly or annual billing.',
    },
  ];

  const filteredGuides = guides.filter(guide =>
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find guides, tutorials, and answers to help you get the most out of OrgFlow.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for guides, FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>

        {/* Getting Started Section */}
        <section id="getting-started" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">Getting Started</h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Welcome to OrgFlow! Here's how to get started:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">1</div>
                  <div>
                    <h3 className="font-semibold">Complete the Setup Wizard</h3>
                    <p className="text-sm text-muted-foreground">Add your organization name, logo, and basic settings.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">2</div>
                  <div>
                    <h3 className="font-semibold">Import Your Members</h3>
                    <p className="text-sm text-muted-foreground">Use our CSV template to import your existing member database.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">3</div>
                  <div>
                    <h3 className="font-semibold">Create Your First Event</h3>
                    <p className="text-sm text-muted-foreground">Set up an event page with ticket types and start accepting registrations.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">4</div>
                  <div>
                    <h3 className="font-semibold">Invite Your Team</h3>
                    <p className="text-sm text-muted-foreground">Add admins and staff members to help manage your organization.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">5</div>
                  <div>
                    <h3 className="font-semibold">Explore the Portal</h3>
                    <p className="text-sm text-muted-foreground">Share your portal URL with members so they can access their profiles.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Feature Guides */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">Feature Guides</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGuides.map((guide) => (
              <Link key={guide.href} href={guide.href}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <guide.icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>{guide.title}</CardTitle>
                    <CardDescription>{guide.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Video Tutorials */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Video className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">Video Tutorials</h2>
          </div>
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Video className="h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Video tutorials coming soon!</p>
                <p className="text-sm text-muted-foreground">We're currently recording step-by-step video guides for all major features.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Support */}
        <section className="mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Still need help?</CardTitle>
              <CardDescription>Contact our support team and we'll get back to you within 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="How can we help?" />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Describe your issue or question..." rows={4} />
              </div>
              <Button>Send Message</Button>
              <p className="text-sm text-muted-foreground">
                Or email us directly at <a href="mailto:support@orgflow.app" className="text-primary hover:underline">support@orgflow.app</a>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
