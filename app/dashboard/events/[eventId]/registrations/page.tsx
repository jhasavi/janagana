import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  cancelEventRegistration,
  checkInEventRegistration,
  confirmEventRegistration,
  listEventRegistrations,
  markEventRegistrationNoShow,
} from "@/lib/actions/events";
import { publicRegisterUrl } from "@/lib/pilot/tenants";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

export default async function EventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const result = await listEventRegistrations(eventId);

  if (!result.ok || !result.event) {
    notFound();
  }

  const registerUrl =
    tenant && result.event.status === "PUBLISHED"
      ? publicRegisterUrl(tenant.slug, result.event.slug)
      : null;

  async function cancelRegistrationAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const actionResult = await cancelEventRegistration(
      { eventId, registrationId },
      { tenantIdHint: tenantHint }
    );

    if (!actionResult.ok) {
      const errorMessage = actionResult.error ?? "Failed to cancel registration";
      if (tenantHint) {
        redirectWithActiveTenant(
          tenantHint,
          `/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`
        );
      }
      redirect(`/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(
        tenantHint,
        `/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration canceled")}`
      );
    }
    redirect(`/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration canceled")}`);
  }

  async function confirmRegistrationAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const actionResult = await confirmEventRegistration(
      { eventId, registrationId },
      { tenantIdHint: tenantHint }
    );

    if (!actionResult.ok) {
      const errorMessage = actionResult.error ?? "Failed to confirm registration";
      if (tenantHint) {
        redirectWithActiveTenant(
          tenantHint,
          `/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`
        );
      }
      redirect(`/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(
        tenantHint,
        `/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration confirmed")}`
      );
    }
    redirect(`/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration confirmed")}`);
  }

  async function checkInRegistrationAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const actionResult = await checkInEventRegistration(
      { eventId, registrationId },
      { tenantIdHint: tenantHint }
    );

    if (!actionResult.ok) {
      const errorMessage = actionResult.error ?? "Failed to check in attendee";
      if (tenantHint) {
        redirectWithActiveTenant(
          tenantHint,
          `/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`
        );
      }
      redirect(`/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(
        tenantHint,
        `/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Attendee checked in")}`
      );
    }
    redirect(`/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Attendee checked in")}`);
  }

  async function noShowRegistrationAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const actionResult = await markEventRegistrationNoShow(
      { eventId, registrationId },
      { tenantIdHint: tenantHint }
    );

    if (!actionResult.ok) {
      const errorMessage = actionResult.error ?? "Failed to mark no-show";
      if (tenantHint) {
        redirectWithActiveTenant(
          tenantHint,
          `/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`
        );
      }
      redirect(`/dashboard/events/${eventId}/registrations?error=${encodeURIComponent(errorMessage)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(
        tenantHint,
        `/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration marked no-show")}`
      );
    }
    redirect(`/dashboard/events/${eventId}/registrations?success=${encodeURIComponent("Registration marked no-show")}`);
  }

  const confirmedCount = result.data
    .filter((reg) => reg.status === "CONFIRMED" || reg.status === "ATTENDED")
    .reduce((sum, reg) => sum + reg.quantity, 0);
  const pendingPaymentCount = result.data
    .filter((reg) => reg.status === "PENDING_PAYMENT")
    .reduce((sum, reg) => sum + reg.quantity, 0);
  const attendedCount = result.data
    .filter((reg) => reg.status === "ATTENDED")
    .reduce((sum, reg) => sum + reg.quantity, 0);
  const totalCount = result.data.reduce((sum, reg) => sum + reg.quantity, 0);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Programs"
        title="Event registrations"
        description={result.event.title}
        actions={
          <>
            <ButtonLink href="/dashboard/events" variant="secondary" size="sm">Back to events</ButtonLink>
            <a
              href={`/api/export/events/${eventId}/registrations`}
              className="inline-flex h-8 items-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/60"
            >
              Export CSV
            </a>
          </>
        }
      />

      <Card>
        <CardBody className="space-y-3">
        <p className="text-sm text-muted-foreground">{formatDate(result.event.startsAt)}</p>
        <p className="mt-2 text-sm">
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
              result.event.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-700"
            }`}
          >
            {result.event.status === "PUBLISHED" ? "Published" : "Draft — not on portal"}
          </span>
          <span className="ml-2 text-gray-600">
            {confirmedCount} confirmed
            {totalCount !== confirmedCount ? ` (${totalCount} total)` : ""}
            {pendingPaymentCount > 0 ? ` · ${pendingPaymentCount} pending payment` : ""}
            {attendedCount > 0 ? ` · ${attendedCount} checked in` : ""}
          </span>
        </p>
        {registerUrl && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-foreground">Share this registration link</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{registerUrl}</p>
            <div className="mt-2 flex gap-2">
              <CopyTextButton text={registerUrl} label="Copy register link" />
              <a href={registerUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:text-foreground">
                Open in portal ↗
              </a>
            </div>
          </div>
        )}
        {result.event.status !== "PUBLISHED" && tenant && (
          <Alert variant="warning">
            This event is not published — visitors cannot register until you set status to Published on the Events page.
          </Alert>
        )}
        </CardBody>
      </Card>

      {query.error && <Alert variant="error">{query.error}</Alert>}
      {query.success && <Alert variant="success">{query.success}</Alert>}

      <p className="text-sm text-muted-foreground">
        Each row should also appear under{" "}
        <Link href="/dashboard/members" className="font-semibold text-primary hover:text-foreground">
          Contacts & leads
        </Link>{" "}
        with intent Event registration.
      </p>

      <Card>
        <CardBody>
        {result.data.length === 0 ? (
          <EmptyState
            title="No registrations yet"
            description="Test in incognito: open the register link above, submit a unique email, then refresh this page and Contacts."
            action={
              registerUrl ? (
                <a href={registerUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:text-foreground break-all">
                  {registerUrl}
                </a>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Registrant</th>
                  <th className="py-2 pr-4">Ticket</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2 pr-4">Registered</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((reg) => (
                  <tr key={reg.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">
                        {reg.contact.firstName} {reg.contact.lastName}
                      </p>
                      <p className="text-gray-600">{reg.contact.email}</p>
                      <p className="text-xs text-gray-500">{reg.contact.phone ?? "No phone"}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{reg.ticketType?.name ?? "General admission"}</p>
                      <p className="text-xs text-gray-500">
                        Qty {reg.quantity} · {formatCents(reg.amountCents)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">{reg.status}</span>
                      {reg.checkedInAt && (
                        <p className="mt-1 text-xs text-gray-500">Checked in {formatRelativeTime(reg.checkedInAt)}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {reg.payments.length === 0 ? (
                        <span className="text-xs text-gray-500">{reg.amountCents > 0 ? "No payment record" : "Free"}</span>
                      ) : (
                        <ul className="space-y-1">
                          {reg.payments.map((payment) => (
                            <li key={payment.id} className="text-xs text-gray-700">
                              <span className="font-medium">{formatCents(payment.amountCents)}</span>
                              {" · "}
                              {payment.status}
                              {" · "}
                              {payment.method.replace(/_/g, " ")}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600" title={formatDate(reg.createdAt)}>
                      {formatRelativeTime(reg.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col items-start gap-1">
                        {(reg.status === "PENDING_PAYMENT" || reg.status === "CANCELED" || reg.status === "NO_SHOW") && (
                          <form action={confirmRegistrationAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="registrationId" value={reg.id} />
                            <button type="submit" className="text-xs text-blue-700 hover:underline">
                              Mark confirmed
                            </button>
                          </form>
                        )}
                        {reg.status === "CONFIRMED" && (
                          <form action={checkInRegistrationAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="registrationId" value={reg.id} />
                            <button type="submit" className="text-xs text-emerald-700 hover:underline">
                              Check in
                            </button>
                          </form>
                        )}
                        {(reg.status === "CONFIRMED" || reg.status === "PENDING_PAYMENT") && (
                          <form action={noShowRegistrationAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="registrationId" value={reg.id} />
                            <button type="submit" className="text-xs text-amber-700 hover:underline">
                              Mark no-show
                            </button>
                          </form>
                        )}
                        {reg.status !== "CANCELED" && (
                          <form action={cancelRegistrationAction}>
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="registrationId" value={reg.id} />
                            <button type="submit" className="text-xs text-red-700 hover:underline">
                              Cancel registration
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </CardBody>
      </Card>
    </section>
  );
}
