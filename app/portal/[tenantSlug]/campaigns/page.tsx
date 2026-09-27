import Link from "next/link";
import { notFound } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getPublicCampaigns } from "@/lib/actions/campaigns";
import { formatMoneyCents } from "@/lib/utils";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PortalCampaignsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const result = await getPublicCampaigns(tenantSlug);

  if (!result.ok) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="jg-eyebrow">Community</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Fundraising campaigns</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Donate directly to a campaign, or open one to start your own personal fundraising page for it.
        </p>
      </div>

      {result.data.length === 0 ? (
        <EmptyState title="No campaigns open right now" description="Check back soon, or ask the organizer directly." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((campaign) => {
            const pct = campaign.goalCents ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100)) : null;
            return (
              <Link key={campaign.id} href={`/portal/${tenantSlug}/campaigns/${campaign.slug}`} className="jg-card block p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <p className="mt-3 font-bold text-foreground">{campaign.title}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatMoneyCents(campaign.raisedCents)} raised</p>
                {campaign.goalCents ? (
                  <>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">of {formatMoneyCents(campaign.goalCents)} goal</p>
                  </>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  return { title: `${tenantSlug} — Fundraising campaigns` };
}
