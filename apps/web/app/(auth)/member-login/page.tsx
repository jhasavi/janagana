'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '@orgflow/ui';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';

type LoginMode = 'password' | 'magic-link';

interface FieldError {
  email?: string;
  password?: string;
  global?: string;
}

export default function MemberLoginPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { tenant, primaryColor } = useCurrentTenant();

  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [isPending, startTransition] = useTransition();

  function validate(): boolean {
    const next: FieldError = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Enter a valid email address.';
    if (mode === 'password' && !password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    if (!validate()) return;

    startTransition(async () => {
      try {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          router.push('/portal');
          return;
        }

        setErrors({ global: 'Sign-in could not be completed. Please try again.' });
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred. Please try again.';
        setErrors({ global: msg });
      }
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    if (!validate()) return;

    startTransition(async () => {
      try {
        await signIn.create({
          strategy: 'email_link',
          identifier: email.trim(),
          redirectUrl: `${window.location.origin}/portal`,
        });
        setMagicLinkSent(true);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred. Please try again.';
        setErrors({ global: msg });
      }
    });
  }

  const handleSubmit = mode === 'password' ? handlePasswordLogin : handleMagicLink;

  if (magicLinkSent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <strong>{email}</strong>. Click the link to access your account.
        </p>
        <button
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={() => { setMagicLinkSent(false); setEmail(''); }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        {tenant?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.logoUrl} alt={tenant.name} className="h-10 w-auto object-contain" />
        ) : (
          <p className="text-xl font-semibold">{tenant?.name ?? 'Jana Gana'}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight">Member Portal</h1>
        <p className="text-sm text-muted-foreground">Sign in to access your membership dashboard</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-border p-1 text-sm">
        {(['password', 'magic-link'] as LoginMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setErrors({}); }}
            className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'password' ? 'Password' : 'Magic Link'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Global error */}
        {errors.global && (
          <div role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errors.global}
          </div>
        )}

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
            placeholder="you@example.com"
            className={`h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-0 transition-shadow focus:ring-2 focus:ring-ring ${
              errors.email ? 'border-destructive' : 'border-input'
            }`}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        {/* Password (only in password mode) */}
        {mode === 'password' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <a href="/sign-in" className="text-xs text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
              placeholder="••••••••"
              className={`h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-0 transition-shadow focus:ring-2 focus:ring-ring ${
                errors.password ? 'border-destructive' : 'border-input'
              }`}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending || !isLoaded}
          className="w-full"
          style={{ backgroundColor: primaryColor }}
        >
          {isPending
            ? 'Please wait…'
            : mode === 'password'
            ? 'Sign in'
            : 'Send magic link'}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground">
        Not a member yet?{' '}
        <a href="/sign-up" className="text-primary hover:underline">
          Create an account
        </a>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Need member portal access?{' '}
        <a href="/member-login/portal" className="text-primary hover:underline">
          Send a portal magic link
        </a>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Organization admin?{' '}
        <a href="/sign-in" className="text-primary hover:underline">
          Admin sign-in
        </a>
      </p>
    </div>
  );
}
