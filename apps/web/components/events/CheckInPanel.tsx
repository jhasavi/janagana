'use client';

import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { Search, UserCheck, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { AttendanceReport, AttendanceRecord } from '@/lib/types/event';

interface CheckInPanelProps {
  eventId: string;
  attendance: AttendanceReport | undefined;
  isLoadingAttendance?: boolean;
  onCheckIn: (query: string) => Promise<{
    checkedIn?: boolean;
    alreadyCheckedIn?: boolean;
    checkedInAt: string;
    member: { firstName: string; lastName: string; email: string };
  }>;
}

type CheckInResult =
  | { type: 'success'; name: string; time: string }
  | { type: 'already'; name: string }
  | { type: 'error'; message: string };

export function CheckInPanel({ attendance, isLoadingAttendance, onCheckIn }: CheckInPanelProps) {
  const [query, setQuery] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);

  const attendancePct =
    attendance && attendance.totalRegistrations > 0
      ? Math.round((attendance.totalAttendance / attendance.totalRegistrations) * 100)
      : 0;

  const handleCheckIn = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsChecking(true);
    setLastResult(null);
    try {
      const res = await onCheckIn(trimmed);
      const name = `${res.member.firstName} ${res.member.lastName}`;
      if (res.alreadyCheckedIn) {
        setLastResult({ type: 'already', name });
      } else {
        setLastResult({
          type: 'success',
          name,
          time: format(new Date(res.checkedInAt), 'h:mm:ss a'),
        });
      }
      setQuery('');
    } catch {
      setLastResult({ type: 'error', message: 'Member not found or not registered.' });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      {attendance && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Attendance Progress</span>
            <span className="text-muted-foreground">
              {attendance.totalAttendance} / {attendance.totalRegistrations}
            </span>
          </div>
          <Progress value={attendancePct} className="h-2" />
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-lg font-bold text-emerald-600">{attendance.totalAttendance}</p>
              <p className="text-muted-foreground">Checked In</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-500">
                {attendance.totalRegistrations - attendance.totalAttendance}
              </p>
              <p className="text-muted-foreground">Absent</p>
            </div>
            <div>
              <p className="text-lg font-bold">{attendancePct}%</p>
              <p className="text-muted-foreground">Attendance</p>
            </div>
          </div>
        </div>
      )}

      {/* Check-in input */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Enter a member email, name, or scan/paste a QR code to check in.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Email, name or QR code..."
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCheckIn(); }}
              disabled={isChecking}
            />
          </div>
          <Button onClick={() => void handleCheckIn()} disabled={isChecking || !query.trim()}>
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Check In</span>
          </Button>
        </div>

        {/* Result banner */}
        {lastResult && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border p-3 text-sm',
              lastResult.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
              lastResult.type === 'already' && 'border-amber-200 bg-amber-50 text-amber-800',
              lastResult.type === 'error' && 'border-red-200 bg-red-50 text-red-800',
            )}
          >
            {lastResult.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {lastResult.type === 'already' && <Clock className="h-4 w-4 shrink-0" />}
            {lastResult.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>
              {lastResult.type === 'success' &&
                `${lastResult.name} checked in at ${lastResult.time}`}
              {lastResult.type === 'already' &&
                `${lastResult.name} was already checked in`}
              {lastResult.type === 'error' && lastResult.message}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Recent check-ins */}
      {attendance && attendance.attendees.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Check-ins</h4>
          <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border divide-y">
            {[...attendance.attendees]
              .sort((a, b) => new Date(b.checkedInAt!).getTime() - new Date(a.checkedInAt!).getTime())
              .slice(0, 20)
              .map((rec) => (
                <div key={rec.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    {rec.member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rec.member.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                        {rec.member.firstName.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{rec.member.firstName} {rec.member.lastName}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {rec.checkedInAt ? format(new Date(rec.checkedInAt), 'h:mm a') : '—'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
