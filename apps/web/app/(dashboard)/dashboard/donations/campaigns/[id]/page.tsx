import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Share2, Download, Pause, Play } from 'lucide-react';
import Link from 'next/link';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const campaign = {
    id: params.id,
    title: 'Annual Fund Drive 2026',
    description: 'Help us reach our annual fundraising goal to support our community programs and initiatives throughout the year.',
    coverImageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
    goalAmountCents: 2000000,
    raisedAmountCents: 1500000,
    currency: 'USD',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'ACTIVE',
    donorCount: 156,
    defaultAmounts: [10, 25, 50, 100],
    thankYouMessage: 'Thank you for your generous support!',
  };

  const percentage = (campaign.raisedAmountCents / campaign.goalAmountCents) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/donations/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{campaign.title}</h1>
            <p className="text-muted-foreground">Campaign details and donations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Campaign Progress</CardTitle>
                  <CardDescription>Track your fundraising progress</CardDescription>
                </div>
                <Badge className={campaign.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Raised</span>
                  <span className="text-2xl font-bold">
                    ${(campaign.raisedAmountCents / 100).toLocaleString()}
                  </span>
                </div>
                <div className="h-4 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{percentage.toFixed(1)}% of ${(campaign.goalAmountCents / 100).toLocaleString()}</span>
                  <span>{campaign.donorCount} donors</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">${((campaign.raisedAmountCents / campaign.donorCount) / 100).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Avg Donation</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{campaign.donorCount}</p>
                  <p className="text-xs text-muted-foreground">Total Donors</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                  </p>
                  <p className="text-xs text-muted-foreground">Days Left</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Latest donations to this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Sarah Johnson', amount: 150, date: '2 hours ago' },
                  { name: 'Anonymous', amount: 500, date: '5 hours ago' },
                  { name: 'Michael Chen', amount: 75, date: 'Yesterday' },
                  { name: 'Emily Davis', amount: 200, date: 'Yesterday' },
                  { name: 'Robert Wilson', amount: 100, date: '2 days ago' },
                ].map((donation, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{donation.name}</p>
                      <p className="text-xs text-muted-foreground">{donation.date}</p>
                    </div>
                    <p className="font-bold">${donation.amount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause Campaign
              </Button>
              <Button className="w-full" variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Resume Campaign
              </Button>
              <Button className="w-full" variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Copy Donation Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span>{campaign.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Date</span>
                <span>{campaign.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{campaign.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Default Amounts</span>
                <span>{campaign.defaultAmounts.join(', ')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thank You Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm italic">"{campaign.thankYouMessage}"</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
