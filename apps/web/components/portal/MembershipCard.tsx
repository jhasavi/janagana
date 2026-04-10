'use client';

import * as React from 'react';
import { Sparkles, CreditCard, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MembershipCardProps {
  name: string;
  tier: string;
  memberNumber: string;
  expiresAt: string;
  progress: number;
  onRenew?: () => void;
  isExpiringSoon?: boolean;
}

export function MembershipCard({
  name,
  tier,
  memberNumber,
  expiresAt,
  progress,
  onRenew,
  isExpiringSoon,
}: MembershipCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-xl shadow-slate-900/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Membership</p>
          <h2 className="mt-2 text-2xl font-semibold">{tier}</h2>
          <p className="mt-2 text-sm text-slate-300">{name}</p>
        </div>
        <div className="rounded-3xl bg-white/5 p-3 text-slate-200 ring-1 ring-white/10">
          <QrCode className="h-10 w-10" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Member ID</p>
          <p className="mt-2 font-semibold">{memberNumber}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Expires</p>
          <p className="mt-2 font-semibold">{expiresAt}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Membership health</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className={cn('h-full rounded-full transition-all', progress > 80 ? 'bg-amber-400' : 'bg-primary')} style={{ width: `${progress}%` }} />
        </div>
        {isExpiringSoon && (
          <Badge variant="secondary" className="inline-flex gap-2">
            <Sparkles className="h-4 w-4" /> Expiring soon
          </Badge>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onRenew} variant="secondary" className="gap-2">
          <CreditCard className="h-4 w-4" /> Renew membership
        </Button>
      </div>
    </div>
  );
}
