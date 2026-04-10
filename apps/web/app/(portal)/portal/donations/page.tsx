import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, CreditCard } from 'lucide-react';

export default function MemberDonationsPage() {
  const donations = [
    { id: '1', amount: 150, date: '2026-01-15', campaign: 'Annual Fund Drive 2026', status: 'SUCCEEDED', receipt: true },
    { id: '2', amount: 500, date: '2026-01-14', campaign: 'Community Center Renovation', status: 'SUCCEEDED', receipt: true },
    { id: '3', amount: 75, date: '2026-01-14', campaign: 'Youth Program Support', status: 'SUCCEEDED', receipt: true },
    { id: '4', amount: 200, date: '2026-01-13', campaign: 'Annual Fund Drive 2026', status: 'SUCCEEDED', receipt: true },
    { id: '5', amount: 100, date: '2026-01-12', campaign: 'Annual Fund Drive 2026', status: 'SUCCEEDED', receipt: true },
  ];

  const recurringDonations = [
    { id: '1', amount: 50, interval: 'MONTHLY', nextBilling: '2026-02-01', campaign: 'General Fund' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Donations</h1>
        <p className="text-muted-foreground">View your donation history and manage recurring donations</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,025</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recurring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$50/mo</div>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Donations */}
      {recurringDonations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recurring Donations</CardTitle>
            <CardDescription>Manage your recurring donation commitments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recurringDonations.map((donation) => (
                <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">${donation.amount}/month</span>
                      <Badge variant="secondary">{donation.interval}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{donation.campaign}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Next billing: {donation.nextBilling}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Donation History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donation History</CardTitle>
              <CardDescription>Your past donations</CardDescription>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {donations.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">${donation.amount}</span>
                    <Badge className="bg-green-500">Succeeded</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{donation.campaign}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{donation.date}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Receipt
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Make New Donation */}
      <Card>
        <CardHeader>
          <CardTitle>Make a New Donation</CardTitle>
          <CardDescription>Support our organization with another contribution</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full">
            <CreditCard className="h-4 w-4 mr-2" />
            Donate Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
