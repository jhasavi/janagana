import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface CampaignCardProps {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  goalAmountCents: number;
  raisedAmountCents: number;
  currency?: string;
  startDate: string;
  endDate?: string;
  status: string;
  donorCount: number;
  showProgressBar?: boolean;
}

export function CampaignCard({
  id,
  title,
  description,
  coverImageUrl,
  goalAmountCents,
  raisedAmountCents,
  currency = 'USD',
  startDate,
  endDate,
  status,
  donorCount,
  showProgressBar = true,
}: CampaignCardProps) {
  const percentage = goalAmountCents > 0 ? (raisedAmountCents / goalAmountCents) * 100 : 0;
  const daysLeft = endDate ? Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const statusColors = {
    ACTIVE: 'bg-green-500',
    COMPLETED: 'bg-blue-500',
    DRAFT: 'bg-gray-500',
    PAUSED: 'bg-yellow-500',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      {coverImageUrl && (
        <div className="h-48 w-full overflow-hidden">
          <img
            src={coverImageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="flex items-center gap-2">
              {title}
              <Badge className={statusColors[status as keyof typeof statusColors]}>
                {status}
              </Badge>
            </CardTitle>
            <CardDescription className="line-clamp-2">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showProgressBar && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {(raisedAmountCents / 100).toLocaleString()} {currency}
              </span>
              <span className="text-muted-foreground">
                of {(goalAmountCents / 100).toLocaleString()} {currency}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{percentage.toFixed(1)}% complete</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {donorCount} donors
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {daysLeft !== null && daysLeft > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{daysLeft} days left</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{(raisedAmountCents / donorCount / 100).toFixed(0)} avg</span>
          </div>
        </div>

        <Button asChild className="w-full">
          <Link href={`/dashboard/donations/campaigns/${id}`}>View Campaign</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
