import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Filter, FileText } from 'lucide-react';
import Link from 'next/link';

export default function DonorsPage() {
  const donors = [
    { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', amount: 150, date: '2026-01-15', campaign: 'Annual Fund Drive 2026' },
    { id: '2', name: 'Anonymous', email: null, amount: 500, date: '2026-01-14', campaign: 'Community Center Renovation' },
    { id: '3', name: 'Michael Chen', email: 'michael@example.com', amount: 75, date: '2026-01-14', campaign: 'Youth Program Support' },
    { id: '4', name: 'Emily Davis', email: 'emily@example.com', amount: 200, date: '2026-01-13', campaign: 'Annual Fund Drive 2026' },
    { id: '5', name: 'Robert Wilson', email: 'robert@example.com', amount: 100, date: '2026-01-12', campaign: 'Annual Fund Drive 2026' },
    { id: '6', name: 'Lisa Anderson', email: 'lisa@example.com', amount: 250, date: '2026-01-11', campaign: 'Community Center Renovation' },
    { id: '7', name: 'Anonymous', email: null, amount: 300, date: '2026-01-10', campaign: 'Annual Fund Drive 2026' },
    { id: '8', name: 'David Brown', email: 'david@example.com', amount: 50, date: '2026-01-09', campaign: 'Youth Program Support' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Donors</h1>
          <p className="text-muted-foreground">View and manage all donations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Donations</CardTitle>
              <CardDescription>View all donations across all campaigns</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search donors..." className="pl-9 w-64" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Donor</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((donor) => (
                  <tr key={donor.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {donor.name === 'Anonymous' ? (
                          <Badge variant="secondary">Anonymous</Badge>
                        ) : (
                          <span className="font-medium">{donor.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {donor.email || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/donations/campaigns/1`} className="text-primary hover:underline">
                        {donor.campaign}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-bold">${donor.amount}</td>
                    <td className="py-3 px-4 text-muted-foreground">{donor.date}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24,580</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$5,420</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recurring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,200/mo</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
