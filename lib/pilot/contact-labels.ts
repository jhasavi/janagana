/** Pilot-facing contact labels — not CRM / pipeline vocabulary. */

const SOURCE_LABELS: Record<string, string> = {
  public_portal: "Public portal",
  portal_contact: "Portal contact form",
  event_registration: "Event registration flow",
  manual_admin: "Manual entry",
  nb_crm_import: "CRM import",
  tpw_class_import: "TPW class roster",
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
    case "MEMBER":
      return "Member (contact)";
    case "REGISTRANT":
      return "Event registrant";
    case "VOLUNTEER":
      return "Volunteer";
    case "DONOR":
      return "Donor";
    case "OTHER":
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
  if (contact.externalSource === "tpw_class_csv") return "TPW class roster";
  if (contact.source === "nb_crm_import") return "CRM import";
  if (contact.source === "tpw_class_import") return "TPW class roster";
  if (contact.externalSource) return tokenLabel(contact.externalSource);
  return "Import";
}

/** Pilot contact types only — see docs/PARKING-LOT.md for staff/vendor/guest roles later. */
export const CONTACT_TYPE_OPTIONS = [
  { value: "OTHER", label: "Lead / inquiry" },
  { value: "REGISTRANT", label: "Event registrant" },
] as const;

export const MANUAL_CONTACT_TYPE_OPTIONS = CONTACT_TYPE_OPTIONS;
