import Link from "next/link";
import Image from "next/image";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { configuredAppUrl } from "@/lib/environment";
import { formatDate } from "@/lib/utils";

type ActiveMembership = {
  id: string;
  status: string;
  expiresAt: Date | null;
  tier: { name: string; interval: string };
  tenant: { slug: string; name: string };
};

export function DigitalMembershipCard({
  contactName,
  membership,
}: {
  contactName: string;
  membership: ActiveMembership;
}) {
  const verifyUrl = `${configuredAppUrl()}/api/membership-verify?membershipId=${membership.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Digital membership card</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{contactName}</h3>
            <p className="text-sm text-muted-foreground">{membership.tenant.name}</p>
          </div>
          <Badge variant="brand">{membership.status}</Badge>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Plan</dt>
            <dd className="font-medium">{membership.tier.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Billing</dt>
            <dd className="font-medium">{membership.tier.interval.toLowerCase()}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Valid through</dt>
            <dd className="font-medium">{membership.expiresAt ? formatDate(membership.expiresAt) : "No expiration"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Card ID</dt>
            <dd className="font-mono text-xs">{membership.id.slice(0, 12)}…</dd>
          </div>
        </dl>

        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-start">
          <Image
            src={qrUrl}
            alt="Membership QR code"
            width={160}
            height={160}
            unoptimized
            className="rounded-lg bg-white p-2"
          />
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-foreground">Scan at check-in</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Event staff can verify this member without Apple Wallet — Phase 1 card for demos.
            </p>
            <Link href={verifyUrl} className="mt-2 inline-block text-xs font-semibold text-primary hover:text-foreground">
              Open verify link
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
