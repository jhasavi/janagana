import { notFound } from 'next/navigation'
import { getPortalContext } from '@/lib/actions/portal'
import { SupportRequestForm } from '@/components/help/support-request-form'

export default async function PortalSupportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ctx = await getPortalContext(slug)
  if (!ctx) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Report an issue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Need help with the member portal? Tell us what happened and we&apos;ll follow up.
        </p>
      </div>
      <SupportRequestForm contextLabel={`portal:${ctx.tenant.slug}`} />
    </div>
  )
}
