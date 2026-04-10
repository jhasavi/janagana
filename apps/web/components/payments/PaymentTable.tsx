'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import type { PaymentRecord } from '@/lib/types/payments';

interface PaymentTableProps {
  payments: PaymentRecord[];
  onRefund?: (paymentId: string) => void;
}

export function PaymentTable({ payments, onRefund }: PaymentTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{payment.memberId ?? 'Unknown'}</TableCell>
              <TableCell>{String(payment.metadata?.type ?? 'payment')}</TableCell>
              <TableCell>${(payment.amountCents / 100).toFixed(2)}</TableCell>
              <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
              <TableCell><PaymentStatusBadge status={payment.status} /></TableCell>
              <TableCell className="text-right">
                {onRefund && payment.status === 'SUCCEEDED' && (
                  <Button variant="outline" size="sm" onClick={() => onRefund(payment.id)}>
                    Refund
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {payments.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">No payments found.</div>
      )}
    </div>
  );
}
