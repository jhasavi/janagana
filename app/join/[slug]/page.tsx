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
          primaryColor={tenant.primaryColor}
          tiers={tiers}
        />
        <p className="text-center text-xs text-muted-foreground">
          Already a member?{' '}
          <a href={`/portal/${slug}`} className="underline underline-offset-2">
            Sign in to your portal
          </a>
        </p>
      </div>
    </div>
  )
}
