import type { Metadata } from 'next'
import { FormBuilderClient } from '../_components/form-builder-client'

export const metadata: Metadata = { title: 'New Form' }

export default function NewFormPage() {
  return <FormBuilderClient />
}
