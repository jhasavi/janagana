import Link from "next/link";
import { ExternalLink, Link2, Settings } from "lucide-react";
import { LinkChip } from "@/components/dashboard/link-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { communityLabel } from "@/lib/pilot/portal-links";
import { tenantMappingStatusLabel, tenantStatusLabel } from "@/lib/tenant/mapping-labels";
import type { MappedTenant } from "@/lib/tenant/tenant-resolver";

export function TenantIdentityCard({
  tenant,
  portalUrl,
  mappingStatus,
  hasClerkMembership,
}: {
  tenant: MappedTenant;
  portalUrl: string;
  mappingStatus: string;
  hasClerkMembership: boolean;
}) {
  const mappingOk = tenant.status === "ACTIVE" && hasClerkMembership;

  return (
    <Card id="tenant-portal-url" className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1fr_20rem]">
        <CardBody className="min-w-0">
          <p className="jg-eyebrow">Your community</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{communityLabel(tenant.slug)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tenant.name}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant={tenant.status === "ACTIVE" ? "success" : "warning"}>
              {tenantStatusLabel(tenant.status)}
            </Badge>
            <Badge variant={mappingOk ? "brand" : "danger"}>{mappingStatus}</Badge>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Contacts, memberships, and registrations shown here belong to this community only.
          </p>
        </CardBody>

        <div className="border-t border-border/70 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.08] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Link2 className="h-4 w-4" />
            Member portal
          </p>
          <LinkChip href={portalUrl} className="mt-3" />
          <div className="mt-4 grid gap-2">
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Open portal
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              <Settings className="h-4 w-4" />
              Branding & links
            </Link>
          </div>
        </div>
      </div>

      <details className="border-t border-border/70 px-5 py-3 text-xs text-muted-foreground sm:px-6">
        <summary className="cursor-pointer font-medium text-foreground/80">Technical details</summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-medium">Community ID</dt>
            <dd className="mt-0.5 break-all font-mono text-foreground/80">{tenant.slug}</dd>
          </div>
          <div>
            <dt className="font-medium">Support reference</dt>
            <dd className="mt-0.5 break-all font-mono text-foreground/80">{tenant.id}</dd>
          </div>
        </dl>
      </details>
    </Card>
  );
}
