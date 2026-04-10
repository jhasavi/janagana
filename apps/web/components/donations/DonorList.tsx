'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';

interface Donor {
  id: string;
  donorName?: string;
  donorEmail?: string;
  amountCents: number;
  currency: string;
  message?: string;
  isAnonymous: boolean;
  dedicatedTo?: string;
  createdAt: Date;
}

interface DonorListProps {
  donors: Donor[];
  showAnonymous?: boolean;
  limit?: number;
}

export function DonorList({ donors, showAnonymous = false, limit }: DonorListProps) {
  const filteredDonors = showAnonymous
    ? donors
    : donors.filter((d) => !d.isAnonymous);

  const displayDonors = limit ? filteredDonors.slice(0, limit) : filteredDonors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Donors</CardTitle>
        <CardDescription>
          Thank you to our generous supporters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayDonors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No donations yet. Be the first to donate!
            </p>
          ) : (
            displayDonors.map((donor) => (
              <div key={donor.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {donor.isAnonymous ? (
                        <Badge variant="secondary">Anonymous</Badge>
                      ) : (
                        donor.donorName || 'Supporter'
                      )}
                    </span>
                    <span className="font-bold">
                      ${(donor.amountCents / 100).toLocaleString()}
                    </span>
                  </div>
                  {donor.message && (
                    <p className="text-sm text-muted-foreground italic">
                      "{donor.message}"
                    </p>
                  )}
                  {donor.dedicatedTo && (
                    <p className="text-sm text-muted-foreground">
                      In memory/honor of: {donor.dedicatedTo}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(donor.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {limit && filteredDonors.length > limit && (
          <div className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              +{filteredDonors.length - limit} more donors
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
