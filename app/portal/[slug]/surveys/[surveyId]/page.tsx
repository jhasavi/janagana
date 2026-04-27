import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicSurvey } from '@/lib/actions/surveys'
import { SurveyTaker } from './_components/survey-taker'

interface Props {
  params: Promise<{ slug: string; surveyId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, surveyId } = await params
  const result = await getPublicSurvey(slug, surveyId)
  return { title: result.data?.title ?? 'Survey' }
}

export default async function PortalSurveyPage({ params }: Props) {
  const { slug, surveyId } = await params
  const result = await getPublicSurvey(slug, surveyId)

  if (!result.success || !result.data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-2xl">📋</p>
        <h1 className="text-xl font-semibold">Survey not available</h1>
        <p className="text-muted-foreground text-sm">
          {result.error ?? 'This survey is not available.'}
        </p>
      </div>
    )
  }

  return <SurveyTaker survey={result.data} />
}
