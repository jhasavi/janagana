'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

import { TicketBuilder } from './TicketBuilder';
import { SpeakerForm } from './SpeakerForm';
import { createEventSchema, type CreateEventInput } from '@/lib/validations/event';
import type { EventCategory, EventDetail } from '@/lib/types/event';

const STEPS = [
  'Basic Info',
  'Date & Location',
  'Tickets',
  'Settings',
  'Speakers',
  'Review',
] as const;

interface EventFormProps {
  categories: EventCategory[];
  onSubmit: (data: CreateEventInput) => Promise<EventDetail>;
  defaultValues?: Partial<CreateEventInput>;
  submitLabel?: string;
}

export function EventForm({ categories, onSubmit, defaultValues, submitLabel = 'Create Event' }: EventFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateEventInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createEventSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      coverImageUrl: '',
      tags: [],
      startDate: '',
      endDate: '',
      timezone: 'UTC',
      format: 'IN_PERSON',
      location: {},
      virtualLink: '',
      capacity: undefined,
      tickets: [],
      isPublic: true,
      isMembersOnly: false,
      requiresApproval: false,
      registrationOpensAt: '',
      registrationClosesAt: '',
      speakers: [],
      ...defaultValues,
    },
  });

  const watchFormat = form.watch('format');

  const handleSubmit = async (data: CreateEventInput) => {
    setIsSubmitting(true);
    try {
      const result = await onSubmit(data);
      toast.success('Event created successfully!');
      router.push(`/dashboard/events/${result.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create event';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <FormProvider {...form}>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Step indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span className="font-medium">{STEPS[step]}</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <div className="flex gap-1 pt-1">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                      ? 'border-2 border-primary text-primary'
                      : 'border border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form steps */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* ── Step 0: Basic Info ───────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Annual Member Summit 2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No category</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={5} placeholder="Tell attendees what to expect..." {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image URL</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── Step 1: Date & Location ──────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date & Time *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date & Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IN_PERSON">In Person</SelectItem>
                          <SelectItem value="VIRTUAL">Virtual</SelectItem>
                          <SelectItem value="HYBRID">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(watchFormat === 'IN_PERSON' || watchFormat === 'HYBRID') && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField control={form.control} name="location.name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Venue Name</FormLabel>
                          <FormControl><Input placeholder="Convention Center" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="location.address"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="location.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="location.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Province</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="location.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl><Input placeholder="US" maxLength={2} {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="location.zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip / Postal Code</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {(watchFormat === 'VIRTUAL' || watchFormat === 'HYBRID') && (
                  <FormField
                    control={form.control}
                    name="virtualLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Virtual Meeting Link</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://zoom.us/..." {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* ── Step 2: Tickets ──────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Leave blank for unlimited"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>Maximum total attendees across all ticket types.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TicketBuilder />
              </div>
            )}

            {/* ── Step 3: Settings ─────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel className="text-sm font-medium">Public Event</FormLabel>
                        <FormDescription>Visible to non-members on the public page.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isMembersOnly"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel className="text-sm font-medium">Members Only</FormLabel>
                        <FormDescription>Only active members can register.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requiresApproval"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel className="text-sm font-medium">Requires Approval</FormLabel>
                        <FormDescription>Registrations must be manually approved.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="registrationOpensAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Opens</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registrationClosesAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Closes</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* ── Step 4: Speakers ─────────────────────────────────── */}
            {step === 4 && <SpeakerForm />}

            {/* ── Step 5: Review ───────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-4 rounded-lg border p-5">
                <h3 className="font-semibold">Review Event Details</h3>
                <ReviewRow label="Title" value={form.getValues('title')} />
                <ReviewRow label="Format" value={form.getValues('format')} />
                <ReviewRow label="Start Date" value={form.getValues('startDate')} />
                <ReviewRow label="Capacity" value={form.getValues('capacity')?.toString() ?? 'Unlimited'} />
                <ReviewRow label="Tickets" value={`${form.getValues('tickets')?.length ?? 0} type(s)`} />
                <ReviewRow label="Speakers" value={`${form.getValues('speakers')?.length ?? 0} speaker(s)`} />
                <ReviewRow label="Public" value={form.getValues('isPublic') ? 'Yes' : 'No'} />
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                >
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitLabel}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </FormProvider>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}
