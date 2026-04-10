'use client';

import * as React from 'react';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Video,
  Clock,
  Users,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

import { useOpportunity, useSubmitApplication } from '@/hooks/useVolunteers';
import type { VolunteerLocation, VolunteerShift } from '@/lib/types/volunteer';
import { submitApplicationSchema } from '@/lib/validations/volunteer';
import type { SubmitApplicationInput } from '@/lib/validations/volunteer';

function parseLocation(raw: string | null): VolunteerLocation | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as VolunteerLocation; } catch { return null; }
}

function ShiftPicker({
  shifts,
  selected,
  onToggle,
}: {
  shifts: VolunteerShift[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (shifts.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">Available Shifts</Label>
      <p className="text-sm text-muted-foreground">Select the shifts you can attend</p>
      <div className="space-y-2 mt-2">
        {shifts.map((shift) => {
          const isFull = shift._count.signups >= shift.capacity;
          return (
            <div
              key={shift.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${!isFull && shift.status === 'OPEN' ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50'}`}
              onClick={() => !isFull && shift.status === 'OPEN' && onToggle(shift.id)}
            >
              <Checkbox
                checked={selected.includes(shift.id)}
                onCheckedChange={() => onToggle(shift.id)}
                disabled={isFull || shift.status !== 'OPEN'}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{shift.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(shift.startsAt), 'MMM d, yyyy • h:mm a')}
                  {' — '}
                  {format(new Date(shift.endsAt), 'h:mm a')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge
                  variant={
                    isFull ? 'secondary' :
                      shift.status === 'OPEN' ? 'outline' : 'secondary'
                  }
                  className="text-xs"
                >
                  {isFull ? 'Full' : `${shift._count.signups}/${shift.capacity}`}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PortalOpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { data: opp, isLoading } = useOpportunity(id);
  const submitMutation = useSubmitApplication();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmitApplicationInput>({
    resolver: zodResolver(submitApplicationSchema) as any,
    defaultValues: {
      opportunityId: id,
      memberId: '', // will be set by user
      shiftIds: [],
    },
  });

  const toggleShift = (shiftId: string) => {
    setSelectedShifts((prev) =>
      prev.includes(shiftId) ? prev.filter((s) => s !== shiftId) : [...prev, shiftId],
    );
  };

  const onSubmit = handleSubmit(async (data: SubmitApplicationInput) => {
    try {
      await submitMutation.mutateAsync({ ...data, shiftIds: selectedShifts });
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit application. You may have already applied.');
    }
  });

  const location = parseLocation(opp?.location ?? null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="mx-auto max-w-4xl flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-muted-foreground">Opportunity not found.</p>
        <Link href="/portal/volunteer" className="text-primary hover:underline text-sm">
          Back to opportunities
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">Application Submitted!</h2>
        <p className="text-muted-foreground">
          Your application for <strong>{opp.title}</strong> has been received. You'll hear back when it's reviewed.
        </p>
        <div className="flex gap-3 mt-2">
          <Link href="/portal/volunteer/my-activity">
            <Button>View My Applications</Button>
          </Link>
          <Link href="/portal/volunteer">
            <Button variant="outline">More Opportunities</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/portal/volunteer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Opportunities
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ─── Main Details ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{opp.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {opp.isActive && <Badge variant="success">Open</Badge>}
              {opp.isVirtual && <Badge variant="outline"><Video className="h-3 w-3 mr-1" />Virtual</Badge>}
            </div>
          </div>

          {/* Meta info */}
          <div className="space-y-2 text-sm text-muted-foreground">
            {opp.startsAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {format(new Date(opp.startsAt), 'MMMM d, yyyy')}
                  {opp.endsAt && ` — ${format(new Date(opp.endsAt), 'MMMM d, yyyy')}`}
                </span>
              </div>
            )}
            {!opp.isVirtual && location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{[location.name, location.address, location.city, location.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {opp.totalHours != null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{opp.totalHours} hours total commitment</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span>{opp._count.applications} people applied</span>
            </div>
          </div>

          {opp.description && (
            <>
              <Separator />
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <h3 className="text-base font-semibold text-foreground mb-2">About this opportunity</h3>
                <p className="whitespace-pre-line">{opp.description}</p>
              </div>
            </>
          )}

          {/* Skills */}
          {opp.skills.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {opp.skills.map((s) => (
                    <Badge key={s.id} variant={s.isRequired ? 'default' : 'secondary'}>
                      {s.name}{s.isRequired ? ' (required)' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ─── Application Form ──────────────────────────────────────────── */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Apply to Volunteer</CardTitle>
            </CardHeader>
            <CardContent>
              {!opp.isActive ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  This opportunity is currently closed.
                </p>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <input type="hidden" {...register('opportunityId')} value={id} />

                  {/* Shift picker */}
                  {(opp.shifts?.length ?? 0) > 0 && (
                    <ShiftPicker
                      shifts={opp.shifts ?? []}
                      selected={selectedShifts}
                      onToggle={toggleShift}
                    />
                  )}

                  <div className="space-y-1.5">
                    <Label>Why do you want to volunteer? <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Textarea
                      rows={3}
                      placeholder="Share your motivation for joining this opportunity..."
                      {...register('motivation')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Relevant experience <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Textarea
                      rows={2}
                      placeholder="Any relevant skills or past volunteer experience..."
                      {...register('experience')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Availability <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input placeholder="e.g. Weekends, mornings only..." {...register('availability')} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
