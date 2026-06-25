/** Compact quick filters for /dashboard/members */

export type ContactQuickFilter =
  | "all"
  | "members"
  | "leads"
  | "imported"
  | "raklet"
  | "no-email"
  | "recent";

export const CONTACT_QUICK_FILTERS: ReadonlyArray<{
  id: ContactQuickFilter;
  label: string;
  href: (base: string) => string;
}> = [
  { id: "all", label: "All", href: (base) => base },
  {
    id: "members",
    label: "Members",
    href: (base) => `${base}?preset=members`,
  },
  {
    id: "leads",
    label: "Leads",
    href: (base) => `${base}?preset=leads`,
  },
  {
    id: "imported",
    label: "Imported",
    href: (base) => `${base}?source=dashboard_csv_import`,
  },
  {
    id: "raklet",
    label: "Raklet",
    href: (base) => `${base}?source=dashboard_raklet_import`,
  },
  {
    id: "no-email",
    label: "No email",
    href: (base) => `${base}?preset=no-email`,
  },
  {
    id: "recent",
    label: "Recent activity",
    href: (base) => `${base}?preset=recent`,
  },
] as const;

export function isContactQuickFilter(value: string | undefined): value is ContactQuickFilter {
  return CONTACT_QUICK_FILTERS.some((f) => f.id === value);
}
