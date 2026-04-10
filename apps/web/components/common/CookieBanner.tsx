'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { X, Cookie } from 'lucide-react';

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-semibold">We use cookies</span> to improve your experience and analyze site usage.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                By accepting, you agree to our use of cookies. Read our{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>{' '}
                for more information.
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:self-start">
            <Button size="sm" variant="outline" onClick={handleDecline}>
              Decline
            </Button>
            <Button size="sm" onClick={handleAccept}>
              Accept
            </Button>
            <button
              onClick={() => setVisible(false)}
              className="ml-2 self-start rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
