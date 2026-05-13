import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicTenantForJoin } from '@/lib/actions/portal'
import { JoinForm } from './_components/join-form'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublicTenantForJoin(slug)
  if (!data) return { title: 'Join' }
  return { title: `Join ${data.tenant.name}` }
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getPublicTenantForJoin(slug)
  if (!data) notFound()

  const { tenant, tiers } = data

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <JoinForm
          slug={slug}
          orgName={tenant.name}
          primaryColor={tenant.primaryColor || '#4f46e5'}
          tiers={tiers}
        />
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            Already a member?{' '}
            <a href={`/portal/${slug}`} className="underline underline-offset-2">
              Sign in to your portal
            </a>
          </p>
          <p>
            Looking for events first?{' '}
            <a href={`/events/${slug}`} className="underline underline-offset-2">
              View public events
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
