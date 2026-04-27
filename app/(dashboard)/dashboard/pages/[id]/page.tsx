import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getContentPage } from '@/lib/actions/pages'
import { PageEditorClient } from '../_components/page-editor-client'

export const metadata: Metadata = { title: 'Edit Page' }

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getContentPage(id)
  if (!result.success || !result.data) notFound()

  return <PageEditorClient page={result.data} />
}
