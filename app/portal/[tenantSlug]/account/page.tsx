import { redirect } from "next/navigation";
import { CalendarClock, LogOut, ShieldCheck, User } from "lucide-react";
import { ContactTimeline } from "@/components/dashboard/contact-timeline";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField, FormGrid, Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { getCurrentMemberContact, signOutMember, updateMemberProfile } from "@/lib/actions/member-auth";
import { getMemberAccountData } from "@/lib/portal/member-account";
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
  searchParams: Promise<{ status?: string }>;
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
