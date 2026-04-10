'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ConnectStatus } from '@/lib/types/payments';

interface StripeConnectBannerProps {
  status: ConnectStatus | undefined;
  onConnect: () => void;
  isLoading: boolean;
}

export function StripeConnectBanner({ status, onConnect, isLoading }: StripeConnectBannerProps) {
  const connected = status?.isConnected;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Stripe Connect</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {connected
              ? 'Your organization can accept member payments, ticket sales, and event fees through Stripe Connect.'
              : 'Connect your Stripe account to accept member payments and pay out event revenue.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {connected ? (
            <Badge variant="secondary">Connected</Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
          <Button onClick={onConnect} disabled={isLoading}>
            {connected ? 'Reconnect Stripe' : 'Connect with Stripe'}
          </Button>
        </div>
      </div>
      {connected && status?.dashboardUrl && (
        <p className="mt-4 text-sm text-muted-foreground">
          Payouts: {status.payoutsEnabled ? 'Enabled' : 'Disabled'} · Charges: {status.chargesEnabled ? 'Enabled' : 'Disabled'}.
          <a href={status.dashboardUrl} target="_blank" rel="noreferrer" className="ml-1 text-primary hover:underline">Open Stripe dashboard</a>
        </p>
      )}
    </div>
  );
}
