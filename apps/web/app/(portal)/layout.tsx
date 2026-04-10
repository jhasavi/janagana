import { requireMember } from '@/lib/auth';
import { MemberPortalLayout } from '@/components/layout/MemberPortalLayout';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireMember();

  return (
    <MemberPortalLayout>{children}</MemberPortalLayout>
  );
}
