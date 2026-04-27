import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSurvey } from '@/lib/actions/surveys'
import { SurveyBuilderClient } from '../_components/survey-builder-client'

export const metadata: Metadata = { title: 'Edit Survey' }

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getSurvey(id)
  if (!result.success || !result.data) notFound()

  return <SurveyBuilderClient survey={result.data} />
}
