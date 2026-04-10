'use client';

import * as React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { createMemberSchema, type CreateMemberInput } from '@/lib/validations/member';
import type { MembershipTier, MemberCustomField } from '@/lib/types/member';

// ─── Steps definition ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Basic Info', description: 'Name, email and contact' },
  { id: 2, title: 'Address', description: 'Location details' },
  { id: 3, title: 'Membership', description: 'Tier and start date' },
  { id: 4, title: 'Custom Fields', description: 'Extra information' },
  { id: 5, title: 'Review', description: 'Confirm and submit' },
];

// ─── Stepper indicator ────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Form steps" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <React.Fragment key={step.id}>
              <li className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                    isDone && 'border-primary bg-primary text-primary-foreground',
                    isActive && 'border-primary bg-primary/10 text-primary',
                    !isDone && !isActive && 'border-muted-foreground/30 text-muted-foreground',
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span className={cn('text-xs font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.title}
                </span>
              </li>
              {i < STEPS.length - 1 && (
                <div className={cn('mb-4 h-px flex-1 mx-1', isDone ? 'bg-primary' : 'bg-border')} />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepBasicInfo({ form }: { form: UseFormReturn<CreateMemberInput> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl><Input placeholder="Jane" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name *</FormLabel>
              <FormControl><Input placeholder="Smith" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address *</FormLabel>
            <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl><Input placeholder="+1 234 567 8900" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function StepAddress({ form }: { form: UseFormReturn<CreateMemberInput> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="address.street"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street Address</FormLabel>
            <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="address.city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl><Input placeholder="Springfield" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address.state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State / Province</FormLabel>
              <FormControl><Input placeholder="IL" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="address.zip"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ZIP / Postal Code</FormLabel>
              <FormControl><Input placeholder="62701" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address.country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl><Input placeholder="US" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function StepMembership({
  form,
  tiers,
}: {
  form: UseFormReturn<CreateMemberInput>;
  tiers: MembershipTier[];
}) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="membershipTierId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Membership Tier</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier (optional)" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {tiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    <span className="font-medium">{tier.name}</span>
                    {tier.isFree ? (
                      <span className="ml-2 text-muted-foreground text-xs">Free</span>
                    ) : (
                      <span className="ml-2 text-muted-foreground text-xs">
                        ${(tier.monthlyPriceCents / 100).toFixed(0)}/mo
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>You can assign or change the tier later.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <Separator />
      <FormField
        control={form.control}
        name="sendWelcomeEmail"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <FormLabel>Send Welcome Email</FormLabel>
              <FormDescription>Send an account activation email to the new member.</FormDescription>
            </div>
            <FormControl>
              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

function StepCustomFields({
  form,
  customFields,
}: {
  form: UseFormReturn<CreateMemberInput>;
  customFields: MemberCustomField[];
}) {
  if (customFields.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        No custom fields configured for this tenant.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {customFields.map((field) => {
        const fieldPath = `customFields.${field.slug}` as const;
        if (field.fieldType === 'BOOLEAN') {
          return (
            <FormField
              key={field.id}
              control={form.control as any}
              name={fieldPath as any}
              render={({ field: f }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Checkbox checked={!!f.value} onCheckedChange={f.onChange} /></FormControl>
                  <FormLabel className="!mt-0">{field.name}</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }
        if (field.fieldType === 'SELECT' && field.options.length > 0) {
          return (
            <FormField
              key={field.id}
              control={form.control as any}
              name={fieldPath as any}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>{field.name}{field.isRequired && ' *'}</FormLabel>
                  <Select onValueChange={f.onChange} defaultValue={f.value as string}>
                    <FormControl><SelectTrigger><SelectValue placeholder={field.placeholder ?? 'Select…'} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {field.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }
        return (
          <FormField
            key={field.id}
            control={form.control as any}
            name={fieldPath as any}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>{field.name}{field.isRequired && ' *'}</FormLabel>
                <FormControl>
                  <Input
                    type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'}
                    placeholder={field.placeholder ?? ''}
                    value={f.value as string ?? ''}
                    onChange={f.onChange}
                  />
                </FormControl>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      })}
    </div>
  );
}

function StepReview({ values }: { values: Partial<CreateMemberInput> }) {
  const fullName = `${values.firstName ?? ''} ${values.lastName ?? ''}`.trim();
  return (
    <div className="space-y-6">
      <h3 className="font-semibold">Review Member Details</h3>
      <div className="rounded-lg border divide-y">
        {[
          { label: 'Name', value: fullName || '—' },
          { label: 'Email', value: values.email || '—' },
          { label: 'Phone', value: values.phone || '—' },
          { label: 'Date of Birth', value: values.dateOfBirth || '—' },
          { label: 'City', value: values.address?.city || '—' },
          { label: 'State', value: values.address?.state || '—' },
          { label: 'Country', value: values.address?.country || 'US' },
          { label: 'Welcome Email', value: values.sendWelcomeEmail ? 'Yes' : 'No' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MemberFormProps {
  defaultValues?: Partial<CreateMemberInput>;
  tiers?: MembershipTier[];
  customFields?: MemberCustomField[];
  onSubmit: (values: CreateMemberInput) => Promise<void>;
  submitLabel?: string;
  isEditing?: boolean;
}

export function MemberForm({
  defaultValues,
  tiers = [],
  customFields = [],
  onSubmit,
  submitLabel = 'Create Member',
  isEditing = false,
}: MemberFormProps) {
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const totalSteps = isEditing ? 3 : STEPS.length; // Edit mode skips custom fields step

  const form = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      sendWelcomeEmail: true,
      ...defaultValues,
    },
    mode: 'onBlur',
  });

  const canGoNext = async () => {
    const fieldsPerStep: Record<number, (keyof CreateMemberInput)[]> = {
      1: ['firstName', 'lastName', 'email'],
      2: [],
      3: [],
      4: [],
    };
    const fields = fieldsPerStep[step] ?? [];
    if (fields.length === 0) return true;
    return form.trigger(fields);
  };

  const next = async () => {
    const ok = await canGoNext();
    if (!ok) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (values: CreateMemberInput) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <StepIndicator currentStep={step} />

        <div className="min-h-[320px]">
          {step === 1 && <StepBasicInfo form={form} />}
          {step === 2 && <StepAddress form={form} />}
          {step === 3 && <StepMembership form={form} tiers={tiers} />}
          {step === 4 && <StepCustomFields form={form} customFields={customFields} />}
          {step === 5 && <StepReview values={form.getValues()} />}
        </div>

        <div className="flex justify-between border-t pt-4">
          <Button type="button" variant="outline" onClick={prev} disabled={step === 1}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length ? (
            <Button type="button" onClick={next}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                submitLabel
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
