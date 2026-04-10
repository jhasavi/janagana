'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  params: { tenantSlug: string };
}

export default function MemberRegisterPage({ params }: Props) {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'signup' | 'finished'>('signup');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isLoaded || !signUp) return;
    if (!email || !fullName || !password) {
      toast.error('Please complete all fields.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await signUp.create({
          emailAddress: email,
          password,
          firstName: fullName.split(' ')[0] ?? fullName,
          lastName: fullName.split(' ').slice(1).join(' ') || 'Member',
          redirectUrl: `${window.location.origin}/portal`,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          router.push('/portal');
          return;
        }

        setMode('finished');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        toast.error(message);
      }
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-8 py-12 px-4">
      <div className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Create your account</p>
        <h1 className="text-3xl font-semibold">Join {params.tenantSlug}</h1>
        <p className="text-sm text-muted-foreground">Register for access to the member portal and your community dashboard.</p>
      </div>

      {mode === 'signup' ? (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !isLoaded}>
            {isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      ) : (
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="text-2xl font-semibold">Check your email</h2>
          <p className="mt-3 text-sm text-muted-foreground">We sent a confirmation link to {email}. Click it to finish setup and return to the portal.</p>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/member-login" className="text-primary hover:underline">Sign in</a>
      </p>
    </div>
  );
}
