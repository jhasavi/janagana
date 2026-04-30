import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, BarChart, ClipboardCheck } from 'lucide-react'
import { getSurveys } from '@/lib/actions/surveys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { HelpButton } from '@/components/dashboard/help-button'

export const metadata: Metadata = { title: 'Surveys' }

export default async function SurveysPage() {
  const result = await getSurveys()
  const surveys = result.data ?? []

  const published = surveys.filter((s) => s.isPublished).length
  const totalResponses = surveys.reduce((s, sv) => s + sv._count.responses, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Surveys & Polls</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Collect feedback and run polls with your members.
            </p>
          </div>
          <HelpButton
            title="Surveys & Polls"
            content="Create surveys and polls to collect feedback from your members. Build custom questions, publish surveys, and view response analytics."
            link="/dashboard/help/features/surveys-polls"
          />
        </div>
        <Button asChild>
          <Link href="/dashboard/surveys/new"><Plus className="h-4 w-4" /> New Survey</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Total Surveys</p>
            <p className="text-3xl font-bold mt-1">{surveys.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Published</p>
            <p className="text-3xl font-bold mt-1">{published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Total Responses</p>
            <p className="text-3xl font-bold mt-1">{totalResponses}</p>
          </CardContent>
        </Card>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No surveys yet</p>
            <Button asChild size="sm">
              <Link href="/dashboard/surveys/new"><Plus className="h-4 w-4" /> Create First Survey</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base line-clamp-1">{survey.title}</CardTitle>
                <Badge variant={survey.isPublished ? 'success' : 'secondary'}>
                  {survey.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {survey.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{survey.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{survey._count.questions} questions</span>
                  <span>{survey._count.responses} responses</span>
                </div>
                {survey.closesAt && (
                  <p className="text-xs text-muted-foreground">
                    Closes {formatDate(survey.closesAt)}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/dashboard/surveys/${survey.id}`}>Edit</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/surveys/${survey.id}/results`}>
                      <BarChart className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
