import { MemberForm } from '@/app/(dashboard)/dashboard/members/_components/member-form'

export default function PreviewMembershipCreatePage() {
  return (
    <main className="p-6">
      <MemberForm tiers={[]} />
    </main>
  )
}
