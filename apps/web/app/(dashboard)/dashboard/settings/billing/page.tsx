'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import {
  Zap, Users, CalendarRange, ShieldCheck,
  CheckCircle2, ArrowUpRight, Download, AlertTriangle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useUsageStats, useBillingHistory } from '@/hooks/useSettings';
import { useBillingPortalUrl, useConnectOnboard, useConnectStatus } from '@/hooks/usePayments';
import { StripeConnectBanner } from '@/components/payments/StripeConnectBanner';
// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  VOID: 'bg-zinc-100 text-zinc-500',
  UNCOLLECTIBLE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// ─── Plan features ────────────────────────────────────────────────────────────

const PLAN_FEATURES: Record<string, string[]> = {
  STARTER: ['Up to 100 members', '2 admin users', 'Unlimited events', 'Basic analytics'],
  GROWTH: ['Up to 500 members', '10 admin users', 'Custom domain', 'Priority support'],
  PRO: ['Up to 2,000 members', '25 admin users', 'API access', 'Advanced analytics'],
  ENTERPRISE: ['Unlimited members', 'Unlimited users', 'Dedicated support', 'Custom contracts'],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const searchParams = useSearchParams();
  const trialEnded = searchParams.get('trial_ended') === 'true';
  
  const { data: usage, isLoading: loadingUsage } = useUsageStats();
  const { data: invoices, isLoading: loadingInvoices } = useBillingHistory();
  const connectStatus = useConnectStatus();
  const connectOnboard = useConnectOnboard();
  const billingPortalUrl = useBillingPortalUrl();

  if (loadingUsage || loadingInvoices) {
    return (
      <div className="space-y-4 max-w-3xl">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  const plan = usage?.plan;
  const subscription = usage?.subscription;
  const features = plan ? (PLAN_FEATURES[plan.slug] ?? []) : [];
  const isTrialExpired = subscription?.status === 'PAST_DUE' || subscription?.status === 'TRIALING' && subscription.trialEnd && new Date(subscription.trialEnd) < new Date();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Billing & Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and view usage.</p>
      </div>

      {/* Trial Ended Alert */}
      {(trialEnded || isTrialExpired) && (
        <Alert variant="destructive" className="border-l-4 border-red-500">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Your trial has ended</p>
              <p className="text-sm">To continue using OrgFlow, please subscribe to a plan. Your data will be preserved for 30 days.</p>
              <Button size="sm" className="mt-2" asChild>
                <a href="#plans">Choose a Plan</a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Plan card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Plan</p>
              <p className="font-semibold text-lg leading-none mt-0.5">
                {plan?.name ?? 'Free'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {subscription && (
              <div className="text-right text-sm">
                <p className="text-muted-foreground">
                  {subscription.billingInterval === 'ANNUAL' ? 'Annual' : 'Monthly'} · renews
                </p>
                <p className="font-medium">
                  {subscription.currentPeriodEnd
                    ? format(new Date(subscription.currentPeriodEnd), 'dd MMM yyyy')
                    : '—'}
                </p>
              </div>
            )}
            <Button size="sm" className="gap-1.5" variant="outline">
              Upgrade Plan <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Plan Features</p>
          <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-4">
            {features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <StripeConnectBanner
          status={connectStatus.data}
          isLoading={connectStatus.isPending || connectOnboard.isPending}
          onConnect={() => connectOnboard.mutate()}
        />
        {billingPortalUrl.data?.url && (
          <div className="rounded-3xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">
              Access SaaS billing self-service in Stripe. Use this tool to update card details, download invoices, and manage subscriptions.
            </p>
            <a href={billingPortalUrl.data.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline">
              Open Stripe billing portal <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>

      {/* Invoice history */}
      <div className="space-y-4">
        <h2 className="font-medium">Invoice History</h2>
        <div className="rounded-xl border overflow-x-auto">
          {!invoices || invoices.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No invoices yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium">Invoice #</th>
                  <th className="px-4 py-2.5 text-left font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(inv.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium">{formatCents(inv.subtotalCents)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status] ?? ''}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
