'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClubForm } from '@/components/clubs/ClubForm';

import { useCreateClub } from '@/hooks/useClubs';
import type { CreateClubInput } from '@/lib/validations/club';

const MEMBER_ID_KEY = 'portalMemberId';
function getMemberId() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(MEMBER_ID_KEY) ?? '';
}

export default function PortalCreateClubPage() {
  const router = useRouter();
  const memberId = getMemberId();
  const createClub = useCreateClub(memberId);

  const handleSubmit = async (data: CreateClubInput) => {
    if (!memberId) {
      toast.error('Member ID not found. Please contact your administrator.');
      return;
    }
    try {
      const club = await createClub.mutateAsync(data);
      toast.success('Club created!');
      router.push(`/portal/clubs/${club.id}`);
    } catch {
      toast.error('Failed to create club');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/portal/clubs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Clubs
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Create a Club</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Start a new club for members with shared interests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Club Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClubForm
            onSubmit={handleSubmit}
            submitLabel="Create Club"
            isSubmitting={createClub.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
