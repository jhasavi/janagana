'use client';

import * as React from 'react';
import { ShieldCheck, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

const TIERS = [
  { name: 'Starter', price: '$0', benefits: ['Basic portal access', 'Events calendar', 'Club directory'] },
  { name: 'Growth', price: '$29/mo', benefits: ['Priority support', 'Volunteer tracking', 'Member analytics'] },
  { name: 'Pro', price: '$79/mo', benefits: ['Dedicated account manager', 'Custom domain', 'Advanced reports'] },
];

const PAYMENTS = [
  { id: 'INV-2026-001', date: 'Jan 12, 2026', amount: '$99.00', status: 'Paid' },
  { id: 'INV-2025-12', date: 'Dec 1, 2025', amount: '$99.00', status: 'Paid' },
  { id: 'INV-2025-08', date: 'Aug 31, 2025', amount: '$99.00', status: 'Paid' },
];

export default function PortalMembershipPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">My Membership</h1>
          <p className="mt-2 text-sm text-muted-foreground">Renew, compare plans, and review your membership history.</p>
        </div>
        <Button variant="secondary" className="gap-2">
          <Download className="h-4 w-4" /> Download card
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current membership</CardTitle>
              <CardDescription>Gold member until June 10, 2026</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Tier', value: 'Gold' },
                  { label: 'Renews', value: 'June 10, 2026' },
                  { label: 'Member ID', value: 'MEMB-3F9A' },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-4 text-white">
                <p className="text-sm text-slate-300">Your Gold tier gives you premium access to events, clubs, and volunteer opportunities.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => window.location.assign('/portal/membership')}>Manage plan</Button>
            </CardFooter>
          </Card>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Membership benefits</h2>
                <p className="text-sm text-muted-foreground">What your current tier includes.</p>
              </div>
              <Badge variant="secondary">Gold</Badge>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'Premium event access',
                'Volunteer tracking',
                'Club leadership tools',
                'Renewal reminders',
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-primary"><ShieldCheck className="h-4 w-4" /> <span className="font-medium">{item}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tier comparison</CardTitle>
              <CardDescription>Pick the right plan for your involvement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {TIERS.map((tier) => (
                  <div key={tier.name} className="rounded-3xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{tier.name}</p>
                        <p className="text-sm text-muted-foreground">{tier.price}</p>
                      </div>
                      <Badge variant={tier.name === 'Growth' ? 'secondary' : 'outline'}>{tier.name}</Badge>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {tier.benefits.map((benefit) => (
                        <li key={benefit}>• {benefit}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
              <CardDescription>Download receipts or view past invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {PAYMENTS.map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-3 rounded-3xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{payment.id}</p>
                      <p className="text-sm text-muted-foreground">{payment.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{payment.amount}</p>
                      <p className="text-sm text-muted-foreground">{payment.status}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Download className="h-4 w-4" /> Receipt
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
