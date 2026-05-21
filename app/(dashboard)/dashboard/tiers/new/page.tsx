import type { Metadata } from 'next'
import TierCreateForm from './TierCreateForm'

export const metadata: Metadata = { title: 'Add Membership Tier' }

export default function NewTierPage() {
  return <TierCreateForm />
}
