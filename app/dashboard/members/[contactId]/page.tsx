import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { ContactEditForm } from "@/components/dashboard/contact-edit-form";
import { ContactTimeline } from "@/components/dashboard/contact-timeline";
import { DigitalMembershipCard } from "@/components/dashboard/digital-membership-card";
import { ContactTagBadges } from "@/components/dashboard/contact-tags-field";
import { CopyEmailButton } from "@/components/dashboard/copy-email-button";
import { DeleteContactButton } from "@/components/dashboard/delete-contact-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { deleteContact, getContactProfile, updateContact } from "@/lib/actions/contacts";
import { categoryForScore, gradeForScore } from "@/lib/leads/scoring";
import { leadCategoryBadgeVariant, lifecycleStageLabel } from "@/lib/leads/labels";
import { listCustomFieldDefinitions } from "@/lib/actions/custom-fields";
import { parseCustomFieldValuesFromForm } from "@/lib/custom-fields/shared";
import { buildContactTimeline } from "@/lib/contacts/timeline";
import {
  contactInterestLabel,
  contactSourceLabel,
  contactTypeLabel,
} from "@/lib/pilot/contact-labels";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";
import { configuredAppUrl } from "@/lib/environment";
import { ensureMembershipVerifyToken } from "@/lib/memberships/verify-token";
import { appleWalletConfigured, googleWalletConfigured } from "@/lib/wallet/config";
import { isPro } from "@/lib/plans/gate";

function statusBadgeVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "ACTIVE" || status === "CONFIRMED" || status === "ATTENDED" || status === "PAID") return "success";
  if (status === "PENDING" || status === "PENDING_PAYMENT") return "warning";
  if (status === "EXPIRED" || status === "FAILED" || status === "NO_SHOW") return "danger";
  return "default";
}

function contactTypeBadgeVariant(type: string): "brand" | "success" | "warning" | "default" {
  if (type === "MEMBER") return "brand";
  if (type === "DONOR") return "success";
  if (type === "VOLUNTEER") return "warning";
  return "default";
}

export default async function ContactProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ contactId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { contactId } = await params;
  const query = await searchParams;
  const [resolution, result, customFieldsResult] = await Promise.all([
    resolveTenantForDashboard(),
    getContactProfile(contactId),
    listCustomFieldDefinitions(),
  ]);
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  if (!result.ok || !result.data) {
    notFound();
  }

  const contact = result.data;
  const activeCustomFields = customFieldsResult.ok
    ? customFieldsResult.data.filter((def: { active: boolean }) => def.active)
    : [];

  async function updateContactAction(formData: FormData) {
    "use server";

    const id = String(formData.get("contactId") ?? "").trim();
    const tenantHint = readTenantIdHintFromForm(formData);
    const definitions = (await listCustomFieldDefinitions()).data;
    const updateResult = await updateContact(
      {
        contactId: id,
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        type: String(formData.get("type") ?? "OTHER"),
        notes: String(formData.get("notes") ?? ""),
        tags: String(formData.get("tags") ?? ""),
        directoryOptIn: formData.get("directoryOptIn") === "1",
        customFieldValues: parseCustomFieldValuesFromForm(definitions, formData),
      },
      { tenantIdHint: tenantHint },
    );

    if (!updateResult.ok) {
      const errorMessage = "error" in updateResult && updateResult.error ? updateResult.error : "Failed to update";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/members/${id}?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/members/${id}?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, `/dashboard/members/${id}?success=updated`);
    }
    redirect(`/dashboard/members/${id}?success=updated`);
  }

  async function deleteContactAction(formData: FormData) {
    "use server";

    const id = String(formData.get("contactId") ?? "").trim();
    const tenantHint = readTenantIdHintFromForm(formData);
    const deleteResult = await deleteContact(id, { tenantIdHint: tenantHint });
    if (!deleteResult.ok) {
      const errorMessage = "error" in deleteResult && deleteResult.error ? deleteResult.error : "Failed to delete";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/members/${id}?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/members/${id}?error=${encodeURIComponent(errorMessage)}`);
    }
    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, "/dashboard/members?success=deleted");
    }
    redirect("/dashboard/members?success=deleted");
  }

  const activeMemberships = contact.memberships.filter((membership) => membership.status === "ACTIVE");
  const primaryActiveMembership = activeMemberships[0];

  let membershipCardProps: {
    verifyUrl: string;
    qrDataUrl: string;
    appleWalletHref: string | null;
    googleWalletHref: string | null;
  } | null = null;
  if (primaryActiveMembership) {
    const token = await ensureMembershipVerifyToken(primaryActiveMembership.id);
    const verifyUrl = `${configuredAppUrl()}/api/membership-verify?token=${token}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 160, margin: 1 });
    membershipCardProps = {
      verifyUrl,
      qrDataUrl,
      appleWalletHref: appleWalletConfigured() && tenant && isPro(tenant) ? `/api/wallet/apple?token=${token}` : null,
      googleWalletHref: googleWalletConfigured() && tenant && isPro(tenant) ? `/api/wallet/google?token=${token}` : null,
    };
  }

  const paidTotal = contact.payments
    .filter((payment) => payment.status === "PAID" || payment.status === "WAIVED")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const pendingTotal = contact.payments
    .filter((payment) => payment.status === "PENDING")
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="People"
        title={`${contact.firstName} ${contact.lastName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <a href={`mailto:${contact.email}`} className="font-medium text-primary hover:text-foreground">
              {contact.email}
            </a>
            <CopyEmailButton email={contact.email} />
          </span>
        }
        actions={<ButtonLink href="/dashboard/members" variant="secondary" size="sm">Back to contacts</ButtonLink>}
      />

      {query.error && <Alert variant="error">{query.error}</Alert>}
      {query.success === "updated" && <Alert variant="success">Contact updated.</Alert>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Card>
          <CardBody className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{contact.phone ?? "No phone on file"}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={contactTypeBadgeVariant(contact.type)}>{contactTypeLabel(contact.type)}</Badge>
                  {contact.interestType && (
                    <Badge variant="default">{contactInterestLabel(contact.interestType)}</Badge>
                  )}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 md:min-w-[520px]">
                <StatCard label="Active memberships" value={String(activeMemberships.length)} />
                <StatCard label="Paid / waived" value={formatCents(paidTotal)} />
                <StatCard label="Pending" value={formatCents(pendingTotal)} />
                <StatCard
                  label="Lead score"
                  value={`${contact.leadScore} · ${gradeForScore(contact.leadScore)}`}
                />
              </div>
            </div>

            <dl className="grid gap-3 text-sm md:grid-cols-3">
              <ProfileRow label="Source">{contactSourceLabel(contact.source)}</ProfileRow>
              <ProfileRow label="First seen">{formatDate(contact.createdAt)}</ProfileRow>
              <ProfileRow label="Last activity">
                {contact.lastActivityAt ? formatRelativeTime(contact.lastActivityAt) : "None"}
              </ProfileRow>
              <ProfileRow label="Lifecycle stage">
                <Badge variant={leadCategoryBadgeVariant[categoryForScore(contact.leadScore)]}>
                  {lifecycleStageLabel[contact.lifecycleStage] ?? contact.lifecycleStage}
                </Badge>
                <span className="ml-2 text-muted-foreground">{categoryForScore(contact.leadScore)} lead</span>
              </ProfileRow>
              {(contact.utmSource || contact.utmMedium || contact.utmCampaign) && (
                <ProfileRow label="First-touch attribution">
                  {[contact.utmSource, contact.utmMedium, contact.utmCampaign].filter(Boolean).join(" / ")}
                </ProfileRow>
              )}
              {contact.referredByCode && (
                <ProfileRow label="Referred by">
                  <Link href="/dashboard/referrals" className="font-medium text-primary hover:text-foreground">
                    {contact.referredByCode}
                  </Link>
                </ProfileRow>
              )}
              <ProfileRow label="Community">{contact.tenant.slug}</ProfileRow>
              <ProfileRow label="Tags">
                <ContactTagBadges tags={contact.tags} />
              </ProfileRow>
              <ProfileRow label="Household">
                {contact.household ? (
                  <Link href={`/dashboard/families/${contact.household.id}`} className="font-medium text-primary hover:text-foreground">
                    {contact.household.name}
                  </Link>
                ) : (
                  <Link href="/dashboard/families" className="text-muted-foreground hover:text-primary">
                    Not in a household
                  </Link>
                )}
              </ProfileRow>
              {activeCustomFields.map((def: { key: string; label: string }) => {
                const raw = (contact.customFieldValues as Record<string, unknown> | null)?.[def.key];
                return (
                  <ProfileRow key={def.key} label={def.label}>
                    {raw === undefined || raw === null || raw === "" ? (
                      <span className="text-muted-foreground">Not set</span>
                    ) : (
                      String(raw)
                    )}
                  </ProfileRow>
                );
              })}
            </dl>

            {contact.notes && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Admin notes</p>
                <p className="mt-1 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            <form action={deleteContactAction} className="border-t border-border/70 pt-4">
              {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
              <DeleteContactButton
                contactId={contact.id}
                displayName={`${contact.firstName} ${contact.lastName}`}
                label="Delete this contact"
              />
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Quick links</h2>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/dashboard/renewals" className="font-medium text-primary hover:text-foreground">
                Membership renewals
              </Link>
              <Link href="/dashboard/tiers" className="font-medium text-primary hover:text-foreground">
                Membership tiers
              </Link>
              <Link href="/dashboard/events" className="font-medium text-primary hover:text-foreground">
                Events
              </Link>
              <Link href="/dashboard/payments" className="font-medium text-primary hover:text-foreground">
                All payments
              </Link>
            </nav>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="text-base font-bold text-foreground">Activity timeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every touchpoint with {contact.firstName} in one chronological view — import, registrations, payments, and
            messages.
          </p>
          <div className="mt-5">
            <ContactTimeline events={buildContactTimeline(contact)} />
          </div>
        </CardBody>
      </Card>

      {primaryActiveMembership && membershipCardProps && (
        <DigitalMembershipCard
          contactName={`${contact.firstName} ${contact.lastName}`}
          membership={{
            id: primaryActiveMembership.id,
            status: primaryActiveMembership.status,
            expiresAt: primaryActiveMembership.expiresAt,
            tier: primaryActiveMembership.tier,
            tenant: contact.tenant,
          }}
          {...membershipCardProps}
        />
      )}

      {tenant && (
        <ContactEditForm
          tenantId={tenant.id}
          contact={contact}
          customFieldDefinitions={activeCustomFields}
          action={updateContactAction}
        />
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Memberships">
          {contact.memberships.length === 0 ? (
            <UiEmptyState title="No formal memberships yet." />
          ) : (
            <div className="space-y-3">
              {contact.memberships.map((membership) => (
                <article key={membership.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{membership.tier.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCents(membership.tier.amountCents)} / {membership.tier.interval.toLowerCase()}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(membership.status)}>{membership.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Starts {formatDate(membership.startsAt)}
                    {membership.expiresAt ? ` · Expires ${formatDate(membership.expiresAt)}` : " · No expiration"}
                  </p>
                  {membership.payments.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-foreground/80">
                      {membership.payments.map((payment) => (
                        <li key={payment.id}>
                          {formatCents(payment.amountCents)} · {payment.status} · {payment.method.replace(/_/g, " ")}
                          {payment.receipt ? ` · ${payment.receipt.receiptNumber}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Event history">
          {contact.registrations.length === 0 ? (
            <UiEmptyState title="No event registrations yet." />
          ) : (
            <div className="space-y-3">
              {contact.registrations.map((registration) => (
                <article key={registration.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{registration.event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(registration.event.startsAt)}</p>
                    </div>
                    <Badge variant={statusBadgeVariant(registration.status)}>{registration.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {registration.ticketType?.name ?? "General admission"} · Qty {registration.quantity} ·{" "}
                    {formatCents(registration.amountCents)}
                  </p>
                  {registration.checkedInAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Checked in {formatRelativeTime(registration.checkedInAt)}
                    </p>
                  )}
                  <Link
                    href={`/dashboard/events/${registration.event.id}/registrations`}
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:text-foreground"
                  >
                    Open event registrations
                  </Link>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel title="Payments & receipts">
        {contact.payments.length === 0 ? (
          <UiEmptyState title="No payments recorded." />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableHeaderCell>When</DataTableHeaderCell>
              <DataTableHeaderCell>Purpose</DataTableHeaderCell>
              <DataTableHeaderCell>Amount</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Receipt</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {contact.payments.map((payment) => (
                <DataTableRow key={payment.id}>
                  <DataTableCell className="text-muted-foreground">
                    {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                  </DataTableCell>
                  <DataTableCell>{payment.purpose}</DataTableCell>
                  <DataTableCell className="font-medium">{formatCents(payment.amountCents)}</DataTableCell>
                  <DataTableCell>
                    <Badge variant={statusBadgeVariant(payment.status)}>{payment.status}</Badge>
                  </DataTableCell>
                  <DataTableCell className="text-xs text-muted-foreground">
                    {payment.receipt ? payment.receipt.receiptNumber : "—"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </Panel>

      <Panel title="Communication outbox">
        {contact.communications.length === 0 ? (
          <UiEmptyState title="No communication messages queued yet." />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableHeaderCell>Created</DataTableHeaderCell>
              <DataTableHeaderCell>Purpose</DataTableHeaderCell>
              <DataTableHeaderCell>Subject</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {contact.communications.map((message) => (
                <DataTableRow key={message.id} className="align-top">
                  <DataTableCell className="text-muted-foreground">{formatRelativeTime(message.createdAt)}</DataTableCell>
                  <DataTableCell>{message.purpose.replace(/_/g, " ")}</DataTableCell>
                  <DataTableCell>
                    <p className="font-medium">{message.subject}</p>
                    <p className="mt-1 max-w-2xl whitespace-pre-wrap text-xs text-muted-foreground">{message.body}</p>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={statusBadgeVariant(message.status)}>{message.status}</Badge>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </Panel>
    </section>
  );
}

function ProfileRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{children}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <div className="mt-3">{children}</div>
      </CardBody>
    </Card>
  );
}
