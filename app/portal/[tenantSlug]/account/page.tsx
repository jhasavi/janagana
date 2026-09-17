import { redirect } from "next/navigation";
import { CalendarClock, LogOut, ShieldCheck, User, Users, UserPlus, X } from "lucide-react";
import { ContactTimeline } from "@/components/dashboard/contact-timeline";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField, FormGrid, Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { getCurrentMemberContact, signOutMember, updateMemberProfile } from "@/lib/actions/member-auth";
import { cancelHouseholdInvite, getMyHousehold, inviteHouseholdMember } from "@/lib/actions/household-invites";
import { getMyReferralCodes } from "@/lib/actions/referrals";
import { getMemberAccountData } from "@/lib/portal/member-account";
import { publicPortalUrl } from "@/lib/environment";
import { formatCents, formatDate } from "@/lib/utils";

const MEMBERSHIP_TONE: Record<string, "success" | "warning" | "danger" | "default"> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRED: "danger",
  CANCELED: "default",
  INACTIVE: "default",
};

export default async function MemberAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const current = await getCurrentMemberContact(tenantSlug);

  if (!current) {
    redirect(`/portal/${tenantSlug}/account/sign-in`);
  }

  const account = await getMemberAccountData(current.contact.id);
  if (!account) {
    redirect(`/portal/${tenantSlug}/account/sign-in`);
  }

  const household = await getMyHousehold(tenantSlug);
  const myReferralCodes = await getMyReferralCodes(tenantSlug);
  const referralCodes = myReferralCodes.ok ? myReferralCodes.data : [];

  async function updateProfileAction(formData: FormData) {
    "use server";

    await updateMemberProfile({
      tenantSlug,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });

    redirect(`/portal/${tenantSlug}/account?status=profile-updated`);
  }

  async function signOutAction() {
    "use server";
    await signOutMember(tenantSlug);
    redirect(`/portal/${tenantSlug}`);
  }

  async function inviteAction(formData: FormData) {
    "use server";
    const result = await inviteHouseholdMember({
      tenantSlug,
      email: String(formData.get("email") ?? ""),
    });
    if (!result.ok) {
      redirect(`/portal/${tenantSlug}/account?error=${encodeURIComponent(result.error)}#household`);
    }
    redirect(`/portal/${tenantSlug}/account?status=invite-sent#household`);
  }

  async function cancelInviteAction(formData: FormData) {
    "use server";
    const inviteId = String(formData.get("inviteId") ?? "");
    await cancelHouseholdInvite({ tenantSlug, inviteId });
    redirect(`/portal/${tenantSlug}/account?status=invite-canceled#household`);
  }

  const { contact, activeMembership, timeline } = account;
  const isExpired = activeMembership?.expiresAt ? activeMembership.expiresAt < new Date() : false;
  const membershipStatusLabel = activeMembership
    ? isExpired && activeMembership.status === "ACTIVE"
      ? "EXPIRED"
      : activeMembership.status
    : "NONE";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">My account</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {contact.firstName} {contact.lastName}
          </h1>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>

      {query.status === "profile-updated" && <Alert variant="success">Your profile has been updated.</Alert>}
      {query.status === "household-joined" && <Alert variant="success">You&apos;ve joined the household.</Alert>}
      {query.status === "invite-sent" && <Alert variant="success">Invite sent — they&apos;ll get an email to confirm.</Alert>}
      {query.status === "invite-canceled" && <Alert variant="success">Invite canceled.</Alert>}
      {query.error && <Alert variant="error">{query.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Membership status"
          value={activeMembership ? activeMembership.tier.name : "No membership"}
          detail={
            activeMembership
              ? `${membershipStatusLabel}${activeMembership.expiresAt ? ` · expires ${formatDate(activeMembership.expiresAt)}` : ""}`
              : "Join to get started"
          }
          icon={ShieldCheck}
          tone={activeMembership && !isExpired && activeMembership.status === "ACTIVE" ? "success" : "warning"}
        />
        <StatCard
          label="Auto-renew"
          value={activeMembership?.autoRenew ? "On" : "Off"}
          detail={
            activeMembership
              ? `${formatCents(activeMembership.tier.amountCents)} / ${activeMembership.tier.interval.toLowerCase()}`
              : undefined
          }
          icon={CalendarClock}
        />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Membership</h2>
          {activeMembership && (
            <Badge variant={MEMBERSHIP_TONE[membershipStatusLabel] ?? "default"}>{membershipStatusLabel}</Badge>
          )}
        </CardHeader>
        <CardBody className="space-y-4">
          {activeMembership ? (
            <p className="text-sm text-muted-foreground">
              You&rsquo;re enrolled in <span className="font-semibold text-foreground">{activeMembership.tier.name}</span>.
              {activeMembership.expiresAt
                ? ` This membership expires on ${formatDate(activeMembership.expiresAt)}.`
                : " This membership doesn't expire."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">You don&apos;t have a membership yet.</p>
          )}
          <ButtonLink
            href={
              activeMembership
                ? `/portal/${tenantSlug}/join?tierId=${activeMembership.tier.id}`
                : `/portal/${tenantSlug}/join`
            }
          >
            {activeMembership ? "Renew membership" : "Join now"}
          </ButtonLink>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-foreground">Your details</h2>
        </CardHeader>
        <CardBody>
          <form action={updateProfileAction} className="space-y-4">
            <FormGrid>
              <FormField label="First name">
                <Input name="firstName" defaultValue={contact.firstName} required />
              </FormField>
              <FormField label="Last name">
                <Input name="lastName" defaultValue={contact.lastName} required />
              </FormField>
            </FormGrid>
            <FormField label="Email">
              <Input defaultValue={contact.email} disabled />
            </FormField>
            <FormField label="Phone">
              <Input name="phone" type="tel" defaultValue={contact.phone ?? ""} />
            </FormField>
            <Button type="submit" variant="secondary">
              <User className="h-4 w-4" />
              Save changes
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card id="household">
        <CardHeader>
          <h2 className="text-base font-bold text-foreground">Household</h2>
        </CardHeader>
        <CardBody className="space-y-5">
          {household.ok && household.data ? (
            <>
              <div>
                <p className="text-sm font-medium text-foreground">{household.data.name}</p>
                <ul className="mt-2 divide-y divide-border/70">
                  {household.data.members.map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-foreground">
                        {member.firstName} {member.lastName}
                        {household.data!.payerContactId === member.id && (
                          <Badge variant="brand" className="ml-2">Payer</Badge>
                        )}
                        {member.id === contact.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {household.data.invites.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending invites</p>
                  <ul className="mt-2 divide-y divide-border/70">
                    {household.data.invites.map((invite) => (
                      <li key={invite.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                          {invite.inviteeEmail} · expires {formatDate(invite.expiresAt)}
                        </span>
                        <form action={cancelInviteAction}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">You&apos;re not part of a household yet.</p>
          )}

          <form action={inviteAction} className="flex flex-wrap items-end gap-2 border-t border-border/70 pt-4">
            <FormField label="Add a family member" className="flex-1 min-w-[220px]">
              <Input type="email" name="email" placeholder="their@email.com" required />
            </FormField>
            <Button type="submit" variant="secondary">
              <UserPlus className="h-4 w-4" />
              Send invite
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" />
            We&apos;ll email them a link to confirm — nothing changes until they accept.
          </p>
        </CardBody>
      </Card>

      {referralCodes.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-bold text-foreground">Referral program</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share your link — everyone who joins through it is tracked here, and we&apos;ll show you when they
              become a member or donor.
            </p>
            {referralCodes.map((code) => {
              const joinLink = `${publicPortalUrl(tenantSlug)}/join?ref=${code.code}`;
              return (
                <div key={code.id} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground">{code.code}</p>
                      {code.label && <p className="text-xs text-muted-foreground">{code.label}</p>}
                    </div>
                    {!code.active && <Badge variant="default">Archived</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <code className="rounded-lg bg-card px-3 py-1.5 text-xs text-foreground">{joinLink}</code>
                    <CopyTextButton text={joinLink} label="Copy link" />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>
                      <span className="font-bold text-foreground">{code.redemptionCount}</span>{" "}
                      <span className="text-muted-foreground">joined</span>
                    </span>
                    <span>
                      <span className="font-bold text-foreground">{code.convertedCount}</span>{" "}
                      <span className="text-muted-foreground">became members/donors</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-foreground">Activity</h2>
        </CardHeader>
        <CardBody>
          <ContactTimeline events={timeline} />
        </CardBody>
      </Card>
    </div>
  );
}
