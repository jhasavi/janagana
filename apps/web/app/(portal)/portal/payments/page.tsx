'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const invoices = [
  { id: 'INV-2026-005', date: 'Mar 12, 2026', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2026-004', date: 'Feb 15, 2026', amount: '$29.00', status: 'Paid' },
  { id: 'INV-2026-003', date: 'Jan 10, 2026', amount: '$29.00', status: 'Paid' },
];

const outstanding = [
  { id: 'INV-2026-006', due: 'Apr 10, 2026', amount: '$29.00', status: 'Due' },
];

export default function PortalPaymentsPage() {
  const [outstandingInvoices, setOutstandingInvoices] = useState(outstanding);

  const handlePayNow = (id: string) => {
    toast.success('Payment request created. You will be redirected to checkout.');
    setOutstandingInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Payments</h1>
          <p className="mt-2 text-sm text-muted-foreground">View payment history and settle outstanding invoices.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="inline-flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Secure payments
          </Badge>
        </div>
      </div>

      {outstandingInvoices.length > 0 && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Outstanding invoice</p>
              <p className="text-sm text-destructive/80">You have {outstandingInvoices.length} invoice(s) due soon.</p>
            </div>
            <Button variant="destructive" onClick={() => handlePayNow(outstandingInvoices[0].id)}>
              Pay now
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Payment history</h2>
            <p className="text-sm text-muted-foreground">Download receipts for your recent payments.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex flex-col gap-4 rounded-3xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{invoice.id}</p>
                <p className="text-sm text-muted-foreground">{invoice.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{invoice.amount}</p>
                <Badge variant="outline">{invoice.status}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => toast.success('Receipt downloaded')}>
                <Download className="h-4 w-4" /> Receipt
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm">Need help with a charge? Contact your organisation’s membership support team.</p>
        </div>
      </div>
    </div>
  );
}
