import { redirect } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { PortalFlowLayout } from "@/components/portal/portal-flow-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { getCurrentMemberContact } from "@/lib/actions/member-auth";
import { createPeerFundraiser } from "@/lib/actions/peer-fundraisers";
import { getTenantBySlug } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ campaign?: string; error?: string }>;
}

export default async function NewPeerFundraiserPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    redirect(`/portal/${tenantSlug}`);
  }

  const current = await getCurrentMemberContact(tenantSlug);

  if (!current) {
    return (
      <PortalFlowLayout
        icon={<HeartHandshake className="h-5 w-5" />}
        eyebrow="Peer-to-peer fundraising"
        title="Sign in to start a fundraising page"
        description="Fundraising pages are tied to your member/donor account so your supporters can find and give to you directly."
        backHref={`/portal/${tenantSlug}/account/sign-in`}
        backLabel="Sign in"
      >
        <Alert variant="warning">
          You need to sign in first. After signing in, come back to the campaign page and choose &quot;Start your own
          fundraising page&quot; again.
        </Alert>
      </PortalFlowLayout>
    );
  }

  const campaigns = query.campaign
    ? [await prisma.campaign.findFirst({ where: { id: query.campaign, tenantId: tenant.id, status: "PUBLISHED" } })].filter(
        (c): c is NonNullable<typeof c> => Boolean(c),
      )
    : await prisma.campaign.findMany({ where: { tenantId: tenant.id, status: "PUBLISHED" }, orderBy: { createdAt: "desc" } });

  if (campaigns.length === 0) {
    return (
      <PortalFlowLayout
        icon={<HeartHandshake className="h-5 w-5" />}
        eyebrow="Peer-to-peer fundraising"
        title="No open campaigns"
        description="There isn't a campaign open for peer-to-peer fundraising right now."
        backHref={`/portal/${tenantSlug}`}
      >
        <Alert variant="warning">Check back once the organizer opens a campaign.</Alert>
      </PortalFlowLayout>
    );
  }

  async function createAction(formData: FormData) {
    "use server";

    const goalDollarsRaw = String(formData.get("goalDollars") ?? "").trim();

    const result = await createPeerFundraiser({
      tenantSlug,
      campaignId: String(formData.get("campaignId") ?? ""),
      title: String(formData.get("title") ?? ""),
      story: String(formData.get("story") ?? ""),
      goalDollars: goalDollarsRaw ? Number(goalDollarsRaw) : undefined,
    });

    if (!result.ok) {
      redirect(`/portal/${tenantSlug}/fundraise/new?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/portal/${tenantSlug}/fundraise/${result.data.slug}`);
  }

  return (
    <PortalFlowLayout
      icon={<HeartHandshake className="h-5 w-5" />}
      eyebrow="Peer-to-peer fundraising"
      title="Start your fundraising page"
      description="Set a personal goal, share your own link, and every gift counts toward the campaign total too."
      backHref={`/portal/${tenantSlug}`}
    >
      {query.error && <Alert variant="error" className="mb-6">{query.error}</Alert>}

      <form action={createAction} className="space-y-4">
        <FormField label="Campaign">
          <select
            name="campaignId"
            required
            defaultValue={query.campaign ?? campaigns[0]?.id}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Page title (optional)">
          <Input name="title" placeholder="e.g. Team Sharma's fundraiser" maxLength={200} />
        </FormField>

        <FormField label="Your story (optional)">
          <Textarea name="story" rows={4} placeholder="Tell people why this matters to you" />
        </FormField>

        <FormField label="Personal goal in USD (optional)">
          <Input name="goalDollars" type="number" min="1" step="1" placeholder="e.g. 500" />
        </FormField>

        <Button type="submit">Create my fundraising page</Button>
      </form>
    </PortalFlowLayout>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  return { title: `${tenantSlug} — Start a fundraising page` };
}
