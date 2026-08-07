import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PortalFlowLayout } from "@/components/portal/portal-flow-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import {
  acceptHouseholdInvite,
  declineHouseholdInvite,
  getHouseholdInviteByToken,
} from "@/lib/actions/household-invites";

export default async function HouseholdInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { tenantSlug, token } = await params;
  const query = await searchParams;

  const lookup = await getHouseholdInviteByToken(tenantSlug, token);

  async function acceptAction(formData: FormData) {
    "use server";
    const result = await acceptHouseholdInvite({
      tenantSlug,
      token,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
    });
    if (!result.ok) {
      redirect(`/portal/${tenantSlug}/household-invite/${token}?error=${encodeURIComponent(result.error)}`);
    }
    redirect(`/portal/${result.tenantSlug}/account?status=household-joined`);
  }

  async function declineAction() {
    "use server";
    await declineHouseholdInvite({ tenantSlug, token });
    redirect(`/portal/${tenantSlug}?status=invite-declined`);
  }

  if (!lookup.ok || !lookup.data) {
    return (
      <PortalFlowLayout icon={<Users className="h-5 w-5" />} eyebrow="Household invite" title="Invite not available">
        <Alert variant="error">{lookup.error ?? "This invite link is invalid."}</Alert>
      </PortalFlowLayout>
    );
  }

  const { tenant, invite, existingContact, alreadyInAnotherHousehold } = lookup.data;
  const inviterName = `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`.trim();
  const needsName = !existingContact;

  return (
    <PortalFlowLayout
      icon={<Users className="h-5 w-5" />}
      eyebrow="Household invite"
      title={`Join ${invite.household.name}`}
      description={`${inviterName} invited you (${invite.inviteeEmail}) to join their household on ${tenant.name}.`}
    >
      {query.error && (
        <Alert variant="error" className="mb-6">
          {query.error}
        </Alert>
      )}

      {alreadyInAnotherHousehold ? (
        <Alert variant="warning">
          This email is already part of a different household on {tenant.name}. Ask an organizer to move it if that&apos;s a
          mistake.
        </Alert>
      ) : (
        <div className="space-y-6">
          <form action={acceptAction} className="space-y-4">
            {needsName && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="First name">
                  <Input name="firstName" required autoFocus />
                </FormField>
                <FormField label="Last name">
                  <Input name="lastName" required />
                </FormField>
              </div>
            )}
            <Button type="submit">Join household</Button>
          </form>
          <form action={declineAction}>
            <Button type="submit" variant="ghost" size="sm">
              No thanks, decline
            </Button>
          </form>
        </div>
      )}
    </PortalFlowLayout>
  );
}
