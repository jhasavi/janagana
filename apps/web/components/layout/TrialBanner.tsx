'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, X, CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TrialBannerProps {
  daysRemaining: number;
  onDismiss?: () => void;
}

export function TrialBanner({ daysRemaining, onDismiss }: TrialBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  // Check if dismissed today
  React.useEffect(() => {
    const dismissedDate = localStorage.getItem('trial-banner-dismissed');
    if (dismissedDate) {
      const today = new Date().toDateString();
      if (dismissedDate === today) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('trial-banner-dismissed', new Date().toDateString());
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;
  if (daysRemaining <= 0) return null;

  const isUrgent = daysRemaining <= 3;

  return (
    <Alert
      variant={isUrgent ? 'destructive' : 'default'}
      className={`relative border-l-4 ${
        isUrgent ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-primary bg-primary/5'
      }`}
    >
      <div className="flex items-center gap-3">
        {isUrgent ? (
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        ) : (
          <CreditCard className="h-5 w-5 text-primary" />
        )}
        <AlertDescription className="flex-1">
          <span className="font-semibold">
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in your trial.
          </span>{' '}
          Upgrade now to continue using all features.
        </AlertDescription>
        <Button
          size="sm"
          variant={isUrgent ? 'destructive' : 'default'}
          asChild
        >
          <a href="/billing">Upgrade Now</a>
        </Button>
        <button
          onClick={handleDismiss}
          className="ml-2 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
}
