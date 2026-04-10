'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateCheckout } from '@/hooks/useCheckout';
import { ArrowRight } from 'lucide-react';
import type { CreateCheckoutPayload } from '@/lib/types/payments';

interface CheckoutModalProps {
  memberId: string;
  tierId?: string;
  eventId?: string;
  ticketOptions?: Array<{ ticketId: string; label: string; priceCents: number }>;
}

export function CheckoutModal({ memberId, tierId, eventId, ticketOptions = [] }: CheckoutModalProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const createCheckout = useCreateCheckout();

  const payload: CreateCheckoutPayload = eventId
    ? { type: 'event', memberId, eventId, tickets: ticketOptions.map((ticket) => ({ ticketId: ticket.ticketId, quantity })) }
    : { type: 'membership', memberId, tierId: tierId ?? '', billingInterval };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Pay now</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete payment</DialogTitle>
          <DialogDescription>Use Stripe Checkout to finish your membership or event payment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {eventId ? (
            <div className="space-y-3">
              <Label>Tickets</Label>
              <div className="grid gap-3">
                {ticketOptions.map((ticket) => (
                  <div key={ticket.ticketId} className="rounded-3xl border border-border bg-background p-4">
                    <p className="font-semibold">{ticket.label}</p>
                    <p className="text-sm text-muted-foreground">${(ticket.priceCents / 100).toFixed(2)} each</p>
                  </div>
                ))}
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Billing interval</Label>
              <div className="grid grid-cols-2 gap-3">
                {['MONTHLY', 'ANNUAL'].map((interval) => (
                  <Button
                    key={interval}
                    variant={billingInterval === interval ? 'secondary' : 'outline'}
                    onClick={() => setBillingInterval(interval as 'MONTHLY' | 'ANNUAL')}
                  >
                    {interval}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => createCheckout.mutate(payload)} disabled={createCheckout.isPending} className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
