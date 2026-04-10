'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { MemberForm } from '@/components/members/MemberForm';
import { useCreateMember, useMembershipTiers, useMemberCustomFields } from '@/hooks/useMembers';
import type { CreateMemberInput } from '@/lib/validations/member';

export default function NewMemberPage() {
  const router = useRouter();
  const { mutateAsync } = useCreateMember();
  const { data: tiers } = useMembershipTiers();
  const { data: customFields } = useMemberCustomFields();

  const handleSubmit = async (values: CreateMemberInput) => {
    try {
      const member = await mutateAsync(values);
      toast.success('Member created!', {
        description: `${values.firstName} ${values.lastName} has been added.`,
      });
      router.push(`/dashboard/members/${(member as { id: string }).id}`);
    } catch (err) {
      toast.error('Failed to create member', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err; // Let the form show the error state
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Member"
        description="Create a new member record for your organisation"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Members', href: '/dashboard/members' },
          { label: 'New Member' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <MemberForm
            tiers={tiers ?? []}
            customFields={customFields ?? []}
            onSubmit={handleSubmit}
            submitLabel="Create Member"
          />
        </CardContent>
      </Card>
    </div>
  );
}
