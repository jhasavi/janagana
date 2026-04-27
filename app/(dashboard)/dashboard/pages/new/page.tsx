import type { Metadata } from 'next'
import { PageEditorClient } from '../_components/page-editor-client'

export const metadata: Metadata = { title: 'New Page' }

export default function NewPagePage() {
  return <PageEditorClient />
}
