'use client';

import * as React from 'react';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Video,
  Users,
  Pencil,
  Trash2,
  Copy,
  Send,
  Download,
  Clock,
  ArrowLeft,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { RegistrationTable } from '@/components/events/RegistrationTable';
import { CheckInPanel } from '@/components/events/CheckInPanel';
import { RegistrationModal } from '@/components/events/RegistrationModal';

import {
  useEvent,
  useEventRegistrations,
  useEventAttendance,
  useEventWaitlist,
  useDeleteEvent,
  useDuplicateEvent,
  useUpdateEventStatus,
  useRegisterMember,
  useCancelRegistration,
  useCheckIn,
  useExportRegistrations,
  useSendReminders,
  useProcessWaitlist,
} from '@/hooks/useEvents';
import type { EventStatus, RegistrationStatus, EventLocation } from '@/lib/types/event';

function parseLocation(raw: string | null): EventLocation | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as EventLocation; } catch { return null; }
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [regPage, setRegPage] = useState(1);
  const [regStatus, setRegStatus] = useState<RegistrationStatus | 'ALL'>('ALL');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  const { data: event, isLoading } = useEvent(id);
  const { data: registrationsData, isLoading: isRegLoading } = useEventRegistrations(id, {
    ...(regStatus !== 'ALL' ? { status: regStatus } : {}),
    page: regPage,
    limit: 25,
  });
  const { data: attendance, isLoading: isAttLoading } = useEventAttendance(id);
  const { data: waitlist } = useEventWaitlist(id);

  const deleteEvent = useDeleteEvent();
  const duplicateEvent = useDuplicateEvent();
  const updateStatus = useUpdateEventStatus();
  const registerMember = useRegisterMember(id);
  const cancelRegistration = useCancelRegistration(id);
  const checkIn = useCheckIn(id);
  const exportRegs = useExportRegistrations();
  const sendReminders = useSendReminders(id);
  const processWaitlist = useProcessWaitlist(id);

  const location = parseLocation(event?.location ?? null);
  const registrations = registrationsData?.data ?? [];
  const registrationsPct =
    event?.capacity && (registrationsData?.meta.total ?? 0) > 0
      ? Math.min(100, Math.round(((registrationsData?.meta.total ?? 0) / event.capacity) * 100))
      : null;

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(id);
      toast.success('Event deleted');
      router.push('/dashboard/events');
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateEvent.mutateAsync(id);
      toast.success('Event duplicated');
      router.push(`/dashboard/events/${copy.id}`);
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleStatusChange = async (status: EventStatus) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status } });
      toast.success(`Event marked as ${status.toLowerCase()}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleCheckIn = async (query: string) => {
    const isEmail = query.includes('@');
    // treat as memberId if UUID-ish, else qrCode
    const isUuid = /^[0-9a-f-]{36}$/i.test(query);
    return checkIn.mutateAsync(
      isUuid ? { memberId: query } : { qrCode: query },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/events')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={event.category?.name}
        breadcrumbs={[
          { label: 'Events', href: '/dashboard/events' },
          { label: event.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <EventStatusBadge status={event.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {event.status === 'DRAFT' && (
                  <DropdownMenuItem onClick={() => void handleStatusChange('PUBLISHED')}>
                    Publish Event
                  </DropdownMenuItem>
                )}
                {event.status === 'PUBLISHED' && (
                  <DropdownMenuItem onClick={() => void handleStatusChange('CANCELED')}>
                    Cancel Event
                  </DropdownMenuItem>
                )}
                {event.status === 'PUBLISHED' && (
                  <DropdownMenuItem onClick={() => void handleStatusChange('COMPLETED')}>
                    Mark Completed
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/dashboard/events/${id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Event
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleDuplicate()}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    sendReminders
                      .mutateAsync({ hoursBeforeEvent: 24 })
                      .then((r) => toast.success(`Reminders sent to ${r.sent} registrant(s)`))
                      .catch(() => toast.error('Failed to send reminders'))
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Reminders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void exportRegs.mutateAsync(id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Key info strip */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(event.startsAt), 'EEEE, MMM d, yyyy · h:mm a')}</span>
        </div>
        {event.endsAt && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Ends {format(new Date(event.endsAt), 'MMM d · h:mm a')}</span>
          </div>
        )}
        {event.format !== 'VIRTUAL' && location?.city && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{[location.name, location.city].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {event.format !== 'IN_PERSON' && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Video className="h-4 w-4" />
            <span>Virtual</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {event._count.registrations}
            {event.capacity ? ` / ${event.capacity} registered` : ' registered'}
          </span>
        </div>
        {registrationsPct !== null && (
          <div className="flex items-center gap-2">
            <Progress value={registrationsPct} className="h-1.5 w-20" />
            <span className="text-xs text-muted-foreground">{registrationsPct}%</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="registrations">
            Registrations
            {registrationsData && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {registrationsData.meta.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="waitlist">
            Waitlist
            {waitlist && waitlist.length > 0 && (
              <Badge variant="warning" className="ml-1 text-xs">
                {waitlist.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
        </TabsList>

        {/* ── Overview ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {event.description && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Description</h3>
              <div
                className="prose prose-sm max-w-none text-muted-foreground"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          )}

          {event.tickets.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Tickets</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {event.tickets.map((t) => (
                  <div key={t.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{t.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {t.price === 0 ? 'Free' : `$${(t.price / 100).toFixed(2)}`}
                      </Badge>
                    </div>
                    {t.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                    )}
                    {t.quantity && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.quantity} available
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Format</p>
              <p className="font-medium capitalize">{event.format.replace('_', ' ').toLowerCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Visibility</p>
              <p className="font-medium">{event.isPublic ? 'Public' : 'Private'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Members Only</p>
              <p className="font-medium">{event.isMembersOnly ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Requires Approval</p>
              <p className="font-medium">{event.requiresApproval ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </TabsContent>

        {/* ── Registrations ────────────────────────────────────── */}
        <TabsContent value="registrations">
          <div className="mb-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegistrationModal(true)}
            >
              <Users className="mr-2 h-3.5 w-3.5" />
              Register Member
            </Button>
          </div>
          <RegistrationTable
            registrations={registrations}
            totalCount={registrationsData?.meta.total ?? 0}
            page={regPage}
            limit={25}
            isLoading={isRegLoading}
            statusFilter={regStatus}
            onStatusFilter={(v) => { setRegStatus(v); setRegPage(1); }}
            onPageChange={setRegPage}
            onCancel={(regId) =>
              cancelRegistration
                .mutateAsync(regId)
                .then(() => toast.success('Registration canceled'))
                .catch(() => toast.error('Failed to cancel'))
            }
            onCheckIn={(memberId) =>
              checkIn
                .mutateAsync({ memberId })
                .then(() => toast.success('Checked in!'))
                .catch(() => toast.error('Check-in failed'))
            }
          />
        </TabsContent>

        {/* ── Check-In ─────────────────────────────────────────── */}
        <TabsContent value="checkin">
          <CheckInPanel
            eventId={id}
            attendance={attendance}
            isLoadingAttendance={isAttLoading}
            onCheckIn={handleCheckIn}
          />
        </TabsContent>

        {/* ── Waitlist ─────────────────────────────────────────── */}
        <TabsContent value="waitlist">
          {!waitlist || waitlist.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No one on the waitlist.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{waitlist.length} on waitlist</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    processWaitlist
                      .mutateAsync()
                      .then((r) => {
                        if (r?.promoted) toast.success('Next person promoted from waitlist');
                        else toast.info('No registrations available');
                      })
                      .catch(() => toast.error('Failed to process waitlist'))
                  }
                  disabled={processWaitlist.isPending}
                >
                  Process Next
                </Button>
              </div>
              <div className="rounded-md border divide-y">
                {waitlist.map((entry, i) => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-muted-foreground text-xs">#{i + 1}</span>
                      <span className="font-medium">
                        {entry.member.firstName} {entry.member.lastName}
                      </span>
                      <span className="text-muted-foreground">{entry.member.email}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.joinedAt), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Speakers ─────────────────────────────────────────── */}
        <TabsContent value="speakers">
          {event.speakers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No speakers yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {event.speakers.map((speaker) => (
                <div key={speaker.id} className="flex gap-3 rounded-lg border p-4">
                  {speaker.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={speaker.photoUrl}
                      alt={speaker.name}
                      className="h-12 w-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold shrink-0">
                      {speaker.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{speaker.name}</p>
                    {speaker.title && (
                      <p className="text-xs text-muted-foreground truncate">{speaker.title}</p>
                    )}
                    {speaker.company && (
                      <p className="text-xs text-muted-foreground truncate">{speaker.company}</p>
                    )}
                    {speaker.topic && (
                      <p className="mt-1 text-xs italic text-muted-foreground truncate">{speaker.topic}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Sponsors ─────────────────────────────────────────── */}
        <TabsContent value="sponsors">
          {event.sponsors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sponsors yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {event.sponsors.map((sponsor) => (
                <div key={sponsor.id} className="rounded-lg border p-4">
                  <p className="font-semibold text-sm">{sponsor.name}</p>
                  {sponsor.tier && (
                    <Badge variant="outline" className="mt-1 text-xs capitalize">
                      {sponsor.tier.toLowerCase()}
                    </Badge>
                  )}
                  {sponsor.websiteUrl && (
                    <a
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs text-muted-foreground hover:underline truncate"
                    >
                      {sponsor.websiteUrl}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Event"
        description="This will permanently delete the event and all registrations. This cannot be undone."
        onConfirm={handleDelete}
      />

      {/* Registration modal */}
      {event && (
        <RegistrationModal
          open={showRegistrationModal}
          onOpenChange={setShowRegistrationModal}
          event={event}
          members={[]}
          isSubmitting={registerMember.isPending}
          onSubmit={(data) => {
            registerMember
              .mutateAsync(data)
              .then(() => {
                toast.success('Member registered');
                setShowRegistrationModal(false);
              })
              .catch(() => toast.error('Registration failed'));
          }}
        />
      )}
    </div>
  );
}
