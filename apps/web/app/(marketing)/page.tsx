import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Users, Calendar, Heart, Users2, Mail, BarChart3, Star, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';

export default function MarketingHomePage() {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const pricing = {
    monthly: [
      {
        name: 'Starter',
        price: 29,
        features: ['Up to 100 members', '5 events/month', 'Basic analytics', 'Email support'],
        popular: false,
      },
      {
        name: 'Growth',
        price: 79,
        features: ['Up to 500 members', 'Unlimited events', 'Advanced analytics', 'Priority support', 'Custom branding'],
        popular: true,
      },
      {
        name: 'Pro',
        price: 199,
        features: ['Unlimited members', 'Unlimited events', 'Advanced analytics', '24/7 support', 'Custom branding', 'API access', 'SSO'],
        popular: false,
      },
    ],
    annual: [
      {
        name: 'Starter',
        price: 24,
        features: ['Up to 100 members', '5 events/month', 'Basic analytics', 'Email support'],
        popular: false,
      },
      {
        name: 'Growth',
        price: 66,
        features: ['Up to 500 members', 'Unlimited events', 'Advanced analytics', 'Priority support', 'Custom branding'],
        popular: true,
      },
      {
        name: 'Pro',
        price: 166,
        features: ['Unlimited members', 'Unlimited events', 'Advanced analytics', '24/7 support', 'Custom branding', 'API access', 'SSO'],
        popular: false,
      },
    ],
  };

  const faqs = [
    {
      question: 'What is included in the 14-day free trial?',
      answer: 'The free trial includes full access to all Growth plan features, including member management, events, volunteer tracking, clubs, communications, and analytics. No credit card required.',
    },
    {
      question: 'Can I import my existing member data?',
      answer: 'Yes! We provide a CSV import template that makes it easy to migrate your existing member database. Our team can also assist with data migration for larger organizations.',
    },
    {
      question: 'What happens when my trial ends?',
      answer: 'After your trial ends, you can choose to subscribe to a plan that fits your needs. Your data will be preserved for 30 days. If you don\'t subscribe, your account will be deactivated.',
    },
    {
      question: 'Do you offer discounts for non-profits?',
      answer: 'Yes! We offer a 20% discount for registered non-profit organizations. Contact our sales team with your documentation to receive your discount code.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use industry-standard encryption, regular security audits, and comply with GDPR and CCPA regulations. Your data is backed up daily and stored in secure, SOC 2 compliant data centers.',
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your current billing period. We also offer prorated refunds for annual plans.',
    },
    {
      question: 'Do I need a credit card to start the trial?',
      answer: 'No credit card is required to start your 14-day free trial. You can explore all features without any commitment.',
    },
    {
      question: 'What integrations do you support?',
      answer: 'We currently integrate with Stripe for payments, Resend for email, Clerk for authentication, and Cloudinary for file storage. Zapier, SMS, and mobile app integrations are coming soon.',
    },
    {
      question: 'Can I customize my organization\'s branding?',
      answer: 'Yes! Growth and Pro plans include custom branding options including your logo, colors, and a custom subdomain (e.g., your-org.orgflow.app).',
    },
    {
      question: 'How do I get support?',
      answer: 'Starter plans include email support with 24-hour response time. Growth plans include priority email support with 12-hour response time. Pro plans include 24/7 phone and email support.',
    },
  ];

  const features = [
    {
      icon: Users,
      title: 'Member Management',
      description: 'Track and engage your members with customizable profiles, membership tiers, and automated renewals.',
    },
    {
      icon: Calendar,
      title: 'Events',
      description: 'Create events, sell tickets, manage registrations, and check in attendees with ease.',
    },
    {
      icon: Heart,
      title: 'Volunteers',
      description: 'Recruit volunteers, manage opportunities, track hours, and recognize contributions.',
    },
    {
      icon: Users2,
      title: 'Clubs & Groups',
      description: 'Empower members to create and manage their own communities and interest groups.',
    },
    {
      icon: Mail,
      title: 'Communications',
      description: 'Send targeted email campaigns, announcements, and automated notifications.',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Make data-driven decisions with comprehensive reports on engagement and growth.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              <div className="space-y-3">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                  Built for Non-profits and Growing Organizations
                </Badge>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                  The All-in-One Platform for Managing Your Organization
                </h1>
                <p className="max-w-2xl text-lg text-muted-foreground">
                  Memberships, Events, Volunteers, and Clubs — Everything in One Place
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/register">Start Free 14-Day Trial</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/features">See Features</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">No credit card required</p>

              <div className="grid gap-4 sm:grid-cols-3">
                {features.slice(0, 3).map((feature) => (
                  <div key={feature.title} className="flex items-center gap-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{feature.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-gradient-to-br from-primary/10 via-background to-background p-8 shadow-lg">
              <div className="aspect-video rounded-2xl bg-muted flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Dashboard Mockup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold">Everything you need to run your organization</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to save you time and help you grow
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-4" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 bg-muted/50">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
          <p className="text-muted-foreground">Choose the plan that fits your organization</p>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'annual' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('annual')}
            >
              Annual <span className="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded">Save 17%</span>
            </Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pricing[billingCycle].map((plan) => (
            <Card key={plan.name} className={plan.popular ? 'border-primary' : ''}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg rounded-tr-lg">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'} asChild>
                  <Link href="/register">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          14-day free trial, no credit card required
        </p>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold">Frequently asked questions</h2>
          <p className="text-muted-foreground">Everything you need to know about OrgFlow</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleFaq(index)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  {openFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {openFaq === index && (
                <CardContent>
                  <CardDescription className="text-base">{faq.answer}</CardDescription>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-16 text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to get started?</h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              Join hundreds of organizations already using OrgFlow to manage their members, events, and communities.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">Start Your Free Trial</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <h3 className="font-semibold">OrgFlow</h3>
              <p className="text-sm text-muted-foreground">
                The all-in-one platform for managing your organization.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/status" className="hover:text-foreground">Status</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/help" className="hover:text-foreground">Help</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} OrgFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
