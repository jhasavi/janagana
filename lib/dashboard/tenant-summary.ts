import { prisma } from "@/lib/prisma";

export type TenantDashboardSummary = {
  contactsTotal: number;
  contactsLeads: number;
  contactsRegistrantType: number;
  contactsFormalType: number;
  eventRegistrationsTotal: number;
  eventRegistrationsConfirmed: number;
  formalMemberships: number;
  eventsTotal: number;
  membershipTiers: number;
};

/**
 * Tenant-scoped counts for the admin dashboard.
 *
 * Product semantics:
 * - Contacts = everyone captured (portal forms, registrations, manual admin entry).
 * - Leads/inquiries = Contact.type OTHER (newsletter, investment, class interest via portal).
 * - Registrants = people with at least one event registration (see eventRegistrations*).
 * - formalMemberships / membershipTiers: schema only — not shown in pilot operator UI.
 */
export async function getTenantDashboardSummary(tenantId: string): Promise<TenantDashboardSummary> {
  const [
    contactsTotal,
    contactsLeads,
    contactsRegistrantType,
    contactsFormalType,
    eventRegistrationsTotal,
    eventRegistrationsConfirmed,
    formalMemberships,
    eventsTotal,
    membershipTiers,
  ] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.contact.count({ where: { tenantId, type: "OTHER" } }),
    prisma.contact.count({ where: { tenantId, type: "REGISTRANT" } }),
    prisma.contact.count({ where: { tenantId, type: "MEMBER" } }),
    prisma.eventRegistration.count({ where: { tenantId } }),
    prisma.eventRegistration.count({ where: { tenantId, status: "CONFIRMED" } }),
    prisma.membership.count({ where: { tenantId } }),
    prisma.event.count({ where: { tenantId } }),
    prisma.membershipTier.count({ where: { tenantId } }),
  ]);

  return {
    contactsTotal,
    contactsLeads,
    contactsRegistrantType,
    contactsFormalType,
    eventRegistrationsTotal,
    eventRegistrationsConfirmed,
    formalMemberships,
    eventsTotal,
    membershipTiers,
  };
}
