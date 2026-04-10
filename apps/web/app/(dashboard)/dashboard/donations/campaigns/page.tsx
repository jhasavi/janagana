import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CampaignsPage() {
  const campaigns = [
    {
      id: '1',
      title: 'Annual Fund Drive 2026',
      status: 'ACTIVE',
      goal: 20000,
      raised: 15000,
      donorCount: 156,
      endDate: '2026-03-31',
    },
    {
      id: '2',
      title: 'Community Center Renovation',
      status: 'ACTIVE',
      goal: 10000,
      raised: 8500,
      donorCount: 89,
      endDate: '2026-02-28',
    },
    {
      id: '3',
      title: 'Youth Program Support',
      status: 'ACTIVE',
      goal: 5000,
      raised: 1080,
      donorCount: 42,
      endDate: '2026-04-15',
    },
    {
      id: '4',
      title: 'Holiday Giving Campaign',
      status: 'COMPLETED',
      goal: 15000,
      raised: 16200,
      donorCount: 203,
      endDate: '2025-12-31',
    },
    {
      id: '5',
      title: 'New Equipment Fund',
      status: 'DRAFT',
      goal: 8000,
      raised: 0,
      donorCount: 0,
      endDate: '2026-05-01',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage your fundraising campaigns</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/donations/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => {
          const percentage = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0;
          const statusColors = {
            ACTIVE: 'bg-green-500',
            COMPLETED: 'bg-blue-500',
            DRAFT: 'bg-gray-500',
            PAUSED: 'bg-yellow-500',
          };

          return (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {campaign.title}
                      <Badge variant="outline" className={statusColors[campaign.status as keyof typeof statusColors]}>
                        {campaign.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {campaign.status === 'ACTIVE' && `Ends: ${campaign.endDate}`}
                      {campaign.status === 'COMPLETED' && `Completed: ${campaign.endDate}`}
                      {campaign.status === 'DRAFT' && `Scheduled: ${campaign.endDate}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/donations/campaigns/${campaign.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        ${campaign.raised.toLocaleString()} / ${campaign.goal.toLocaleString()}
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
                      <span>{campaign.donorCount} donors</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
