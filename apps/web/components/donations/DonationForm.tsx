'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, Lock } from 'lucide-react';

interface DonationFormProps {
  campaignId?: string;
  defaultAmounts?: number[];
  allowRecurring?: boolean;
  onSubmit: (data: DonationFormData) => void;
}

export interface DonationFormData {
  amountCents: number;
  currency: string;
  isRecurring: boolean;
  recurringInterval?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  donorName?: string;
  donorEmail?: string;
  message?: string;
  isAnonymous: boolean;
  dedicatedTo?: string;
}

export function DonationForm({
  campaignId,
  defaultAmounts = [10, 25, 50, 100, 250, 500],
  allowRecurring = true,
  onSubmit,
}: DonationFormProps) {
  const [customAmount, setCustomAmount] = React.useState('');
  const [selectedAmount, setSelectedAmount] = React.useState<number | null>(null);
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [recurringInterval, setRecurringInterval] = React.useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [donorName, setDonorName] = React.useState('');
  const [donorEmail, setDonorEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [dedicatedTo, setDedicatedTo] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const amountCents = (selectedAmount || parseFloat(customAmount)) * 100;

    const data: DonationFormData = {
      amountCents,
      currency: 'USD',
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      donorName: isAnonymous ? undefined : donorName || undefined,
      donorEmail: isAnonymous ? undefined : donorEmail || undefined,
      message: message || undefined,
      isAnonymous,
      dedicatedTo: dedicatedTo || undefined,
    };

    await onSubmit(data);
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Donation</CardTitle>
        <CardDescription>Enter your donation details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Selection */}
          <div className="space-y-4">
            <Label>Select Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {defaultAmounts.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={selectedAmount === amount ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
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
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
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
          {allowRecurring && (
            <div className="space-y-3">
              <Label>Make this a recurring donation?</Label>
              <RadioGroup
                value={isRecurring ? recurringInterval : 'one-time'}
                onValueChange={(value) => {
                  if (value === 'one-time') {
                    setIsRecurring(false);
                  } else {
                    setIsRecurring(true);
                    setRecurringInterval(value as 'MONTHLY' | 'QUARTERLY' | 'YEARLY');
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one-time" id="one-time" />
                  <Label htmlFor="one-time">One-time donation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MONTHLY" id="monthly" />
                  <Label htmlFor="monthly">Monthly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="QUARTERLY" id="quarterly" />
                  <Label htmlFor="quarterly">Quarterly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="YEARLY" id="yearly" />
                  <Label htmlFor="yearly">Yearly</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Donor Information */}
          <div className="space-y-4">
            <Label>Your Information</Label>
            <div className="space-y-3">
              <Input
                placeholder="Full Name"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                disabled={isAnonymous}
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                disabled={isAnonymous}
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <Label>Optional</Label>
            <div className="space-y-3">
              <Textarea
                placeholder="Add a message (optional)"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Input
                placeholder="Dedicate this donation (in memory/honor of)"
                value={dedicatedTo}
                onChange={(e) => setDedicatedTo(e.target.value)}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                />
                <Label
                  htmlFor="anonymous"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  Make this donation anonymous
                </Label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            <Heart className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Processing...' : 'Donate Now'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Stripe. No account required.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
