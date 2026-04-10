'use client';

import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import type { VolunteerApplication } from '@/lib/types/volunteer';

interface ApplicationReviewModalProps {
  application: VolunteerApplication;
  onClose: () => void;
  onReview: (status: 'APPROVED' | 'REJECTED', notes?: string) => Promise<void>;
}

export function ApplicationReviewModal({
  application,
  onClose,
  onReview,
}: ApplicationReviewModalProps) {
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    setPending(status);
    try {
      await onReview(status, notes.trim() || undefined);
    } finally {
      setPending(null);
    }
  };

  const { member, opportunity } = application;

  // Parse coverLetter as plain text
  let coverLetterText = application.coverLetter ?? '';
  try {
    const parsed = JSON.parse(coverLetterText) as Record<string, string>;
    coverLetterText = Object.entries(parsed)
      .map(([k, v]) => `**${k}:** ${v}`)
      .join('\n\n');
  } catch {
    // plain text
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Applicant Info */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold shrink-0">
              {member.firstName.charAt(0)}{member.lastName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{member.firstName} {member.lastName}</p>
                <ApplicationStatusBadge status={application.status} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />{member.email}
                </span>
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />{member.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Opportunity */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Opportunity</p>
            <p className="font-medium">{opportunity.title}</p>
            {opportunity.startsAt && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(new Date(opportunity.startsAt), 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>

          {/* Motivation / Cover Letter */}
          {coverLetterText && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Application Details
              </p>
              <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-line">
                {coverLetterText}
              </div>
            </div>
          )}

          {/* Applied date */}
          <div>
            <p className="text-xs text-muted-foreground">
              Applied {format(new Date(application.createdAt), 'MMMM d, yyyy • h:mm a')}
            </p>
          </div>

          {/* Reviewer notes */}
          {application.status === 'PENDING' && (
            <div className="space-y-1.5">
              <Label>Review Note (optional)</Label>
              <Textarea
                rows={3}
                placeholder="Add a note for the applicant..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending !== null}>
            Cancel
          </Button>
          {application.status === 'PENDING' && (
            <>
              <Button
                variant="destructive"
                onClick={() => void handleReview('REJECTED')}
                disabled={pending !== null}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                {pending === 'REJECTED' ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button
                onClick={() => void handleReview('APPROVED')}
                disabled={pending !== null}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {pending === 'APPROVED' ? 'Approving...' : 'Approve'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
