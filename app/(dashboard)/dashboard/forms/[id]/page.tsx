import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getForm } from '@/lib/actions/forms'
import { FormBuilderClient } from '../_components/form-builder-client'

export const metadata: Metadata = { title: 'Edit Form' }

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getForm(id)
  if (!result.success || !result.data) notFound()

  return <FormBuilderClient form={result.data} />
}
