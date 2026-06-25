import Link from "next/link";
import {
  contactSourceLabel,
  contactTypeLabel,
  pilotContactKindLabel,
} from "@/lib/pilot/contact-labels";
import { formatRelativeTime } from "@/lib/utils";

export type ContactListRow = {
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
  tags: string[];
  importedAt: Date | null;
  createdAt: Date;
  memberships: Array<{
    status: string;
    expiresAt: Date | null;
    tier: { name: string };
  }>;
  _count: { registrations: number };
};

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "—";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function membershipLabel(contact: ContactListRow): string {
  const active = contact.memberships[0];
  if (!active) return "—";
  return active.tier.name;
}

function activityLabel(contact: ContactListRow): string {
  const at = contact.lastActivityAt ?? contact.importedAt ?? contact.createdAt;
  const relative = formatRelativeTime(at);
  if (contact.importedAt && contact.lastActivitySummary?.toLowerCase().includes("import")) {
    return `Imported ${relative}`;
  }
  return relative;
}

function TagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-slate-400">—</span>;
  const visible = tags.slice(0, 2);
  const extra = tags.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-block max-w-[72px] truncate rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
          title={tag}
        >
          {tag}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] font-medium text-slate-500" title={tags.slice(2).join(", ")}>
          +{extra}
        </span>
      )}
    </div>
  );
}

export function ContactsCrmTable({ contacts }: { contacts: ContactListRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Membership</th>
            <th className="px-3 py-2">Last activity</th>
            <th className="px-3 py-2">Tags</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {contacts.map((contact) => (
            <tr key={contact.id} className="h-12 hover:bg-stone-50/80">
              <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-950">
                <Link
                  href={`/dashboard/members/${contact.id}`}
                  className="text-teal-900 hover:text-slate-950 hover:underline"
                >
                  {contact.firstName} {contact.lastName}
                </Link>
              </td>
              <td className="max-w-[180px] truncate px-3 py-2 text-slate-700" title={contact.email}>
                {contact.email}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{contact.phone || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">
                {pilotContactKindLabel(contact)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">
                {contactSourceLabel(contact.source)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">{membershipLabel(contact)}</td>
              <td
                className="max-w-[140px] truncate px-3 py-2 text-xs text-slate-600"
                title={contact.lastActivitySummary ?? undefined}
              >
                {activityLabel(contact)}
              </td>
              <td className="px-3 py-2">
                <TagPills tags={contact.tags} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <Link
                  href={`/dashboard/members/${contact.id}`}
                  className="text-xs font-semibold text-teal-900 hover:text-slate-950"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** @deprecated Use ContactsCrmTable — kept for type re-exports during migration */
export type ContactRow = ContactListRow;
