import type { Metadata } from 'next'
import { SurveyBuilderClient } from '../_components/survey-builder-client'

export const metadata: Metadata = { title: 'New Survey' }

export default function NewSurveyPage() {
  return <SurveyBuilderClient />
}
