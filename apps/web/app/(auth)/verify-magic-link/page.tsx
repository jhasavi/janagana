'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiCall } from '@/lib/api';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { saveMemberSession } from '@/hooks/useMemberAuth';

export default function VerifyMagicLinkPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { tenant } = useCurrentTenant();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token || !tenant?.slug) {
      setStatus('error');
      setMessage('Missing verification token or tenant context.');
      return;
    }

    const verify = async () => {
      setStatus('loading');
      try {
        const result = await apiCall<{ token: string; memberId: string }>(
          '/auth/members/magic-link/verify',
          tenant.slug,
          null,
          {
            method: 'POST',
            body: { token },
          },
        );

        saveMemberSession(result.token, result.memberId);
        setStatus('success');
        setMessage('Magic link verified. Redirecting to your portal…');
        window.setTimeout(() => {
          router.push('/portal');
        }, 1200);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed.');
      }
    };

    verify();
  }, [token, tenant?.slug, router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div className="rounded-[2rem] border border-border bg-card p-10 text-center shadow-sm">
        <h1 className="text-3xl font-semibold">Verify your sign-in link</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {status === 'loading'
            ? 'Checking your magic link…'
            : status === 'success'
            ? message
            : status === 'error'
            ? message
            : 'Preparing verification…'}
        </p>

        {status === 'error' ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-destructive">{message}</p>
            <Button onClick={() => router.push('/member-login')}>Return to member login</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
