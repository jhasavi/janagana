'use client';

import { Button } from '@/components/ui/button';
import { useCreateCheckout } from '@/hooks/useCheckout';
import type { CreateCheckoutPayload } from '@/lib/types/payments';

interface CheckoutButtonProps {
  payload: CreateCheckoutPayload;
  label?: string;
}

export function CheckoutButton({ payload, label = 'Pay now' }: CheckoutButtonProps) {
  const createCheckout = useCreateCheckout();

  return (
    <Button
      onClick={() => createCheckout.mutate(payload)}
      disabled={createCheckout.isPending}
      className="gap-2"
    >
      {label}
    </Button>
  );
}
