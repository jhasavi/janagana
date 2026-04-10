'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiCall } from '@/lib/api';
import { saveMemberSession } from '@/hooks/useMemberAuth';
import type { MembershipTier } from '@/lib/types/member';

interface MemberRegistrationWizardProps {
  tenantSlug: string;
  tenantName: string;
}

interface RegistrationState {
  tierId: string;
  billingInterval: 'MONTHLY' | 'ANNUAL';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  bio: string;
  password: string;
  customFields: Record<string, string>;
  usePassword: boolean;
}

const INITIAL_STATE: RegistrationState = {
  tierId: '',
  billingInterval: 'MONTHLY',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  bio: '',
  password: '',
  customFields: {},
  usePassword: false,
};

export function MemberRegistrationWizard({ tenantSlug, tenantName }: MemberRegistrationWizardProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [formState, setFormState] = React.useState<RegistrationState>(INITIAL_STATE);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const { data: tiers = [], isLoading: tiersLoading } = useQuery<MembershipTier[]>({
    queryKey: ['public-tiers', tenantSlug],
    queryFn: async () => apiCall<MembershipTier[]>(`/public/tenants/${tenantSlug}/membership-tiers`, tenantSlug, null),
    staleTime: 60 * 1000,
  });

  const registrationMutation = useMutation({
    mutationFn: async () => {
      return apiCall<{ token?: string; checkoutUrl?: string; pendingApproval?: boolean }>(
        `/public/tenants/${tenantSlug}/register`,
        tenantSlug,
        null,
        {
          method: 'POST',
          body: {
            firstName: formState.firstName,
            lastName: formState.lastName,
            email: formState.email,
            phone: formState.phone,
            address: formState.address,
            city: formState.city,
            state: formState.state,
            postalCode: formState.postalCode,
            country: formState.country,
            bio: formState.bio,
            tierId: formState.tierId,
            billingInterval: formState.billingInterval,
            password: formState.usePassword ? formState.password : undefined,
            customFields: formState.customFields,
          },
        },
      );
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      if (data.token && data.member) {
        saveMemberSession(data.token, data.member.id);
        router.push('/portal');
        return;
      }
      if (data.pendingApproval) {
        setStatusMessage('Your registration is pending approval. We will notify you when your account is ready.');
        setStep(5);
        return;
      }
      setStatusMessage('Registration complete. Continue to portal once your account is active.');
      setStep(5);
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : 'Registration failed.');
    },
  });

  const selectedTier = tiers.find((tier) => tier.id === formState.tierId);

  const nextStep = () => setStep((current) => Math.min(current + 1, 5));
  const prevStep = () => setStep((current) => Math.max(current - 1, 1));

  const setField = (field: keyof RegistrationState, value: string | boolean) => {
    setFormState((current) => ({ ...current, [field]: value } as RegistrationState));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step < 4) {
      nextStep();
      return;
    }
    registrationMutation.mutate();
  };

  const isStepComplete = () => {
    if (step === 1) return Boolean(formState.tierId);
    if (step === 2) return Boolean(formState.firstName && formState.lastName && formState.email);
    if (step === 3) return formState.usePassword ? Boolean(formState.password) : Boolean(formState.email);
    return true;
  };

  return (
    <div className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Join {tenantName}</p>
        <h1 className="text-4xl font-bold tracking-tight">Become a member today</h1>
        <p className="mt-3 text-muted-foreground">Create your account, choose a tier, and get access to the member portal.</p>
      </div>

      <div className="mb-8 grid grid-cols-5 gap-3 text-xs font-semibold uppercase text-muted-foreground">
        {['Tier', 'Details', 'Account', 'Payment', 'Finish'].map((label, index) => (
          <div key={label} className={`rounded-2xl border px-3 py-3 text-center ${index + 1 === step ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background'}`}>
            {label}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Choose the membership tier that best suits you.</p>
            {tiersLoading ? (
              <div className="rounded-3xl border border-border p-8 text-center">Loading tiers…</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tiers.map((tier) => (
                  <button
                    type="button"
                    key={tier.id}
                    onClick={() => setField('tierId', tier.id)}
                    className={`rounded-3xl border p-5 text-left transition ${formState.tierId === tier.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/70'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold">{tier.name}</p>
                        <p className="text-sm text-muted-foreground">{tier.description ?? 'Trusted membership benefits'}</p>
                      </div>
                      <Badge>{tier.isFree ? 'Free' : tier.monthlyPriceCents > 0 ? `$${(tier.monthlyPriceCents / 100).toFixed(0)}/mo` : `$${(tier.annualPriceCents / 100).toFixed(0)}/yr`}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={formState.firstName} onChange={(e) => setField('firstName', e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={formState.lastName} onChange={(e) => setField('lastName', e.target.value)} />
            </div>
            <div className="space-y-3 col-span-full">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={formState.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formState.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={formState.city} onChange={(e) => setField('city', e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="state">State/region</Label>
              <Input id="state" value={formState.state} onChange={(e) => setField('state', e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" value={formState.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={formState.address} onChange={(e) => setField('address', e.target.value)} />
            </div>
            <div className="col-span-full space-y-3">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={4} value={formState.bio} onChange={(e) => setField('bio', e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 rounded-3xl border border-border bg-background p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">Create your account</p>
                <p className="text-sm text-muted-foreground">Choose a secure login method for the member portal.</p>
              </div>
              <div className="flex gap-2">
                <Button variant={formState.usePassword ? 'secondary' : 'ghost'} type="button" onClick={() => setField('usePassword', false)}>
                  Magic link
                </Button>
                <Button variant={formState.usePassword ? 'ghost' : 'secondary'} type="button" onClick={() => setField('usePassword', true)}>
                  Password
                </Button>
              </div>
            </div>
            <div className="grid gap-6">
              <div className="space-y-3">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={formState.email} onChange={(e) => setField('email', e.target.value)} />
              </div>
              {formState.usePassword && (
                <div className="space-y-3">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={formState.password} onChange={(e) => setField('password', e.target.value)} />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">If you choose magic link, you can sign in with your email after registration.</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-background p-6">
              <h2 className="text-lg font-semibold">Review registration</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p><strong>Tier:</strong> {selectedTier?.name ?? 'Not selected'}</p>
                <p><strong>Name:</strong> {formState.firstName} {formState.lastName}</p>
                <p><strong>Email:</strong> {formState.email}</p>
                <p><strong>Billing:</strong> {selectedTier?.isFree ? 'Free' : formState.billingInterval}</p>
                {selectedTier && !selectedTier.isFree ? (
                  <div className="mt-3">
                    <p className="text-sm font-medium">Choose billing interval</p>
                    <div className="mt-2 flex gap-2">
                      {(['MONTHLY', 'ANNUAL'] as const).map((interval) => (
                        <button
                          key={interval}
                          type="button"
                          onClick={() => setField('billingInterval', interval)}
                          className={`rounded-2xl border px-4 py-2 text-sm transition ${
                            formState.billingInterval === interval
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/70'
                          }`}
                        >
                          {interval === 'MONTHLY' ? 'Monthly' : 'Annual'}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {selectedTier?.isFree ? (
              <div className="rounded-3xl border border-border bg-background p-6 text-sm text-muted-foreground">
                This tier is free. Your member account will be activated immediately after registration.
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-background p-6 text-sm text-muted-foreground">
                This tier requires payment. After submitting, you will be redirected to secure Stripe checkout.
              </div>
            )}
          </div>
        )}

        {statusMessage ? (
          <div className="rounded-3xl border border-border bg-destructive/10 p-4 text-sm text-destructive">{statusMessage}</div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" type="button" onClick={prevStep}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={!isStepComplete() || registrationMutation.isLoading}>
              {step < 4 ? 'Continue' : selectedTier?.isFree ? 'Create account' : 'Proceed to payment'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
