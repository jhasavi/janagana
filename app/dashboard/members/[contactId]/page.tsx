import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { DeleteContactButton } from "@/components/dashboard/delete-contact-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { deleteContact, getContactProfile } from "@/lib/actions/contacts";
import { contactSourceLabel, contactTypeLabel, formatContactTags } from "@/lib/pilot/contact-labels";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

function statusClass(status: string) {
  if (status === "ACTIVE" || status === "CONFIRMED" || status === "ATTENDED" || status === "PAID") {
    return "bg-emerald-100 text-emerald-900";
  }
  if (status === "PENDING" || status === "PENDING_PAYMENT") return "bg-amber-100 text-amber-900";
  if (status === "EXPIRED" || status === "FAILED" || status === "NO_SHOW") return "bg-red-100 text-red-900";
  return "bg-gray-100 text-gray-700";
}

export default async function ContactProfilePage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const [resolution, result] = await Promise.all([
    resolveTenantForDashboard(),
    getContactProfile(contactId),
  ]);
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  if (!result.ok || !result.data) {
    notFound();
  }

  const contact = result.data;

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
  const paidTotal = contact.payments
    .filter((payment) => payment.status === "PAID" || payment.status === "WAIVED")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const pendingTotal = contact.payments
    .filter((payment) => payment.status === "PENDING")
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <section className="space-y-5">
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <Link href="/dashboard/members" className="text-sm font-medium text-blue-700 hover:underline">
        ← Back to contacts
      </Link>

      <header className="rounded-md border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Contact profile</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="mt-1 text-sm text-gray-700">{contact.email}</p>
            <p className="text-sm text-gray-500">{contact.phone ?? "No phone"}</p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3 md:min-w-[420px]">
            <Metric label="Active memberships" value={activeMemberships.length} />
            <Metric label="Paid / waived" value={formatCents(paidTotal)} />
            <Metric label="Pending" value={formatCents(pendingTotal)} />
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <ProfileRow label="Type">{contactTypeLabel(contact.type)}</ProfileRow>
          <ProfileRow label="Source">{contactSourceLabel(contact.source)}</ProfileRow>
          <ProfileRow label="First seen">{formatDate(contact.createdAt)}</ProfileRow>
          <ProfileRow label="Last activity">
            {contact.lastActivityAt ? formatRelativeTime(contact.lastActivityAt) : "None"}
          </ProfileRow>
          <ProfileRow label="Tags">{contact.tags.length ? formatContactTags(contact.tags) : "None"}</ProfileRow>
          <ProfileRow label="Tenant">{contact.tenant.slug}</ProfileRow>
        </dl>
        {contact.notes && (
          <div className="mt-4 rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Admin notes</p>
            <p className="mt-1 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
        <form action={deleteContactAction} className="mt-4 border-t border-gray-100 pt-4">
          {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
          <DeleteContactButton
            contactId={contact.id}
            displayName={`${contact.firstName} ${contact.lastName}`}
            label="Delete this contact"
          />
        </form>
      </header>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Memberships">
          {contact.memberships.length === 0 ? (
            <EmptyState>No formal memberships yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {contact.memberships.map((membership) => (
                <article key={membership.id} className="rounded border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{membership.tier.name}</p>
                      <p className="text-xs text-gray-600">
                        {formatCents(membership.tier.amountCents)} / {membership.tier.interval.toLowerCase()}
                      </p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(membership.status)}`}>
                      {membership.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Starts {formatDate(membership.startsAt)}
                    {membership.expiresAt ? ` · Expires ${formatDate(membership.expiresAt)}` : " · No expiration"}
                  </p>
                  {membership.payments.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-700">
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

        <Panel title="Event History">
          {contact.registrations.length === 0 ? (
            <EmptyState>No event registrations yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {contact.registrations.map((registration) => (
                <article key={registration.id} className="rounded border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{registration.event.title}</p>
                      <p className="text-xs text-gray-600">{formatDate(registration.event.startsAt)}</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(registration.status)}`}>
                      {registration.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {registration.ticketType?.name ?? "General admission"} · Qty {registration.quantity} ·{" "}
                    {formatCents(registration.amountCents)}
                  </p>
                  {registration.checkedInAt && (
                    <p className="mt-1 text-xs text-gray-500">Checked in {formatRelativeTime(registration.checkedInAt)}</p>
                  )}
                  <Link
                    href={`/dashboard/events/${registration.event.id}/registrations`}
                    className="mt-2 inline-block text-xs text-blue-700 underline"
                  >
                    Open event registrations
                  </Link>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel title="Payments & Receipts">
        {contact.payments.length === 0 ? (
          <EmptyState>No payments recorded.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {contact.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-gray-600">
                      {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{payment.purpose}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900">{formatCents(payment.amountCents)}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-600">
                      {payment.receipt ? payment.receipt.receiptNumber : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Communication Outbox">
        {contact.communications.length === 0 ? (
          <EmptyState>No communication messages queued yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {contact.communications.map((message) => (
                  <tr key={message.id} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-4 text-gray-600">{formatRelativeTime(message.createdAt)}</td>
                    <td className="py-3 pr-4 text-gray-700">{message.purpose.replace(/_/g, " ")}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{message.subject}</p>
                      <p className="mt-1 max-w-2xl whitespace-pre-wrap text-xs text-gray-600">{message.body}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(message.status)}`}>
                        {message.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="text-xs text-gray-500">{label}</span>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ProfileRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-800">{children}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">{children}</div>;
}
