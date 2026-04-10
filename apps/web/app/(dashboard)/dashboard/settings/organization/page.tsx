'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Globe, AtSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { useSettings, useUpdateOrganization, useCheckSlug } from '@/hooks/useSettings';

// ─── Timezones (subset) ────────────────────────────────────────────────────────
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Toronto', 'America/Vancouver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam',
  'Asia/Tokyo', 'Asia/Singapore', 'Asia/Kolkata', 'Asia/Dubai',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
];

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'IN', label: 'India' },
  { code: 'SG', label: 'Singapore' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(120),
  slug: z
    .string()
    .min(3, 'At least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  timezone: z.string().min(1, 'Required'),
  countryCode: z.string().length(2),
  supportEmail: z.string().email().optional().or(z.literal('')),
  supportPhone: z.string().max(30).optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrganizationSettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { mutateAsync, isPending } = useUpdateOrganization();
  const [slugValue, setSlugValue] = useState('');
  const [slugDirty, setSlugDirty] = useState(false);
  const { data: slugCheck, isFetching: checkingSlug } = useCheckSlug(slugValue, slugDirty);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (settings) {
      const s = settings.settings;
      reset({
        name: settings.name,
        slug: settings.slug,
        timezone: settings.timezone,
        countryCode: settings.countryCode,
        supportEmail: s?.supportEmail ?? '',
        supportPhone: s?.supportPhone ?? '',
        websiteUrl: s?.websiteUrl ?? '',
        facebookUrl: s?.facebookUrl ?? '',
        twitterUrl: s?.twitterUrl ?? '',
        linkedinUrl: s?.linkedinUrl ?? '',
        instagramUrl: s?.instagramUrl ?? '',
      });
      setSlugValue(settings.slug);
    }
  }, [settings, reset]);

  const currentSlug = watch('slug');
  useEffect(() => {
    if (currentSlug && settings && currentSlug !== settings.slug) {
      setSlugValue(currentSlug);
      setSlugDirty(true);
    } else {
      setSlugDirty(false);
    }
  }, [currentSlug, settings]);

  const onSubmit = async (data: FormValues) => {
    try {
      await mutateAsync(data);
      toast.success('Organization profile saved');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Organization Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Basic information about your organisation.
        </p>
      </div>

      {/* Name + Slug */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Organisation Name</Label>
            <Input id="name" {...register('name')} placeholder="Acme Rugby Club" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="relative">
              <AtSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="slug"
                className="pl-8 pr-8"
                {...register('slug')}
                placeholder="acme-rugby"
              />
              <div className="absolute right-2.5 top-2.5">
                {slugDirty && checkingSlug && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {slugDirty && !checkingSlug && slugCheck?.available === true && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {slugDirty && !checkingSlug && slugCheck?.available === false && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            {slugDirty && slugCheck?.available === false && (
              <p className="text-xs text-destructive">This slug is already taken</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Locale */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Locale</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select
              value={watch('timezone')}
              onValueChange={v => setValue('timezone', v, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select
              value={watch('countryCode')}
              onValueChange={v => setValue('countryCode', v, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input id="supportEmail" type="email" {...register('supportEmail')} placeholder="hello@yourorg.com" />
            {errors.supportEmail && <p className="text-xs text-destructive">{errors.supportEmail.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supportPhone">Phone</Label>
            <Input id="supportPhone" type="tel" {...register('supportPhone')} placeholder="+1 555 000 0000" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="websiteUrl">Website</Label>
            <div className="relative">
              <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="websiteUrl" className="pl-8" {...register('websiteUrl')} placeholder="https://yourorg.com" />
            </div>
            {errors.websiteUrl && <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>}
          </div>
        </div>
      </div>

      <Separator />

      {/* Social */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Social Media</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['facebookUrl', 'twitterUrl', 'linkedinUrl', 'instagramUrl'] as const).map(field => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={field}>
                {field.replace('Url', '').replace(/^./, s => s.toUpperCase())}
              </Label>
              <Input
                id={field}
                {...register(field)}
                placeholder="https://..."
              />
              {errors[field] && <p className="text-xs text-destructive">{errors[field]?.message}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save Changes'}
        </Button>
        {!isDirty && settings && (
          <p className="text-xs text-muted-foreground">No unsaved changes</p>
        )}
      </div>
    </form>
  );
}
