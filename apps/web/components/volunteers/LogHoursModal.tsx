'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { logHoursSchema } from '@/lib/validations/volunteer';
import type { LogHoursInput } from '@/lib/validations/volunteer';

interface LogHoursModalProps {
  opportunityId?: string;
  memberId?: string;
  onClose: () => void;
  onSubmit: (data: LogHoursInput) => Promise<void>;
}

export function LogHoursModal({
  opportunityId,
  memberId,
  onClose,
  onSubmit,
}: LogHoursModalProps) {
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LogHoursInput>({
    resolver: zodResolver(logHoursSchema) as any,
    defaultValues: {
      opportunityId: opportunityId ?? '',
      memberId: memberId ?? '',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const handleFormSubmit = handleSubmit(async (data: LogHoursInput) => {
    setPending(true);
    try {
      await onSubmit(data);
      onClose();
    } finally {
      setPending(false);
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Volunteer Hours</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
          {!memberId && (
            <div className="space-y-1.5">
              <Label>Member ID <span className="text-destructive">*</span></Label>
              <Input placeholder="Paste member UUID" {...register('memberId')} />
              {errors.memberId && (
                <p className="text-xs text-destructive">{errors.memberId.message}</p>
              )}
            </div>
          )}

          {!opportunityId && (
            <div className="space-y-1.5">
              <Label>Opportunity ID <span className="text-destructive">*</span></Label>
              <Input placeholder="Paste opportunity UUID" {...register('opportunityId')} />
              {errors.opportunityId && (
                <p className="text-xs text-destructive">{errors.opportunityId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Hours Worked <span className="text-destructive">*</span></Label>
              <Input type="number" step={0.5} min={0.5} max={24} placeholder="4" {...register('hoursWorked')} />
              {errors.hoursWorked && (
                <p className="text-xs text-destructive">{errors.hoursWorked.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              placeholder="What did the volunteer do?"
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Logging...' : 'Log Hours'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
