'use client';

import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MemberGreetingProps {
  firstName: string;
  tier: string;
}

export function MemberGreeting({ firstName, tier }: MemberGreetingProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{firstName}!</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Here's what's happening in your portal today. Stay connected, explore new opportunities, and manage your membership.
          </p>
        </div>
        <Badge variant="secondary" className="inline-flex items-center gap-2 px-4 py-2 text-sm">
          <Sparkles className="h-4 w-4" /> {tier}
        </Badge>
      </div>
    </div>
  );
}
