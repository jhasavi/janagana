'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Pencil, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useInvoices, useCreateInvoice, useSendInvoice, useMarkInvoicePaid } from '@/hooks/usePayments';
import { InvoiceModal } from '@/components/payments/InvoiceModal';

export default function InvoiceListPage() {
  const invoicesQuery = useInvoices();
  const createInvoice = useCreateInvoice();
  const sendInvoice = useSendInvoice();
  const markInvoicePaid = useMarkInvoicePaid();

  const invoices = invoicesQuery.data ?? [];
  const statusClass = {
    DRAFT: 'bg-slate-100 text-slate-700',
    OPEN: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  } as Record<string, string>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Invoices</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create, send, and reconcile member invoices.</p>
        </div>
        <InvoiceModal onCreate={(payload) => createInvoice.mutate(payload)} />
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Invoice</th>
              <th className="px-4 py-3 text-left font-medium">Member</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Due</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const dueDate = invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'TBD';
              return (
                <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{invoice.memberId}</td>
                  <td className="px-4 py-3">${(invoice.totalCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[invoice.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{dueDate}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => sendInvoice.mutate(invoice.id)}>
                      <Send className="h-3.5 w-3.5" /> Send
                    </Button>
                    {invoice.status !== 'PAID' && (
                      <Button variant="secondary" size="sm" className="gap-2" onClick={() => markInvoicePaid.mutate(invoice.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
