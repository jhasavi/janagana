import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPortalContext } from '@/lib/actions/portal'
import { MemberProfileForm } from './_components/member-profile-form'

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { slug } = await params
  const ctx = await getPortalContext(slug)

  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-bold">No membership found</h1>
          <p className="text-muted-foreground">
            Your account is not linked to a membership in this organization.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/portal/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Update your personal information
        </p>
      </div>

      <MemberProfileForm member={ctx.member} slug={slug} />
    </div>
  )
}
