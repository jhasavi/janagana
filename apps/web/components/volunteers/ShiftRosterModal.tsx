'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Users, Clock, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ShiftRoster } from '@/lib/types/volunteer';

interface ShiftRosterModalProps {
  roster: ShiftRoster | null;
  isLoading?: boolean;
  onClose: () => void;
}

export function ShiftRosterModal({ roster, isLoading, onClose }: ShiftRosterModalProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {roster?.shift.name ?? 'Shift Roster'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading roster...</div>
        )}

        {roster && !isLoading && (
          <div className="space-y-4 py-2">
            {/* Shift meta */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(roster.shift.startsAt), 'MMM d • h:mm a')}
                {' — '}
                {format(new Date(roster.shift.endsAt), 'h:mm a')}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {roster.count} / {roster.shift.capacity} signed up
              </span>
            </div>

            <Separator />

            {roster.signups.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No volunteers signed up yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {roster.signups.map((signup) => {
                  const m = signup.member;
                  return (
                    <li key={signup.id} className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                        {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      {signup.confirmedAt ? (
                        <Badge variant="success" className="text-xs">Confirmed</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
