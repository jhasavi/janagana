'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { MemberForm } from '@/components/members/MemberForm';
import {
  useMember,
  useUpdateMember,
  useMembershipTiers,
  useMemberCustomFields,
} from '@/hooks/useMembers';
import type { CreateMemberInput } from '@/lib/validations/member';

export default function EditMemberPage() {
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const router = useRouter();

  const { data: member, isLoading } = useMember(memberId);
  const { data: tiers } = useMembershipTiers();
  const { data: customFields } = useMemberCustomFields();
  const updateMutation = useUpdateMember();

  const handleSubmit = async (values: CreateMemberInput) => {
    try {
      await updateMutation.mutateAsync({ id: memberId, data: values });
      toast.success('Member updated!');
      router.push(`/dashboard/members/${memberId}`);
    } catch (err) {
      toast.error('Update failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-80" />
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="py-24 text-center text-muted-foreground text-sm">
        Member not found.
      </div>
    );
  }

  const defaultValues: Partial<CreateMemberInput> = {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone ?? undefined,
    dateOfBirth: member.dateOfBirth ?? undefined,
    address: {
      city: member.city ?? undefined,
      state: member.state ?? undefined,
      country: member.countryCode ?? 'US',
    },
    sendWelcomeEmail: false,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${member.firstName} ${member.lastName}`}
        description="Update member details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Members', href: '/dashboard/members' },
          {
            label: `${member.firstName} ${member.lastName}`,
            href: `/dashboard/members/${memberId}`,
          },
          { label: 'Edit' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/members/${memberId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <MemberForm
            defaultValues={defaultValues}
            tiers={tiers ?? []}
            customFields={customFields ?? []}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            isEditing
          />
        </CardContent>
      </Card>
    </div>
  );
}
