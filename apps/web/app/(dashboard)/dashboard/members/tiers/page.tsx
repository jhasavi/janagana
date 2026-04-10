'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  DollarSign,
  Star,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/layout/PageHeader';

import {
  useMembershipTiers,
  useCreateTier,
  useUpdateTier,
  useDeleteTier,
} from '@/hooks/useMembers';
import { createTierSchema, type CreateTierInput } from '@/lib/validations/member';
import type { MembershipTier } from '@/lib/types/member';

// ─── Tier form modal ──────────────────────────────────────────────────────────

interface TierModalProps {
  open: boolean;
  onClose: () => void;
  editingTier?: MembershipTier | null;
}

function TierModal({ open, onClose, editingTier }: TierModalProps) {
  const createTier = useCreateTier();
  const updateTier = useUpdateTier();
  const isEditing = !!editingTier;

  const form = useForm<CreateTierInput>({
    resolver: zodResolver(createTierSchema),
    defaultValues: editingTier
      ? {
          name: editingTier.name,
          description: editingTier.description ?? '',
          monthlyPriceCents: editingTier.monthlyPriceCents,
          annualPriceCents: editingTier.annualPriceCents ?? undefined,
          isFree: editingTier.isFree,
          isPublic: editingTier.isPublic,
          sortOrder: editingTier.sortOrder ?? 0,
        }
      : {
          name: '',
          description: '',
          monthlyPriceCents: 0,
          isFree: false,
          isPublic: true,
          sortOrder: 0,
        },
  });

  // Reset form when modal opens with different data
  React.useEffect(() => {
    if (open) {
      form.reset(
        editingTier
          ? {
              name: editingTier.name,
              description: editingTier.description ?? '',
              monthlyPriceCents: editingTier.monthlyPriceCents,
              annualPriceCents: editingTier.annualPriceCents ?? undefined,
              isFree: editingTier.isFree,
              isPublic: editingTier.isPublic,
              sortOrder: editingTier.sortOrder ?? 0,
            }
          : {
              name: '',
              description: '',
              monthlyPriceCents: 0,
              isFree: false,
              isPublic: true,
              sortOrder: 0,
            },
      );
    }
  }, [open, editingTier, form]);

  const isFree = form.watch('isFree');

  const onSubmit = async (values: CreateTierInput) => {
    try {
      if (isEditing && editingTier) {
        await updateTier.mutateAsync({ id: editingTier.id, data: values });
        toast.success('Tier updated!');
      } else {
        await createTier.mutateAsync(values);
        toast.success('Tier created!');
      }
      onClose();
    } catch (err) {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} tier`, {
        description: err instanceof Error ? err.message : '',
      });
    }
  };

  const isPending = createTier.isPending || updateTier.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tier' : 'Create Membership Tier'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input placeholder="Gold Membership" {...field} /></FormControl>
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
                    <Textarea placeholder="What's included in this tier…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFree"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Free tier</FormLabel>
                    <FormDescription className="text-xs">Members can join at no cost</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isFree && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="monthlyPriceCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Price (cents)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="1999"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        ${((field.value ?? 0) / 100).toFixed(2)}/mo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="annualPriceCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Price (cents)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="19999"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Public</FormLabel>
                    <FormDescription className="text-xs">Visible on the member portal</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Tier'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tier card ────────────────────────────────────────────────────────────────

interface TierCardProps {
  tier: MembershipTier;
  onEdit: (tier: MembershipTier) => void;
  onDelete: (tier: MembershipTier) => void;
}

function TierCard({ tier, onEdit, onDelete }: TierCardProps) {
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{tier.name}</CardTitle>
            {!tier.isPublic && (
              <Badge variant="secondary" className="text-xs">Private</Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(tier)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(tier)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-1">
          {tier.isFree ? (
            <p className="text-2xl font-bold">Free</p>
          ) : (
            <p className="text-2xl font-bold">
              ${(tier.monthlyPriceCents / 100).toFixed(0)}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
          )}
          {!tier.isFree && tier.annualPriceCents && (
            <p className="text-xs text-muted-foreground">
              ${(tier.annualPriceCents / 100).toFixed(0)}/yr
            </p>
          )}
        </div>

        {tier.description && (
          <CardDescription className="text-xs mt-1">{tier.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>
              {tier._count?.subscriptions ?? 0} members
            </span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TiersPage() {
  const { data: tiers, isLoading } = useMembershipTiers();
  const deleteTier = useDeleteTier();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingTier, setEditingTier] = React.useState<MembershipTier | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MembershipTier | null>(null);

  const handleEdit = (tier: MembershipTier) => {
    setEditingTier(tier);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTier.mutateAsync(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
    } catch (err) {
      toast.error('Delete failed', { description: err instanceof Error ? err.message : '' });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership Tiers"
        description="Define the membership plans available to your members"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Members', href: '/dashboard/members' },
          { label: 'Tiers' },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingTier(null);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Tier
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : !tiers || tiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Star className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No tiers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first membership tier to get started
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => {
              setEditingTier(null);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Tier
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <TierModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTier(null);
        }}
        editingTier={editingTier}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Tier"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? Members currently on this tier will lose their subscription.`
            : ''
        }
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
