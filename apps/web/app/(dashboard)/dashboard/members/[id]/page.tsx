'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Calendar,
  RefreshCw,
  Shield,
  Trash2,
  AlertCircle,
  FileText,
  Upload,
  FilePlus2,
  Loader2,
  Clock,
  Users,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { PageHeader } from '@/components/layout/PageHeader';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { MemberStatusBadge } from '@/components/members/MemberStatusBadge';
import { MemberTierBadge } from '@/components/members/MemberTierBadge';
import { MemberActivityFeed } from '@/components/members/MemberActivityFeed';
import { SendEmailModal } from '@/components/members/SendEmailModal';

import {
  useMember,
  useMemberActivity,
  useMemberNotes,
  useMemberDocuments,
  useMembershipTiers,
  useAddMemberNote,
  useDeleteMember,
  useUpdateMemberStatus,
  useRenewMembership,
} from '@/hooks/useMembers';

import { addNoteSchema, renewMembershipSchema } from '@/lib/validations/member';
import type { AddNoteInput, RenewMembershipInput } from '@/lib/validations/member';

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  return iso ? format(new Date(iso), 'MMM d, yyyy') : '—';
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function TabOverview({ memberId }: { memberId: string }) {
  const { data: member, isLoading } = useMember(memberId);
  const { data: activity, isLoading: actLoading } = useMemberActivity(memberId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!member) return null;

  const activeSub = member.membershipSubscriptions.find((s) => s.status === 'ACTIVE');

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Profile card */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <MemberAvatar
              firstName={member.firstName}
              lastName={member.lastName}
              avatarUrl={member.avatarUrl}
              status={member.status}
              size="lg"
              showStatus
            />
            <div>
              <h2 className="font-semibold text-lg">{member.firstName} {member.lastName}</h2>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
            <MemberStatusBadge status={member.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { icon: Mail, label: member.email },
              { icon: Phone, label: member.phone ?? '—' },
              { icon: MapPin, label: [member.city, member.state].filter(Boolean).join(', ') || '—' },
              { icon: Calendar, label: `Joined ${fmt(member.joinedAt)}` },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Quick Stats</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                { label: 'Events', value: member._count.eventRegistrations },
                { label: 'Vol. Hours', value: member._count.volunteerHours },
                { label: 'Clubs', value: member._count.clubMemberships },
                { label: 'Payments', value: member._count.payments },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted p-2">
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right panel */}
      <div className="lg:col-span-2 space-y-4">
        {/* Membership card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Membership</CardTitle>
            <Link href={`/dashboard/members/${memberId}?tab=membership`}>
              <Button variant="ghost" size="sm" className="text-xs">View history</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeSub ? (
              <div className="flex items-center justify-between">
                <div>
                  <MemberTierBadge tierName={activeSub.tier?.name} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires {fmt(activeSub.endsAt)}
                  </p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active membership</p>
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <MemberActivityFeed activity={activity} isLoading={actLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Membership ──────────────────────────────────────────────────────────

function TabMembership({ memberId }: { memberId: string }) {
  const { data: member } = useMember(memberId);
  const { data: tiers } = useMembershipTiers();
  const renewMutation = useRenewMembership();
  const form = useForm<RenewMembershipInput>({
    resolver: zodResolver(renewMembershipSchema),
    defaultValues: { tierId: '' },
  });

  const onRenew = async (values: RenewMembershipInput) => {
    try {
      await renewMutation.mutateAsync({ memberId, data: values });
      toast.success('Membership renewed!');
      form.reset();
    } catch (err) {
      toast.error('Renewal failed', { description: err instanceof Error ? err.message : '' });
    }
  };

  if (!member) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-6">
      {/* Current subscriptions */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Subscription History</CardTitle></CardHeader>
        <CardContent>
          {member.membershipSubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No membership history.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.membershipSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell><MemberTierBadge tierName={sub.tier?.name} /></TableCell>
                    <TableCell>
                      <Badge variant={sub.status === 'ACTIVE' ? 'success' : 'secondary'} className="capitalize text-xs">
                        {sub.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(sub.startedAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(sub.endsAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Renewal form */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Renew / Assign Membership</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onRenew)} className="flex items-end gap-3">
              <FormField
                control={form.control}
                name="tierId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Select Tier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Choose a tier…" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(tiers ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={renewMutation.isPending}>
                {renewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Renew
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Events ──────────────────────────────────────────────────────────────

function TabEvents({ memberId }: { memberId: string }) {
  const { data: activity, isLoading } = useMemberActivity(memberId);
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const events = activity?.eventRegistrations ?? [];
  return (
    <Card>
      <CardContent className="pt-6">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No event registrations.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-sm">{e.event?.title ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(e.event?.startsAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{e.status.toLowerCase()}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tab: Volunteer ───────────────────────────────────────────────────────────

function TabVolunteer({ memberId }: { memberId: string }) {
  const { data: activity, isLoading } = useMemberActivity(memberId);
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const hours = activity?.volunteerHours ?? [];
  const total = hours.reduce((s, h) => s + h.hours, 0);
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-3xl font-bold">{total.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">Total volunteer hours</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {hours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No volunteer hours logged.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hours</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hours.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-semibold">{h.hours}h</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.description ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(h.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Clubs ───────────────────────────────────────────────────────────────

function TabClubs({ memberId }: { memberId: string }) {
  const { data: activity, isLoading } = useMemberActivity(memberId);
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const clubs = activity?.clubMemberships ?? [];
  return (
    <Card>
      <CardContent className="pt-6">
        {clubs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Not a member of any clubs.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clubs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm">{c.club?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{c.role.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(c.joinedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function TabDocuments({ memberId }: { memberId: string }) {
  const { data: docs, isLoading } = useMemberDocuments(memberId);
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Documents</CardTitle>
          <Button size="sm" variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!docs || docs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {doc.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{doc.mimeType}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(doc.sizeBytes / 1024).toFixed(1)} KB
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(doc.uploadedAt)}</TableCell>
                  <TableCell>
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tab: Notes ───────────────────────────────────────────────────────────────

function TabNotes({ memberId }: { memberId: string }) {
  const { data: notes, isLoading } = useMemberNotes(memberId);
  const addNote = useAddMemberNote();
  const form = useForm<AddNoteInput>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: { body: '', isPrivate: true },
  });

  const onSubmit = async (values: AddNoteInput) => {
    try {
      await addNote.mutateAsync({ memberId, data: values });
      toast.success('Note added');
      form.reset();
    } catch (err) {
      toast.error('Failed to add note');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Add Note</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Write a note about this member…" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer text-sm">Private note</FormLabel>
                    </FormItem>
                  )}
                />
                <Button type="submit" size="sm" disabled={addNote.isPending}>
                  {addNote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Note
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (notes ?? []).length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {(notes ?? []).map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed">{note.body}</p>
                  {note.isPrivate && (
                    <Badge variant="secondary" className="shrink-0 text-xs">Private</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {note.author?.fullName ?? 'Staff'} ·{' '}
                  {format(new Date(note.createdAt), 'MMM d, yyyy, h:mm a')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function TabSettings({ memberId }: { memberId: string }) {
  const router = useRouter();
  const { data: member } = useMember(memberId);
  const updateStatus = useUpdateMemberStatus();
  const deleteMutation = useDeleteMember();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ id: memberId, status });
      toast.success(`Status changed to ${status.toLowerCase()}`);
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(memberId);
      toast.success('Member deleted');
      router.push('/dashboard/members');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (!member) return null;

  return (
    <div className="space-y-4 max-w-lg">
      <Card>
        <CardHeader><CardTitle className="text-sm">Change Status</CardTitle></CardHeader>
        <CardContent>
          <Select defaultValue={member.status} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="BANNED">Banned</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-3">
            <div>
              <p className="text-sm font-medium">Delete Member</p>
              <p className="text-xs text-muted-foreground">Anonymise and disable this member permanently.</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will anonymise {member.firstName} {member.lastName}&apos;s data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const router = useRouter();

  const { data: member, isLoading, isError } = useMember(memberId);
  const [emailOpen, setEmailOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !member) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">Member not found</p>
        <Button variant="link" onClick={() => router.push('/dashboard/members')}>
          Back to members
        </Button>
      </div>
    );
  }

  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName}
        description={member.email}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Members', href: '/dashboard/members' },
          { label: fullName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button size="sm" asChild>
              <Link href={`/dashboard/members/${memberId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto gap-1 bg-transparent p-0 border-b rounded-none pb-0">
          {[
            { value: 'overview', label: 'Overview' },
            { value: 'membership', label: 'Membership' },
            { value: 'events', label: 'Events' },
            { value: 'volunteer', label: 'Volunteer' },
            { value: 'clubs', label: 'Clubs' },
            { value: 'documents', label: 'Documents' },
            { value: 'notes', label: `Notes (${member._count.notes})` },
            { value: 'settings', label: 'Settings' },
          ].map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview"><TabOverview memberId={memberId} /></TabsContent>
          <TabsContent value="membership"><TabMembership memberId={memberId} /></TabsContent>
          <TabsContent value="events"><TabEvents memberId={memberId} /></TabsContent>
          <TabsContent value="volunteer"><TabVolunteer memberId={memberId} /></TabsContent>
          <TabsContent value="clubs"><TabClubs memberId={memberId} /></TabsContent>
          <TabsContent value="documents"><TabDocuments memberId={memberId} /></TabsContent>
          <TabsContent value="notes"><TabNotes memberId={memberId} /></TabsContent>
          <TabsContent value="settings"><TabSettings memberId={memberId} /></TabsContent>
        </div>
      </Tabs>

      <SendEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        memberId={memberId}
        memberName={fullName}
      />
    </div>
  );
}
