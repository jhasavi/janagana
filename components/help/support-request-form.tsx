'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SupportRequestFormProps {
  contextLabel?: string
}

export function SupportRequestForm({ contextLabel }: SupportRequestFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!message.trim()) {
      toast.error('Please describe the issue.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, context: contextLabel }),
      })
      if (!response.ok) {
        throw new Error('Request failed')
      }
      setSent(true)
      toast.success('Support request submitted. We will follow up soon.')
    } catch (error) {
      toast.error('Unable to submit support request.')
      console.error('[SupportRequestForm]', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold">Request submitted</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Thank you! We received your issue report and will follow up as soon as possible.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report an issue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="support-name">Name</Label>
            <Input
              id="support-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-email">Email</Label>
            <Input
              id="support-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-message">What happened?</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              placeholder="Describe the issue and any steps to reproduce it."
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
