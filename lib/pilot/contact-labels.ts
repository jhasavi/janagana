/** Pilot-facing contact labels — not CRM / pipeline vocabulary. */

const SOURCE_LABELS: Record<string, string> = {
  public_portal: "Public portal",
  portal_contact: "Portal contact form",
  event_registration: "Event registration flow",
  manual_admin: "Manual entry",
  nb_crm_import: "CRM import",
};

const INTEREST_LABELS: Record<string, string> = {
  NEWSLETTER: "Newsletter",
  INVESTMENT_ANALYSIS: "Investment analysis",
  MEMBERSHIP_INTEREST: "Membership interest",
  CLASS_INTEREST: "Class interest",
  EVENT_REGISTRATION: "Event registration",
  MANUAL: "Manual entry",
  IMPORTED_CONTACT: "Imported record",
};

export const PILOT_INTEREST_FILTERS = [
  { value: "NEWSLETTER", label: "Newsletter" },
  { value: "INVESTMENT_ANALYSIS", label: "Investment analysis" },
  { value: "MEMBERSHIP_INTEREST", label: "Membership interest" },
  { value: "CLASS_INTEREST", label: "Class interest" },
  { value: "EVENT_REGISTRATION", label: "Event registration" },
  { value: "IMPORTED_CONTACT", label: "Imported" },
  { value: "MANUAL", label: "Manual entry" },
] as const;

export function contactTypeLabel(type: string): string {
  switch (type) {
    case "REGISTRANT":
      return "Event registrant";
    case "OTHER":
      return "Lead / inquiry";
    case "MEMBER":
    case "VOLUNTEER":
    case "DONOR":
      return "Lead / inquiry";
    default:
      return "Lead / inquiry";
  }
}

export function contactSourceLabel(source: string | null | undefined): string {
  if (!source) return "Unknown source";
  return SOURCE_LABELS[source] ?? tokenLabel(source);
}

export function contactInterestLabel(interestType: string | null | undefined): string {
  if (!interestType) return "—";
  return INTEREST_LABELS[interestType] ?? tokenLabel(interestType);
}

/** Primary label for a row: interest (portal) first, then pilot kind. */
export function pilotContactKindLabel(input: {
  interestType?: string | null;
  type: string;
}): string {
  if (input.interestType) return contactInterestLabel(input.interestType);
  return contactTypeLabel(input.type);
}

export function tokenLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatContactTags(tags: string[]): string {
  return tags.filter(Boolean).join(", ");
}

export function hasImportProvenance(contact: {
  importedAt?: Date | string | null;
  externalSource?: string | null;
  source?: string | null;
  interestType?: string | null;
}): boolean {
  return Boolean(
    contact.importedAt ||
      contact.externalSource ||
      contact.source === "nb_crm_import" ||
      contact.interestType === "IMPORTED_CONTACT",
  );
}

export function importProvenanceLabel(contact: {
  externalSource?: string | null;
  source?: string | null;
}): string {
  if (contact.externalSource === "namaste_boston_crm") return "Namaste Boston CRM";
  if (contact.source === "nb_crm_import") return "CRM import";
  if (contact.externalSource) return tokenLabel(contact.externalSource);
  return "Import";
}

/** Options for manual contact add — pilot scope only. */
export const MANUAL_CONTACT_TYPE_OPTIONS = [
  { value: "OTHER", label: "Lead / inquiry" },
  { value: "REGISTRANT", label: "Event registrant" },
] as const;
