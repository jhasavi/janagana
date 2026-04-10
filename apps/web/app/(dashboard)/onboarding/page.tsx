'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2, Palette, Layers, Users, Rocket,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useUpdateOrganization, useUpdateBranding, useInviteTeamMember } from '@/hooks/useSettings';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { id: 1 as Step, label: 'Organisation', icon: Building2 },
  { id: 2 as Step, label: 'Branding', icon: Palette },
  { id: 3 as Step, label: 'Membership', icon: Layers },
  { id: 4 as Step, label: 'Invite', icon: Users },
  { id: 5 as Step, label: 'Launch', icon: Rocket },
];

const STORAGE_KEY = 'orgflow_onboarding_step';

// ─── Step 1: Organisation ─────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, 'At least 2 characters'),
  orgType: z.string().min(1, 'Select a type'),
  timezone: z.string().min(1, 'Required'),
});
type Step1Values = z.infer<typeof step1Schema>;

const ORG_TYPES = [
  'Sports Club', 'Community Organisation', 'Professional Association',
  'Charity / Non-Profit', 'University Society', 'Business Network', 'Other',
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Singapore', 'Asia/Kolkata', 'Australia/Sydney',
];

function Step1({
  onNext,
}: { onNext: (data: Step1Values) => void }) {
  const { mutateAsync: saveOrg, isPending } = useUpdateOrganization();
  const {
    register, handleSubmit, control,
    formState: { errors },
  } = useForm<Step1Values>({ resolver: zodResolver(step1Schema) });

  const onSubmit = async (data: Step1Values) => {
    try {
      await saveOrg({ name: data.name, timezone: data.timezone });
      onNext(data);
    } catch (err) {
      toast.error('Could not save organisation name');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organisation Name</Label>
        <Input id="org-name" {...register('name')} placeholder="Acme Rugby Club" autoFocus />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Organisation Type</Label>
        <Controller
          control={control}
          name="orgType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        {errors.orgType && <p className="text-xs text-destructive">{errors.orgType.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Timezone</Label>
        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select timezone…" /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        {errors.timezone && <p className="text-xs text-destructive">{errors.timezone.message}</p>}
      </div>

      <Button type="submit" className="w-full gap-2" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continue <ChevronRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

// ─── Step 2: Branding ─────────────────────────────────────────────────────────

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { mutateAsync: saveBranding, isPending } = useUpdateBranding();
  const [primary, setPrimary] = useState('#2563EB');
  const [accent, setAccent] = useState('#7C3AED');

  const hexValid = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

  const safePrimary = hexValid(primary) ? primary : '#2563EB';
  const safeAccent = hexValid(accent) ? accent : '#7C3AED';

  const handleContinue = async () => {
    try {
      await saveBranding({ primaryColor: safePrimary, accentColor: safeAccent });
      onNext();
    } catch {
      toast.error('Could not save branding');
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {[
          { label: 'Primary Color', value: primary, set: setPrimary },
          { label: 'Accent Color', value: accent, set: setAccent },
        ].map(({ label, value, set }) => (
          <div key={label} className="space-y-1.5">
            <Label>{label}</Label>
            <div className="flex gap-2 items-center">
              <div className="relative shrink-0">
                <input
                  type="color"
                  value={hexValid(value) ? value : '#2563EB'}
                  onChange={e => set(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <div
                  className="h-9 w-10 rounded-md border"
                  style={{ backgroundColor: hexValid(value) ? value : '#2563EB' }}
                />
              </div>
              <Input
                value={value}
                onChange={e => set(e.target.value)}
                placeholder="#2563EB"
                className="font-mono uppercase"
                maxLength={7}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mini preview */}
      <div className="rounded-lg border overflow-hidden text-sm">
        <div className="px-3 py-2 text-white text-xs font-semibold" style={{ backgroundColor: safePrimary }}>
          Your Portal
        </div>
        <div className="p-3 bg-white dark:bg-zinc-950 space-y-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded text-white text-xs font-medium"
            style={{ backgroundColor: safePrimary }}
          >
            Register
          </button>
          <span
            className="ml-2 inline-flex px-2 py-0.5 rounded-full text-white text-xs"
            style={{ backgroundColor: safeAccent }}
          >
            Active
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        You can upload a logo later in Settings → Branding.
      </p>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={handleContinue} disabled={isPending} className="flex-1 gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Membership (skip-able, no API yet for tiers) ────────────────────

const tier3Schema = z.object({
  tierName: z.string().min(1, 'Required'),
  price: z.number().min(0, 'Must be 0 or more'),
});
type Step3Values = z.infer<typeof tier3Schema>;

function Step3({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<Step3Values>({ resolver: zodResolver(tier3Schema) });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Set up your first membership tier. You can add more tiers later.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tier-name">Tier Name</Label>
          <Input id="tier-name" {...register('tierName')} placeholder="Annual Membership" />
          {errors.tierName && <p className="text-xs text-destructive">{errors.tierName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tier-price">Annual Price ($)</Label>
          <Input id="tier-price" type="number" min={0} step={0.01} {...register('price', { valueAsNumber: true })} placeholder="99.00" />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={onNext} className="gap-1.5">
          Skip for now
        </Button>
        <Button onClick={onNext} className="flex-1 gap-1.5">
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Invite ───────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  fullName: z.string().min(2, 'At least 2 characters'),
  role: z.enum(['ADMIN', 'STAFF', 'READONLY']),
});
type InviteValues = z.infer<typeof inviteSchema>;

function Step4({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { mutateAsync: inviteMember, isPending } = useInviteTeamMember();
  const {
    register, handleSubmit, control, formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'ADMIN' },
  });

  const onSubmit = async (data: InviteValues) => {
    try {
      await inviteMember({ email: data.email, fullName: data.fullName, role: data.role });
      toast.success(`Invite sent to ${data.email}`);
      onNext();
    } catch {
      toast.error('Could not send invite');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Invite a colleague to help manage the organisation.
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="inv-email">Email</Label>
          <Input id="inv-email" type="email" {...register('email')} placeholder="jane@yourorg.com" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-fullname">Full Name</Label>
          <Input id="inv-fullname" {...register('fullName')} placeholder="Jane Smith" />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="READONLY">Read Only</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button type="button" variant="outline" onClick={onNext}>
          Skip
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1 gap-1.5">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send Invite <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 5: Launch checklist ─────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { label: 'Organisation name configured', done: true },
  { label: 'Brand colours set', done: true },
  { label: 'Member portal enabled', done: true },
  { label: 'Invite first team member', done: false },
  { label: 'Add first event', done: false },
  { label: 'Customise member fields', done: false },
];

function Step5({
  onBack, onFinish,
}: { onBack: () => void; onFinish: () => void }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        You're all set! Here's a quick checklist to help you hit the ground running.
      </p>

      <ul className="space-y-2.5">
        {CHECKLIST_ITEMS.map(item => (
          <li key={item.label} className="flex items-center gap-3 text-sm">
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${item.done ? 'text-green-500' : 'text-muted-foreground/40'}`}
            />
            <span className={item.done ? '' : 'text-muted-foreground'}>{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onFinish} className="flex-1 gap-2">
          <Rocket className="h-4 w-4" /> Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(() => {
    if (typeof window !== 'undefined') {
      const saved = parseInt(localStorage.getItem(STORAGE_KEY) ?? '1', 10);
      return (saved >= 1 && saved <= 5 ? saved : 1) as Step;
    }
    return 1;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  const goTo = useCallback((s: Step) => setStep(s), []);
  const next = () => setStep(prev => (Math.min(prev + 1, 5) as Step));
  const back = () => setStep(prev => (Math.max(prev - 1, 1) as Step));

  const handleFinish = () => {
    localStorage.removeItem(STORAGE_KEY);
    router.push('/dashboard');
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / header */}
        <div className="text-center space-y-1">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold">
            O
          </div>
          <h1 className="text-xl font-semibold">Welcome to OrgFlow</h1>
          <p className="text-sm text-muted-foreground">Let's get your organisation set up in 5 steps.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <React.Fragment key={s.id}>
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 ${s.id <= step ? 'bg-primary' : 'bg-muted'} transition-colors`} />
                )}
                <button
                  type="button"
                  onClick={() => isDone && goTo(s.id)}
                  className={`
                    relative flex flex-col items-center gap-1 group
                    ${isDone ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <div className={`
                    h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors text-xs font-semibold
                    ${isActive ? 'bg-primary text-primary-foreground border-primary' : ''}
                    ${isDone ? 'bg-primary/10 text-primary border-primary' : ''}
                    ${!isActive && !isDone ? 'bg-background text-muted-foreground border-muted' : ''}
                  `}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`text-[10px] whitespace-nowrap ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step card */}
        <div className="rounded-xl border bg-card shadow-sm px-6 py-6">
          <h2 className="text-base font-semibold mb-4">{STEPS[step - 1]?.label}</h2>

          {step === 1 && <Step1 onNext={next} />}
          {step === 2 && <Step2 onNext={next} onBack={back} />}
          {step === 3 && <Step3 onNext={next} onBack={back} />}
          {step === 4 && <Step4 onNext={next} onBack={back} />}
          {step === 5 && <Step5 onBack={back} onFinish={handleFinish} />}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Step {step} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
