'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { submitSurveyResponse } from '@/lib/actions/surveys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Survey, SurveyQuestion } from '@prisma/client'

interface Props {
  survey: Survey & { questions: SurveyQuestion[] }
}

export function SurveyTaker({ survey }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const setValue = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleMulti = (questionId: string, option: string) => {
    const current = (answers[questionId] as string[] | undefined) ?? []
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option]
    setValue(questionId, next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const payload = survey.questions.map((q) => {
        const val = answers[q.id]
        return {
          questionId: q.id,
          value: Array.isArray(val) ? JSON.stringify(val) : (val ?? ''),
        }
      })

      const result = await submitSurveyResponse(survey.id, payload)
      if (result.success) {
        setSubmitted(true)
      } else {
        toast.error(result.error ?? 'Failed to submit')
      }
    })
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold">Thank you!</h2>
        <p className="text-muted-foreground">Your response has been recorded.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{survey.title}</h1>
        {survey.description && (
          <p className="text-muted-foreground mt-1 leading-relaxed">{survey.description}</p>
        )}
        {survey.isAnonymous && (
          <p className="text-xs text-muted-foreground mt-2">
            Your response is anonymous.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {survey.questions.map((q, qi) => (
          <Card key={q.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {qi + 1}. {q.text}
                {q.isRequired && <span className="text-destructive ml-1">*</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === 'TEXT' && (
                <Input
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => setValue(q.id, e.target.value)}
                  required={q.isRequired}
                />
              )}
              {q.type === 'TEXTAREA' && (
                <Textarea
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => setValue(q.id, e.target.value)}
                  required={q.isRequired}
                  rows={4}
                />
              )}
              {q.type === 'YES_NO' && (
                <div className="flex gap-4">
                  {['Yes', 'No'].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        required={q.isRequired}
                        checked={(answers[q.id] as string) === opt}
                        onChange={() => setValue(q.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'RATING' && (
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={String(n)}
                        required={q.isRequired}
                        checked={(answers[q.id] as string) === String(n)}
                        onChange={() => setValue(q.id, String(n))}
                        className="sr-only"
                      />
                      <span
                        className={`text-2xl transition-transform ${
                          (answers[q.id] as string) === String(n)
                            ? 'scale-125'
                            : 'opacity-40'
                        }`}
                      >
                        ⭐
                      </span>
                      <span className="text-xs">{n}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'SINGLE_CHOICE' && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        required={q.isRequired}
                        checked={(answers[q.id] as string) === opt}
                        onChange={() => setValue(q.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        value={opt}
                        checked={((answers[q.id] as string[]) ?? []).includes(opt)}
                        onChange={() => toggleMulti(q.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Submitting...' : 'Submit Response'}
        </Button>
      </form>
    </div>
  )
}
