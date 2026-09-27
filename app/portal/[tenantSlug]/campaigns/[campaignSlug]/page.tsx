import Link from "next/link";
import { notFound } from "next/navigation";
import { HeartHandshake, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getPublicCampaign } from "@/lib/actions/campaigns";
import { formatMoneyCents } from "@/lib/utils";

interface Props {
  params: Promise<{ tenantSlug: string; campaignSlug: string }>;
}

export default async function PortalCampaignPage({ params }: Props) {
  const { tenantSlug, campaignSlug } = await params;
  const result = await getPublicCampaign(tenantSlug, campaignSlug);

  if (!result.ok || !result.data) {
    notFound();
  }

  const campaign = result.data;
  const pct = campaign.goalCents ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100)) : null;

  return (
    <section className="space-y-6">
      <div>
        <p className="jg-eyebrow">Campaign</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{campaign.title}</h2>
        {campaign.description && (
          <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-6 text-muted-foreground">{campaign.description}</p>
        )}
      </div>

      <div className="jg-card p-5 sm:p-6">
        <p className="text-2xl font-extrabold text-foreground">{formatMoneyCents(campaign.raisedCents)} raised</p>
        {campaign.goalCents ? (
          <>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">of {formatMoneyCents(campaign.goalCents)} goal · {pct}%</p>
          </>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={`/portal/${tenantSlug}/donate?campaignSlug=${campaign.slug}`} size="lg">
            Donate to this campaign
          </ButtonLink>
          <ButtonLink href={`/portal/${tenantSlug}/fundraise/new?campaign=${campaign.id}`} variant="secondary" size="lg">
            Start your own fundraising page
          </ButtonLink>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground">Supporter fundraising pages</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These are personal pages people made to raise money for this campaign among their own friends and family.
        </p>

        {campaign.fundraisers.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No fundraising pages yet"
              description="Be the first — start your own page above and share your link."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campaign.fundraisers.map((fundraiser) => {
              const fundraiserPct = fundraiser.goalCents
                ? Math.min(100, Math.round((fundraiser.raisedCents / fundraiser.goalCents) * 100))
                : null;
              return (
                <Link key={fundraiser.id} href={`/portal/${tenantSlug}/fundraise/${fundraiser.slug}`} className="jg-card block p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-bold text-foreground">
                    {fundraiser.title || `${fundraiser.owner.firstName} ${fundraiser.owner.lastName}`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMoneyCents(fundraiser.raisedCents)} raised</p>
                  {fundraiser.goalCents ? (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${fundraiserPct}%` }} />
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <HeartHandshake className="h-4 w-4" />
        100% of every donation goes to {result.tenant.name} — JanaGana charges no platform fee.
      </p>
    </section>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug, campaignSlug } = await params;
  return { title: `${campaignSlug} — ${tenantSlug} fundraising campaign` };
}
