import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const tenant = await getTenant()
  if (tenant) {
    redirect('/dashboard')
  }

  return <OnboardingClient />
}

