'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MessageCircle, X, Star, Send } from 'lucide-react';

interface FeedbackWidgetProps {
  tenantId?: string;
}

export function FeedbackWidget({ tenantId }: FeedbackWidgetProps) {
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState<number>(0);
  const [feedback, setFeedback] = React.useState('');
  const [featureRequest, setFeatureRequest] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          feedback,
          featureRequest,
          tenantId,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
          setRating(0);
          setFeedback('');
          setFeatureRequest('');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg"
            style={{ backgroundColor: 'hsl(262.1 83.3% 57.8%)' }}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Feedback
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Help us improve OrgFlow by sharing your thoughts.
            </DialogDescription>
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold">Thank you for your feedback!</p>
              <p className="text-sm text-muted-foreground mt-2">
                We appreciate your input.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>How satisfied are you?</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          rating >= star
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="feedback">What can we improve?</Label>
                <Textarea
                  id="feedback"
                  placeholder="Tell us about your experience..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="featureRequest">What feature do you want most?</Label>
                <select
                  id="featureRequest"
                  value={featureRequest}
                  onChange={(e) => setFeatureRequest(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                >
                  <option value="">Select a feature...</option>
                  <option value="mobile-app">Mobile App</option>
                  <option value="sms-notifications">SMS Notifications</option>
                  <option value="zapier-integration">Zapier Integration</option>
                  <option value="advanced-reporting">Advanced Reporting</option>
                  <option value="custom-workflows">Custom Workflows</option>
                  <option value="api-access">API Access</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || rating === 0}
              >
                {submitting ? 'Sending...' : 'Submit Feedback'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
