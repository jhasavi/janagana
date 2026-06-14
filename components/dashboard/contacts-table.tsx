import Link from "next/link";
import { DeleteContactButton } from "@/components/dashboard/delete-contact-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import {
  CONTACT_TYPE_OPTIONS,
  contactInterestLabel,
  contactSourceLabel,
  formatContactTags,
  hasImportProvenance,
  importProvenanceLabel,
  pilotContactKindLabel,
} from "@/lib/pilot/contact-labels";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export type ContactRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  type: string;
  source: string | null;
  interestType: string | null;
  lastActivityAt: Date | null;
  lastActivitySummary: string | null;
  notes: string | null;
  tags: string[];
  externalSource: string | null;
  importedAt: Date | null;
  createdAt: Date;
  tenant: { id: string; name: string; slug: string };
  registrations: Array<{
    id: string;
    status: string;
    createdAt: Date;
    event: { title: string; slug: string; startsAt: Date };
  }>;
  _count: { registrations: number };
};

export function ContactsTable({
  contacts,
  tenantId,
  tenantSlug,
  updateContactAction,
  deleteContactAction,
}: {
  contacts: ContactRow[];
  tenantId: string;
  tenantSlug: string;
  updateContactAction: (formData: FormData) => Promise<void>;
  deleteContactAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-4">Person</th>
            <th className="py-2 pr-4">How they arrived</th>
            <th className="py-2 pr-4">Last activity</th>
            <th className="py-2 pr-4">Event registrations</th>
            <th className="py-2 pr-4">Notes & tags</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id} className="border-b border-gray-100 align-top hover:bg-gray-50/50">
              <td className="py-3 pr-4">
                <p className="font-medium text-gray-900">
                  <Link href={`/dashboard/members/${contact.id}`} className="text-blue-800 hover:underline">
                    {contact.firstName} {contact.lastName}
                  </Link>
                </p>
                <p className="text-gray-600">{contact.email}</p>
                <p className="text-xs text-gray-500">{contact.phone ?? "No phone"}</p>
                <p className="mt-1 font-mono text-[10px] text-gray-400">{tenantSlug}</p>
              </td>
              <td className="py-3 pr-4">
                <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-900">
                  {pilotContactKindLabel(contact)}
                </span>
                <p className="mt-1.5 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Channel:</span> {contactSourceLabel(contact.source)}
                </p>
                {hasImportProvenance(contact) && (
                  <p className="mt-1 text-xs text-amber-800">
                    {importProvenanceLabel(contact)}
                    {contact.importedAt && (
                      <> · imported {formatDate(contact.importedAt)}</>
                    )}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-400">
                  First seen {formatDate(contact.createdAt)}
                </p>
              </td>
              <td className="py-3 pr-4">
                <p className="text-gray-900">{contact.lastActivitySummary ?? "—"}</p>
                <p className="mt-0.5 text-xs text-gray-500" title={formatDate(contact.lastActivityAt ?? contact.createdAt)}>
                  {formatRelativeTime(contact.lastActivityAt ?? contact.createdAt)}
                </p>
              </td>
              <td className="py-3 pr-4">
                {contact._count.registrations === 0 ? (
                  <p className="text-xs text-gray-500">No event registrations</p>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">
                      {contact._count.registrations} registration{contact._count.registrations === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {contact.registrations.map((registration) => (
                        <li key={registration.id} className="text-xs text-gray-600">
                          <span className="font-medium text-gray-800">{registration.event.title}</span>
                          {" · "}
                          {registration.status}
                          {" · "}
                          {formatRelativeTime(registration.createdAt)}
                        </li>
                      ))}
                    </ul>
                    {contact._count.registrations > contact.registrations.length && (
                      <p className="mt-1 text-[10px] text-gray-400">Showing latest {contact.registrations.length}</p>
                    )}
                  </>
                )}
              </td>
              <td className="py-3 pr-4 min-w-[200px]">
                {contact.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {contact.notes ? (
                  <p className="mb-2 max-w-[280px] whitespace-pre-wrap text-xs text-gray-600">{contact.notes}</p>
                ) : (
                  <p className="mb-2 text-xs text-gray-400">No admin notes</p>
                )}
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-medium text-blue-700 underline">Edit contact</summary>
                  <form action={updateContactAction} className="mt-2 grid gap-2 rounded border border-gray-200 bg-gray-50 p-2">
                    {tenantId ? <TenantScopeHiddenFields tenantId={tenantId} /> : null}
                    <input type="hidden" name="contactId" value={contact.id} />
                    <input
                      name="firstName"
                      defaultValue={contact.firstName}
                      required
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                    <input
                      name="lastName"
                      defaultValue={contact.lastName}
                      required
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                    <input
                      name="phone"
                      defaultValue={contact.phone ?? ""}
                      placeholder="Phone"
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                    <select name="type" defaultValue={contact.type} className="rounded border border-gray-300 px-2 py-1 text-xs">
                      {CONTACT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      name="tags"
                      defaultValue={formatContactTags(contact.tags)}
                      placeholder="Tags: staff, vendor, guest, director…"
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                    <textarea
                      name="notes"
                      defaultValue={contact.notes ?? ""}
                      rows={3}
                      placeholder="Admin notes"
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                    <button type="submit" className="rounded bg-gray-800 px-2 py-1 text-xs text-white">
                      Save changes
                    </button>
                  </form>
                  <form action={deleteContactAction} className="mt-2">
                    {tenantId ? <TenantScopeHiddenFields tenantId={tenantId} /> : null}
                    <DeleteContactButton
                      contactId={contact.id}
                      displayName={`${contact.firstName} ${contact.lastName}`}
                    />
                  </form>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
