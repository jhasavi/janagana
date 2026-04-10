import { requireMember } from '@/lib/auth';
import { MemberPublicProfileCard } from '@/components/portal/MemberPublicProfileCard';

interface Props {
  params: { memberId: string };
}

export default async function MemberPublicProfilePage({ params }: Props) {
  await requireMember();

  return <MemberPublicProfileCard memberId={params.memberId} />;
}
