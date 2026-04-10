'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiCall } from '@/lib/api';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';

export default function PortalMemberLoginPage() {
  const router = useRouter();
  const { tenant } = useCurrentTenant();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tenant?.slug || !email) return;

    setStatus('loading');
    setMessage('');

    try {
      await apiCall('/auth/members/magic-link', tenant.slug, null, {
        method: 'POST',
        body: { email, tenantSlug: tenant.slug },
      });

      setStatus('success');
      setMessage('Magic link sent. Check your email and follow the sign-in link.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send the magic link.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div className="rounded-[2rem] border border-border bg-card p-10 shadow-sm">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold">Member portal login</h1>
          <p className="text-sm text-muted-foreground">
            Enter your member email to receive a secure magic link for the portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="member-email">Email address</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@organization.com"
            />
          </div>

          {message ? (
            <div className={`rounded-2xl border p-4 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}>
              {message}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={status === 'loading' || !email}>
            {status === 'loading' ? 'Sending…' : 'Send magic link'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            A sign-in link will be emailed to you. If you already have an account, use the member portal link.
          </p>
        </form>
      </div>
    </div>
  );
}
