import type { Metadata } from 'next'
import { getCustomFields } from '@/lib/actions/custom-fields'
import { CustomFieldsManager } from './_components/custom-fields-manager'

export const metadata: Metadata = { title: 'Custom Fields' }

export default async function CustomFieldsPage() {
  const result = await getCustomFields()
  return <CustomFieldsManager initialFields={result.data ?? []} />
}
