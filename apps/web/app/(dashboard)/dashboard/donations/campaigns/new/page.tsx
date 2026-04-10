import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function NewCampaignPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImageUrl: '',
    goalAmount: '',
    currency: 'USD',
    startDate: '',
    endDate: '',
    isPublic: true,
    showProgressBar: true,
    showDonorList: false,
    allowRecurring: false,
    defaultAmounts: [10, 25, 50, 100],
    thankYouMessage: '',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/donations/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Campaign</h1>
          <p className="text-muted-foreground">Create a new fundraising campaign</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Basic information about your campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Annual Fund Drive 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your campaign and how the funds will be used..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverImageUrl">Cover Image URL</Label>
                <Input
                  id="coverImageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={formData.coverImageUrl}
                  onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="goalAmount">Goal Amount ($) *</Label>
                  <Input
                    id="goalAmount"
                    type="number"
                    placeholder="10000"
                    value={formData.goalAmount}
                    onChange={(e) => setFormData({ ...formData, goalAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thankYouMessage">Thank You Message</Label>
                <Textarea
                  id="thankYouMessage"
                  placeholder="Message to show donors after they complete their donation..."
                  rows={2}
                  value={formData.thankYouMessage}
                  onChange={(e) => setFormData({ ...formData, thankYouMessage: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Donation Amounts</CardTitle>
              <CardDescription>Suggested donation amounts for donors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {formData.defaultAmounts.map((amount, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        const newAmounts = [...formData.defaultAmounts];
                        newAmounts[index] = parseInt(e.target.value) || 0;
                        setFormData({ ...formData, defaultAmounts: newAmounts });
                      }}
                      className="w-24"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newAmounts = formData.defaultAmounts.filter((_, i) => i !== index);
                        setFormData({ ...formData, defaultAmounts: newAmounts });
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, defaultAmounts: [...formData.defaultAmounts, 0] })}
                >
                  + Add Amount
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure campaign visibility and options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Campaign</Label>
                  <p className="text-xs text-muted-foreground">Make this campaign visible to everyone</p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Progress Bar</Label>
                  <p className="text-xs text-muted-foreground">Display progress to donors</p>
                </div>
                <Switch
                  checked={formData.showProgressBar}
                  onCheckedChange={(checked) => setFormData({ ...formData, showProgressBar: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Donor List</Label>
                  <p className="text-xs text-muted-foreground">Display donor names publicly</p>
                </div>
                <Switch
                  checked={formData.showDonorList}
                  onCheckedChange={(checked) => setFormData({ ...formData, showDonorList: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Recurring</Label>
                  <p className="text-xs text-muted-foreground">Enable monthly/quarterly/yearly donations</p>
                </div>
                <Switch
                  checked={formData.allowRecurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowRecurring: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button className="w-full" size="lg" variant="outline">
                Publish Campaign
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
