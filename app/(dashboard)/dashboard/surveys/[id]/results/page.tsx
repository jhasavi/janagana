import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, BarChart2 } from 'lucide-react'
import { getSurveyResults } from '@/lib/actions/surveys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

function AnswerBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate max-w-[60%]">{label}</span>
        <span className="text-muted-foreground shrink-0">{count} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default async function SurveyResultsPage({ params }: Props) {
  const { id } = await params
  const result = await getSurveyResults(id)
  if (!result.success || !result.data) notFound()
  const survey = result.data
  const totalResponses = survey._count.responses

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/dashboard/surveys/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
            <Badge variant={survey.isPublished ? 'success' : 'secondary'}>
              {survey.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {totalResponses} response{totalResponses !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href={`/dashboard/surveys/${id}`}>
          <Button variant="outline" size="sm">Edit Survey</Button>
        </Link>
      </div>

      {totalResponses === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BarChart2 className="h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No responses yet</p>
            <p className="text-sm text-muted-foreground">
              Share the survey link with your members to start collecting responses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {survey.questions.map((q, qi) => {
            const answers = q.answers.map((a) => a.value)

            // For choice questions, tally options
            if (q.type === 'SINGLE_CHOICE' || q.type === 'YES_NO') {
              const tally: Record<string, number> = {}
              answers.forEach((v) => { tally[v] = (tally[v] ?? 0) + 1 })
              const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])

              return (
                <Card key={q.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {qi + 1}. {q.text}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{answers.length} answer{answers.length !== 1 ? 's' : ''}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sorted.map(([label, count]) => (
                      <AnswerBar key={label} label={label} count={count} total={answers.length} />
                    ))}
                  </CardContent>
                </Card>
              )
            }

            if (q.type === 'MULTIPLE_CHOICE') {
              const tally: Record<string, number> = {}
              answers.forEach((v) => {
                try {
                  const parsed: string[] = JSON.parse(v)
                  parsed.forEach((opt) => { tally[opt] = (tally[opt] ?? 0) + 1 })
                } catch { tally[v] = (tally[v] ?? 0) + 1 }
              })
              const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])

              return (
                <Card key={q.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{qi + 1}. {q.text}</CardTitle>
                    <p className="text-xs text-muted-foreground">{answers.length} response{answers.length !== 1 ? 's' : ''}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sorted.map(([label, count]) => (
                      <AnswerBar key={label} label={label} count={count} total={answers.length} />
                    ))}
                  </CardContent>
                </Card>
              )
            }

            if (q.type === 'RATING') {
              const tally: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
              answers.forEach((v) => { if (v in tally) tally[v]++ })
              const avg = answers.length > 0
                ? (answers.reduce((s, v) => s + (parseInt(v) || 0), 0) / answers.length).toFixed(1)
                : '—'

              return (
                <Card key={q.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{qi + 1}. {q.text}</CardTitle>
                    <p className="text-xs text-muted-foreground">Average: {avg} / 5 · {answers.length} response{answers.length !== 1 ? 's' : ''}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <AnswerBar key={n} label={`${n} ⭐`} count={tally[String(n)]} total={answers.length} />
                    ))}
                  </CardContent>
                </Card>
              )
            }

            // TEXT / TEXTAREA — show all as a list
            return (
              <Card key={q.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{qi + 1}. {q.text}</CardTitle>
                  <p className="text-xs text-muted-foreground">{answers.length} response{answers.length !== 1 ? 's' : ''}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {answers.filter(Boolean).map((v, i) => (
                      <li key={i} className="text-sm text-muted-foreground px-3 py-2 rounded-md bg-muted/50 border">
                        {v}
                      </li>
                    ))}
                    {answers.length === 0 && (
                      <p className="text-sm text-muted-foreground">No answers yet</p>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
