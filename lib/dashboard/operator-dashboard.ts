import { prisma } from "@/lib/prisma";
import { getTenantDashboardSummary } from "@/lib/dashboard/tenant-summary";
import type { OperatorWarning } from "@/lib/dashboard/operator-warnings";

export type OperatorDashboard = Awaited<ReturnType<typeof getOperatorDashboard>>;

const RECENT_WINDOW_DAYS = 7;

export async function getOperatorDashboard(tenantId: string, tenantSlug: string) {
  const now = new Date();
  const since = new Date(now.getTime() - RECENT_WINDOW_DAYS * 86_400_000);
  const [
    summary,
    publishedEvents,
    draftEvents,
    upcomingEvents,
    recentContacts,
    recentRegistrations,
    contactsLast7Days,
    registrationsLast7Days,
    lastContact,
    lastRegistration,
  ] = await Promise.all([
    getTenantDashboardSummary(tenantId),
    prisma.event.count({ where: { tenantId, status: "PUBLISHED" } }),
    prisma.event.count({ where: { tenantId, status: "DRAFT" } }),
    prisma.event.findMany({
      where: {
        tenantId,
        status: "PUBLISHED",
        startsAt: { gte: now },
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        location: true,
        _count: {
          select: { registrations: true },
        },
      },
    }),
    prisma.contact.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: "desc" }, { email: "asc" }],
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        type: true,
        source: true,
        interestType: true,
        lastActivityAt: true,
        lastActivitySummary: true,
        createdAt: true,
        _count: {
          select: { registrations: true },
        },
      },
    }),
    prisma.eventRegistration.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            source: true,
            interestType: true,
          },
        },
      },
    }),
    prisma.contact.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.eventRegistration.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.contact.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.eventRegistration.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const operationalWarnings: OperatorWarning[] = [];

  if (summary.contactsTotal === 0) {
    operationalWarnings.push({
      id: "no-contacts",
      severity: "attention",
      message: `No contacts captured for ${tenantSlug} yet. Test your website CTA or portal contact form.`,
      actionLabel: "Copy portal URL",
      actionHref: "#tenant-portal-url",
    });
  } else if (contactsLast7Days === 0 && summary.contactsTotal < 5) {
    operationalWarnings.push({
      id: "no-recent-contacts",
      severity: "info",
      message: `No new portal contacts in the last ${RECENT_WINDOW_DAYS} days (${summary.contactsTotal} on record).`,
      actionLabel: "View contacts",
      actionHref: "/dashboard/members",
    });
  }

  if (publishedEvents === 0) {
    operationalWarnings.push({
      id: "no-published-events",
      severity: "attention",
      message: "No published events on the public portal. Visitors cannot register until you publish one.",
      actionLabel: "Manage events",
      actionHref: "/dashboard/events",
    });
  } else if (draftEvents > 0 && publishedEvents === 0) {
    operationalWarnings.push({
      id: "draft-events",
      severity: "attention",
      message: `${draftEvents} draft event${draftEvents === 1 ? "" : "s"} — none published yet, so visitors cannot register.`,
      actionHref: "/dashboard/events",
      actionLabel: "Publish an event",
    });
  }

  if (summary.eventRegistrationsConfirmed === 0 && publishedEvents > 0) {
    operationalWarnings.push({
      id: "no-registrations",
      severity: "attention",
      message: "Published events are live but no confirmed registrations yet. Share an event registration link.",
      actionLabel: "View events",
      actionHref: "/dashboard/events",
    });
  }

  const signal: "healthy" | "watch" | "setup" =
    summary.contactsTotal > 0 && (contactsLast7Days > 0 || registrationsLast7Days > 0)
      ? "healthy"
      : summary.contactsTotal > 0 || summary.eventRegistrationsConfirmed > 0
        ? "watch"
        : "setup";

  return {
    summary,
    publishedEvents,
    draftEvents,
    upcomingEvents,
    recentContacts,
    recentRegistrations,
    operationalWarnings,
    activity: {
      contactsLast7Days,
      registrationsLast7Days,
      lastContactAt: lastContact?.createdAt ?? null,
      lastRegistrationAt: lastRegistration?.createdAt ?? null,
      windowDays: RECENT_WINDOW_DAYS,
      signal,
    },
  };
}
