import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, Lock, Calendar, Users } from 'lucide-react';

export default function PublicDonatePage({ params }: { params: { tenantSlug: string } }) {
  const campaigns = [
    {
      id: '1',
      title: 'Annual Fund Drive 2026',
      description: 'Support our annual fundraising initiative to help us continue our mission.',
      goal: 20000,
      raised: 15000,
      donorCount: 156,
      coverImage: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400',
    },
    {
      id: '2',
      title: 'Community Center Renovation',
      description: 'Help us renovate our community center to better serve our neighborhood.',
      goal: 10000,
      raised: 8500,
      donorCount: 89,
      coverImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
    },
    {
      id: '3',
      title: 'Youth Program Support',
      description: 'Support our youth programs that provide mentorship and activities for local youth.',
      goal: 5000,
      raised: 1080,
      donorCount: 42,
      coverImage: 'https://images.unsplash.com/photo-1561489396-888724a1543d?w=400',
    },
  ];

  const defaultAmounts = [10, 25, 50, 100, 250, 500];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Make a Donation</h1>
            <p className="text-xl text-muted-foreground">Support our mission with a generous contribution</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Campaigns */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                <h2 className="text-2xl font-bold">Choose a Campaign</h2>
              </div>

              <div className="space-y-4">
                <Card className="cursor-pointer border-2 border-primary">
                  <CardHeader>
                    <CardTitle>General Donation</CardTitle>
                    <CardDescription>Support our organization's general fund</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Your donation will be used where it's needed most</span>
                    </div>
                  </CardContent>
                </Card>

                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          <img
                            src={campaign.coverImage}
                            alt={campaign.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <CardTitle className="text-lg">{campaign.title}</CardTitle>
                          <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{campaign.donorCount} donors</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Active</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">${(campaign.raised / 100).toLocaleString()}</span>
                          <span className="text-muted-foreground">of ${(campaign.goal / 100).toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(campaign.raised / campaign.goal) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Donation Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Your Donation</CardTitle>
                  <CardDescription>Enter your donation details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Amount Selection */}
                  <div className="space-y-4">
                    <Label>Select Amount</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {defaultAmounts.map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          className="h-12"
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="Custom amount"
                          className="pl-7"
                        />
                      </div>
                      <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                      </select>
                    </div>
                  </div>

                  {/* Recurring Option */}
                  <div className="space-y-3">
                    <Label>Make this a recurring donation?</Label>
                    <RadioGroup defaultValue="one-time">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one-time" id="one-time" />
                        <Label htmlFor="one-time">One-time donation</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly">Monthly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quarterly" id="quarterly" />
                        <Label htmlFor="quarterly">Quarterly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yearly" id="yearly" />
                        <Label htmlFor="yearly">Yearly</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Donor Information */}
                  <div className="space-y-4">
                    <Label>Your Information</Label>
                    <div className="space-y-3">
                      <Input placeholder="Full Name" />
                      <Input type="email" placeholder="Email Address" />
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div className="space-y-4">
                    <Label>Optional</Label>
                    <div className="space-y-3">
                      <Textarea placeholder="Add a message (optional)" rows={2} />
                      <Input placeholder="Dedicate this donation (in memory/honor of)" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="anonymous" />
                      <Label htmlFor="anonymous" className="flex items-center gap-2 cursor-pointer">
                        <Lock className="h-4 w-4" />
                        Make this donation anonymous
                      </Label>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button size="lg" className="w-full">
                    <Heart className="h-4 w-4 mr-2" />
                    Donate Now
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment powered by Stripe. No account required.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
