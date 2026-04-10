'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { OpportunityForm } from '@/components/volunteers/OpportunityForm';
import { useCreateOpportunity, usePublishOpportunity } from '@/hooks/useVolunteers';
import type { CreateOpportunityInput } from '@/lib/validations/volunteer';

export default function NewOpportunityPage() {
  const router = useRouter();
  const createMutation = useCreateOpportunity();
  const publishMutation = usePublishOpportunity();

  const handleSubmit = async (data: CreateOpportunityInput, publish: boolean) => {
    try {
      const opp = await createMutation.mutateAsync(data);
      if (publish) {
        await publishMutation.mutateAsync(opp.id);
      }
      toast.success(publish ? 'Opportunity published!' : 'Opportunity saved as draft');
      router.push(`/dashboard/volunteers/opportunities/${opp.id}`);
    } catch {
      toast.error('Failed to create opportunity');
      throw new Error('submission failed');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Create Volunteer Opportunity"
        description="Set up a new volunteer opportunity and invite members to join."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Volunteers', href: '/dashboard/volunteers' },
          { label: 'Opportunities', href: '/dashboard/volunteers/opportunities' },
          { label: 'New' },
        ]}
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <OpportunityForm
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending || publishMutation.isPending}
        />
      </div>
    </div>
  );
}
