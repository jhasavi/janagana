'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ArticleFeedback({ articleSlug }: { articleSlug: string }) {
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleFeedback = async (type: 'helpful' | 'not-helpful') => {
    setFeedback(type)

    try {
      const response = await fetch('/api/help/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleSlug, helpful: type === 'helpful' }),
      })

      if (!response.ok) {
        throw new Error('Unable to submit feedback')
      }

      setSubmitted(true)
    } catch (error) {
      console.error('[ArticleFeedback]', error)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Thanks for your feedback!
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-3">Was this article helpful?</p>
        <div className="flex gap-2">
          <Button
            variant={feedback === 'helpful' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFeedback('helpful')}
            className="flex-1"
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            Yes
          </Button>
          <Button
            variant={feedback === 'not-helpful' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFeedback('not-helpful')}
            className="flex-1"
          >
            <ThumbsDown className="h-4 w-4 mr-2" />
            No
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
