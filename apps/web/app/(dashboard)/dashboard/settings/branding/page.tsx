'use client';

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Upload, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useSettings, useUpdateBranding } from '@/hooks/useSettings';

// ─── Schema ───────────────────────────────────────────────────────────────────

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color (e.g. #2563EB)')
  .optional()
  .or(z.literal(''));

const schema = z.object({
  primaryColor: hexColor,
  accentColor: hexColor,
  logoUrl: z.string().url().optional().or(z.literal('')),
  faviconUrl: z.string().url().optional().or(z.literal('')),
  domain: z.string().max(100).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

// ─── Live preview panel ───────────────────────────────────────────────────────

function LivePreview({ primary, accent }: { primary: string; accent: string }) {
  const safeP = /^#[0-9a-fA-F]{6}$/.test(primary) ? primary : '#2563EB';
  const safeA = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#7C3AED';

  return (
    <div className="rounded-xl border bg-muted/30 overflow-hidden">
      {/* Simulated navbar */}
      <div
        className="px-4 py-2.5 flex items-center justify-between text-white text-sm"
        style={{ backgroundColor: safeP }}
      >
        <span className="font-semibold">YourOrg</span>
        <div className="flex gap-4 text-xs opacity-90">
          <span>Events</span>
          <span>Members</span>
          <span>Clubs</span>
        </div>
      </div>

      <div className="p-4 space-y-4 bg-white dark:bg-zinc-950">
        {/* Simulated card */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Annual Membership</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: safeA }}
            >
              Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Renews December 1, 2026</p>
        </div>

        {/* Sample button */}
        <div className="flex gap-2">
          <button
            className="text-sm px-3 py-1.5 rounded-lg text-white font-medium"
            style={{ backgroundColor: safeP }}
            type="button"
          >
            Register Now
          </button>
          <button
            className="text-sm px-3 py-1.5 rounded-lg font-medium border"
            style={{ color: safeP, borderColor: safeP }}
            type="button"
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Color input ──────────────────────────────────────────────────────────────

function ColorInput({
  id, value, onChange, label,
}: { id: string; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="relative shrink-0">
          <input
            type="color"
            value={value || '#2563EB'}
            onChange={e => onChange(e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
          <div
            className="h-9 w-10 rounded-md border border-input"
            style={{ backgroundColor: value || '#2563EB' }}
          />
        </div>
        <Input
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#2563EB"
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandingPage() {
  const { data: settings, isLoading } = useSettings();
  const { mutateAsync, isPending } = useUpdateBranding();

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (settings) {
      reset({
        primaryColor: settings.settings?.primaryColor ?? settings.primaryColor ?? '#2563EB',
        accentColor: settings.settings?.accentColor ?? '#7C3AED',
        logoUrl: settings.settings?.logoUrl ?? settings.logoUrl ?? '',
        faviconUrl: settings.settings?.faviconUrl ?? '',
        domain: settings.domain ?? '',
      });
    }
  }, [settings, reset]);

  const watchedPrimary = watch('primaryColor') ?? '#2563EB';
  const watchedAccent = watch('accentColor') ?? '#7C3AED';

  const onSubmit = async (data: FormValues) => {
    try {
      await mutateAsync({
        primaryColor: data.primaryColor || undefined,
        accentColor: data.accentColor || undefined,
        logoUrl: data.logoUrl || undefined,
        faviconUrl: data.faviconUrl || undefined,
        domain: data.domain ?? '',
      });
      toast.success('Branding saved');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Branding & Appearance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customise how your organisation portal looks to members.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-8">
        {/* Left: form fields */}
        <div className="space-y-8">
          {/* Colors */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Colors</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorInput
                id="primaryColor"
                label="Primary Color"
                value={watchedPrimary}
                onChange={v => setValue('primaryColor', v, { shouldDirty: true })}
              />
              <ColorInput
                id="accentColor"
                label="Accent Color"
                value={watchedAccent}
                onChange={v => setValue('accentColor', v, { shouldDirty: true })}
              />
            </div>
            {errors.primaryColor && <p className="text-xs text-destructive">{errors.primaryColor.message}</p>}
            {errors.accentColor && <p className="text-xs text-destructive">{errors.accentColor.message}</p>}
          </div>

          <Separator />

          {/* Logo */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Logo & Favicon</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" {...register('logoUrl')} placeholder="https://cdn.yourorg.com/logo.png" />
                <p className="text-xs text-muted-foreground">Recommended: SVG or PNG, min 200×60px</p>
                {errors.logoUrl && <p className="text-xs text-destructive">{errors.logoUrl.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input id="faviconUrl" {...register('faviconUrl')} placeholder="https://cdn.yourorg.com/favicon.ico" />
                {errors.faviconUrl && <p className="text-xs text-destructive">{errors.faviconUrl.message}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Custom domain */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom Domain</h2>
              <Badge variant="secondary">Pro+</Badge>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                {...register('domain')}
                placeholder="portal.yourorg.com"
              />
              <p className="text-xs text-muted-foreground">
                Point a CNAME record to <code className="bg-muted px-1 rounded text-xs">portal.orgflow.io</code> then enter your domain above.
              </p>
            </div>
            {settings?.domain && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <p className="text-sm">Current domain: <strong>{settings.domain}</strong></p>
                <a
                  href={`https://${settings.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-primary hover:underline flex items-center gap-1 text-xs"
                >
                  Visit <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</h2>
          <LivePreview primary={watchedPrimary} accent={watchedAccent} />
          <p className="text-xs text-muted-foreground text-center">Updates as you type</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-6">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
