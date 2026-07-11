import Link from "next/link";
import {
  contactSourceLabel,
  pilotContactKindLabel,
} from "@/lib/pilot/contact-labels";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
}

const typeBadgeVariant: Record<string, "brand" | "accent" | "success" | "warning" | "default"> = {
  member: "brand",
  donor: "accent",
  volunteer: "success",
  lead: "warning",
};

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
  if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
  const visible = tags.slice(0, 2);
  const extra = tags.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <Link
          key={tag}
          href={`/dashboard/members?tag=${encodeURIComponent(tag)}`}
          className="inline-block max-w-[72px] truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground hover:bg-primary/10 hover:text-primary"
          title={tag}
        >
          {tag}
        </Link>
      ))}
      {extra > 0 && (
        <span className="text-[10px] font-medium text-muted-foreground" title={tags.slice(2).join(", ")}>
          +{extra}
        </span>
      )}
    </div>
  );
}

export function ContactsCrmTable({ contacts }: { contacts: ContactListRow[] }) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableHeaderCell>Name</DataTableHeaderCell>
        <DataTableHeaderCell>Email</DataTableHeaderCell>
        <DataTableHeaderCell>Phone</DataTableHeaderCell>
        <DataTableHeaderCell>Type</DataTableHeaderCell>
        <DataTableHeaderCell>Source</DataTableHeaderCell>
        <DataTableHeaderCell>Membership</DataTableHeaderCell>
        <DataTableHeaderCell>Last activity</DataTableHeaderCell>
        <DataTableHeaderCell>Tags</DataTableHeaderCell>
        <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
      </DataTableHead>
      <DataTableBody>
        {contacts.map((contact) => (
          <DataTableRow key={contact.id}>
            <DataTableCell className="whitespace-nowrap font-medium">
              <Link href={`/dashboard/members/${contact.id}`} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {initials(contact.firstName, contact.lastName)}
                </span>
                <span className="font-bold text-foreground hover:text-primary">
                  {contact.firstName} {contact.lastName}
                </span>
              </Link>
            </DataTableCell>
            <DataTableCell className="max-w-[180px] truncate text-foreground/80" title={contact.email}>
              {contact.email}
            </DataTableCell>
            <DataTableCell className="whitespace-nowrap text-muted-foreground">{contact.phone || "—"}</DataTableCell>
            <DataTableCell className="whitespace-nowrap text-xs">
              <Badge variant={typeBadgeVariant[contact.type?.toLowerCase()] ?? "default"}>
                {pilotContactKindLabel(contact)}
              </Badge>
            </DataTableCell>
            <DataTableCell className="whitespace-nowrap text-xs">{contactSourceLabel(contact.source)}</DataTableCell>
            <DataTableCell className="whitespace-nowrap text-xs">{membershipLabel(contact)}</DataTableCell>
            <DataTableCell className="max-w-[140px] truncate text-xs text-muted-foreground" title={contact.lastActivitySummary ?? undefined}>
              {activityLabel(contact)}
            </DataTableCell>
            <DataTableCell>
              <TagPills tags={contact.tags} />
            </DataTableCell>
            <DataTableCell className="whitespace-nowrap text-right">
              <Link href={`/dashboard/members/${contact.id}`} className="text-xs font-semibold text-primary hover:text-foreground">
                View
              </Link>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

/** @deprecated Use ContactsCrmTable — kept for type re-exports during migration */
export type ContactRow = ContactListRow;
