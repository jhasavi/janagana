'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Plus, Trash2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createOpportunitySchema } from '@/lib/validations/volunteer';
import type { CreateOpportunityInput } from '@/lib/validations/volunteer';

const STEPS = [
  { id: 1, label: 'Basic Details' },
  { id: 2, label: 'Schedule' },
  { id: 3, label: 'Application Settings' },
  { id: 4, label: 'Review & Publish' },
];

const CATEGORY_OPTIONS = [
  { value: 'FUNDRAISING', label: 'Fundraising' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OUTREACH', label: 'Outreach' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'OTHER', label: 'Other' },
];

const COMMITMENT_OPTIONS = [
  { value: 'ONE_TIME', label: 'One-Time' },
  { value: 'RECURRING', label: 'Recurring' },
  { value: 'ONGOING', label: 'Ongoing' },
];

const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Yes / No' },
];

interface OpportunityFormProps {
  defaultValues?: Partial<CreateOpportunityInput>;
  onSubmit: (data: CreateOpportunityInput, publish: boolean) => Promise<void>;
  isSubmitting?: boolean;
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim())) {
        onChange([...value, input.trim()]);
      }
      setInput('');
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border bg-background px-3 py-2 min-h-[40px] focus-within:ring-2 focus-within:ring-ring">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="hover:text-destructive">×</button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function OpportunityForm({ defaultValues, onSubmit, isSubmitting }: OpportunityFormProps) {
  const [step, setStep] = useState(1);
  const [willPublish, setWillPublish] = useState(false);

  const form = useForm<CreateOpportunityInput>({
    resolver: zodResolver(createOpportunitySchema) as any,
    defaultValues: {
      title: '',
      description: '',
      isMembersOnly: false,
      isVirtual: false,
      requiredSkills: [],
      preferredSkills: [],
      shifts: [],
      applicationQuestions: [],
      ...defaultValues,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = form;

  const shiftsArray = useFieldArray({ control, name: 'shifts' });
  const questionsArray = useFieldArray({ control, name: 'applicationQuestions' });

  const isVirtual = watch('isVirtual');

  const handleNext = async () => {
    let fields: (keyof CreateOpportunityInput)[] = [];
    if (step === 1) fields = ['title', 'description'];
    const valid = await form.trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, 4));
  };

  const handleFormSubmit = handleSubmit((data: CreateOpportunityInput) => onSubmit(data, willPublish));

  // ─── Step 1: Basic Details ─────────────────────────────────────────────────
  const step1 = (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
        <Input id="title" placeholder="e.g. Annual Gala Setup Crew" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
        <Textarea
          id="description"
          rows={5}
          placeholder="Describe the volunteer opportunity, what volunteers will do, and any expectations..."
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Commitment Type</Label>
          <Controller
            control={control}
            name="commitment"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger><SelectValue placeholder="Select commitment" /></SelectTrigger>
                <SelectContent>
                  {COMMITMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Required Skills</Label>
        <Controller
          control={control}
          name="requiredSkills"
          render={({ field }) => (
            <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="Type a skill and press Enter" />
          )}
        />
        <p className="text-xs text-muted-foreground">Press Enter or comma to add a skill</p>
      </div>

      <div className="space-y-1.5">
        <Label>Preferred Skills</Label>
        <Controller
          control={control}
          name="preferredSkills"
          render={({ field }) => (
            <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="Type a skill and press Enter" />
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="isMembersOnly"
          render={({ field }) => (
            <Checkbox id="isMembersOnly" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor="isMembersOnly" className="cursor-pointer">Members only — restrict to active members</Label>
      </div>
    </div>
  );

  // ─── Step 2: Schedule ──────────────────────────────────────────────────────
  const step2 = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input type="date" {...register('startDate')} />
        </div>
        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Input type="date" {...register('endDate')} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="isVirtual"
            render={({ field }) => (
              <Checkbox id="isVirtual" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="isVirtual" className="cursor-pointer">Virtual opportunity (no physical location)</Label>
        </div>

        {!isVirtual && (
          <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Location Name</Label>
              <Input placeholder="e.g. City Hall" {...register('location.name')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="Street address" {...register('location.address')} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input {...register('location.city')} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input {...register('location.state')} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input placeholder="US" maxLength={2} {...register('location.country')} />
            </div>
            <div className="space-y-1.5">
              <Label>Zip Code</Label>
              <Input {...register('location.zipCode')} />
            </div>
          </div>
        )}
      </div>

      {/* Shift Builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Shifts</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              shiftsArray.append({
                shiftName: '',
                date: '',
                startTime: '',
                endTime: '',
                volunteersNeeded: undefined,
                description: '',
              })
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Shift
          </Button>
        </div>

        {shiftsArray.fields.length === 0 && (
          <p className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-6 text-center">
            No shifts yet. Add shifts to let volunteers sign up for specific times.
          </p>
        )}

        {shiftsArray.fields.map((field, index) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Shift {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => shiftsArray.remove(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Shift Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Morning Setup" {...register(`shifts.${index}.shiftName`)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" {...register(`shifts.${index}.date`)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Volunteers Needed</Label>
                <Input type="number" min={1} placeholder="10" {...register(`shifts.${index}.volunteersNeeded`)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input type="time" {...register(`shifts.${index}.startTime`)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input type="time" {...register(`shifts.${index}.endTime`)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Description</Label>
                <Input placeholder="Optional shift notes" {...register(`shifts.${index}.description`)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Step 3: Application Settings ─────────────────────────────────────────
  const step3 = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Application Deadline</Label>
          <Input type="date" {...register('applicationDeadline')} />
        </div>
        <div className="space-y-1.5">
          <Label>Minimum Age</Label>
          <Input type="number" min={0} max={100} placeholder="e.g. 18" {...register('minimumAge')} />
        </div>
        <div className="space-y-1.5">
          <Label>Hours Per Shift</Label>
          <Input type="number" min={0} step={0.5} placeholder="e.g. 4" {...register('hoursPerShift')} />
        </div>
        <div className="space-y-1.5">
          <Label>Total Volunteers Needed</Label>
          <Input type="number" min={1} placeholder="Leave blank for unlimited" {...register('totalVolunteersNeeded')} />
        </div>
      </div>

      {/* Custom Questions Builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Application Questions</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              questionsArray.append({ question: '', type: 'text', required: false, options: [] })
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Question
          </Button>
        </div>

        {questionsArray.fields.length === 0 && (
          <p className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-6 text-center">
            No custom questions. Applicants will only fill basic fields.
          </p>
        )}

        {questionsArray.fields.map((field, index) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Question {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => questionsArray.remove(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Question <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Why do you want to volunteer?" {...register(`applicationQuestions.${index}.question`)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Response Type</Label>
                <Controller
                  control={control}
                  name={`applicationQuestions.${index}.type`}
                  render={({ field: f }) => (
                    <Select onValueChange={f.onChange} value={f.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((qt) => (
                          <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1 flex items-end">
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`applicationQuestions.${index}.required`}
                    render={({ field: f }) => (
                      <Checkbox id={`q-${index}-required`} checked={f.value} onCheckedChange={f.onChange} />
                    )}
                  />
                  <Label htmlFor={`q-${index}-required`} className="text-xs cursor-pointer">Required</Label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Step 4: Review ────────────────────────────────────────────────────────
  const values = form.getValues();
  const step4 = (
    <div className="space-y-6">
      <div className="rounded-lg border p-5 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Title</p>
          <p className="font-semibold mt-0.5">{values.title || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Description</p>
          <p className="text-sm mt-0.5 text-muted-foreground whitespace-pre-line">{values.description?.slice(0, 200) || '—'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
            <p className="text-sm mt-0.5">{values.category ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Commitment</p>
            <p className="text-sm mt-0.5">{values.commitment ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Dates</p>
            <p className="text-sm mt-0.5">
              {values.startDate ? format(new Date(values.startDate), 'MMM d, yyyy') : '—'}
              {values.endDate ? ` → ${format(new Date(values.endDate), 'MMM d, yyyy')}` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Shifts</p>
            <p className="text-sm mt-0.5">{values.shifts?.length ?? 0} shift(s)</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Application Questions</p>
            <p className="text-sm mt-0.5">{values.applicationQuestions?.length ?? 0} question(s)</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Required Skills</p>
            <p className="text-sm mt-0.5">{(values.requiredSkills ?? []).join(', ') || '—'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => { setWillPublish(false); void handleFormSubmit(); }} disabled={isSubmitting}>
          Save as Draft
        </Button>
        <Button type="button" className="flex-1" onClick={() => { setWillPublish(true); void handleFormSubmit(); }} disabled={isSubmitting}>
          {isSubmitting ? 'Publishing...' : 'Publish Opportunity'}
        </Button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <div className={cn('h-px flex-1', s.id <= step ? 'bg-primary' : 'bg-border')} />}
            <button
              type="button"
              onClick={() => s.id < step && setStep(s.id)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0 transition-colors',
                s.id < step ? 'bg-primary text-primary-foreground cursor-pointer' :
                  s.id === step ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' :
                    'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {s.id < step ? <Check className="h-4 w-4" /> : s.id}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div>
        <h3 className="text-base font-semibold">{STEPS[step - 1]?.label}</h3>
        <p className="text-sm text-muted-foreground">Step {step} of {STEPS.length}</p>
      </div>

      {step === 1 && step1}
      {step === 2 && step2}
      {step === 3 && step3}
      {step === 4 && step4}

      {step < 4 && (
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(s - 1, 1))} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <Button type="button" onClick={() => void handleNext()}>
            Next
            <ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      )}
    </form>
  );
}
