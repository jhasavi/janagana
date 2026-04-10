'use client';

import { useState } from 'react';
import { ArrowUpRight, FileText, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePaymentStats, usePayments, useRefundPayment } from '@/hooks/usePayments';
import { PaymentTable } from '@/components/payments/PaymentTable';
import { RevenueChart } from '@/components/payments/RevenueChart';

export default function DashboardPaymentsPage() {
  const statsQuery = usePaymentStats();
  const paymentsQuery = usePayments();
  const refundMutation = useRefundPayment();
  const [refreshKey, setRefreshKey] = useState(0);

  const stats = statsQuery.data;
  const payments = paymentsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Payments</h1>
          <p className="mt-2 text-sm text-muted-foreground">Revenue and transaction history for your organization.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setRefreshKey((value) => value + 1)}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            Export CSV <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: CreditCard, label: 'MRR', value: stats ? `$${(stats.mrrCents / 100).toFixed(2)}` : '—' },
              { icon: Wallet, label: 'Total revenue', value: stats ? `$${(stats.totalRevenueCents / 100).toFixed(2)}` : '—' },
              { icon: FileText, label: 'Outstanding', value: stats ? `$${(stats.outstandingCents / 100).toFixed(2)}` : '—' },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <p className="mt-4 text-3xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Revenue over time</p>
                <p className="text-sm text-muted-foreground">Last 12 months</p>
              </div>
              <Badge variant="secondary">Tracked</Badge>
            </div>
            <div className="mt-6">
              {stats ? <RevenueChart data={stats.chart} /> : <div className="h-72" />}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Payment summary</p>
              <p className="text-sm text-muted-foreground">Quick view of charges and refunds.</p>
            </div>
            <Badge variant="outline">Live</Badge>
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">This month</p>
              <p className="mt-2 text-2xl font-semibold">{stats ? `$${(stats.monthRevenueCents / 100).toFixed(2)}` : '—'}</p>
            </div>
            <div className="rounded-3xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Recent activity</p>
              <p className="mt-2 text-sm text-muted-foreground">Payments and refunds are updated automatically.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Transactions</h2>
            <p className="text-sm text-muted-foreground">All payment activity for members and events.</p>
          </div>
          {refundMutation.isPending && <span className="text-sm text-muted-foreground">Processing refund…</span>}
        </div>
        <PaymentTable
          payments={payments}
          onRefund={(paymentId) => refundMutation.mutate({ paymentId })}
        />
      </div>
    </div>
  );
}
