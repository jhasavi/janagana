'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ArticleFeedback() {
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleFeedback = (type: 'helpful' | 'not-helpful') => {
    setFeedback(type)
    setSubmitted(true)
    // In production, you would send this to an API
    console.log('Feedback submitted:', type)
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
