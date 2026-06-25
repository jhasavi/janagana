import { prisma } from "@/lib/prisma";

/** Days after which a duplicate renewal reminder is allowed. */
export const RENEWAL_REMINDER_COOLDOWN_DAYS = 7;

/** Membership payments within this window count as "recently paid". */
export const RECENT_MEMBERSHIP_PAYMENT_DAYS = 30;

export type RenewalFilter =
  | "all"
  | "active"
  | "expiring_30"
  | "expiring_60"
  | "expiring_90"
  | "expired"
  | "no_email"
  | "recently_paid"
  | "needs_reminder";

export type RenewalReminderStatus =
  | "none"
  | "queued"
  | "sent"
  | "failed"
  | "recently_queued";

export type MembershipRenewalRow = {
  membershipId: string;
  contactId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  hasUsableEmail: boolean;
  tierName: string;
  tierAmountCents: number;
  tierInterval: string;
  status: string;
  startsAt: Date;
  expiresAt: Date | null;
  expirationKnown: boolean;
  daysUntilExpiration: number | null;
  daysExpired: number | null;
  lastPaymentAt: Date | null;
  lastPaymentAmountCents: number | null;
  recentlyPaid: boolean;
  reminderStatus: RenewalReminderStatus;
  lastReminderAt: Date | null;
  isActive: boolean;
  isExpired: boolean;
  isExpiringWithin30: boolean;
  isExpiringWithin60: boolean;
  isExpiringWithin90: boolean;
  isExpiringThisMonth: boolean;
};

export type MembershipRenewalsSummary = {
  activeMembers: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  expiredMembers: number;
  expiringThisMonth: number;
  recentlyPaidCount: number;
  needsReminderCount: number;
  noEmailCount: number;
  totalEnrollments: number;
};

const MS_PER_DAY = 86_400_000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function hasUsableEmail(email: string) {
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.includes("@") && !trimmed.endsWith("@example.com");
}

/**
 * Expiration semantics (no schema migration):
 * - `Membership.expiresAt` is the source of truth when set at enrollment.
 * - `ONE_TIME` tiers may have null expiresAt → shown as "No expiration date".
 * - Expired = status EXPIRED, or expiresAt in the past.
 * - Expiring windows apply only to ACTIVE memberships with a known expiresAt in the future.
 */
export function classifyMembershipRenewal(
  membership: {
    id: string;
    status: string;
    startsAt: Date;
    expiresAt: Date | null;
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
    tier: {
      name: string;
      amountCents: number;
      interval: string;
    };
    payments: Array<{
      amountCents: number;
      status: string;
      paidAt: Date | null;
      createdAt: Date;
    }>;
    communications: Array<{
      purpose: string;
      status: string;
      createdAt: Date;
    }>;
  },
  now = new Date(),
): MembershipRenewalRow {
  const expirationKnown = membership.expiresAt !== null;
  const expiresAt = membership.expiresAt;
  const isPastExpiration = expirationKnown && expiresAt! < now;
  const isExpired = membership.status === "EXPIRED" || isPastExpiration;
  const isActive =
    membership.status === "ACTIVE" && (!expirationKnown || expiresAt! >= now);

  let daysUntilExpiration: number | null = null;
  let daysExpired: number | null = null;

  if (expirationKnown && expiresAt) {
    const delta = daysBetween(now, expiresAt);
    if (delta >= 0) {
      daysUntilExpiration = delta;
    } else {
      daysExpired = Math.abs(delta);
    }
  }

  const isExpiringWithin30 =
    isActive && daysUntilExpiration !== null && daysUntilExpiration <= 30;
  const isExpiringWithin60 =
    isActive && daysUntilExpiration !== null && daysUntilExpiration <= 60;
  const isExpiringWithin90 =
    isActive && daysUntilExpiration !== null && daysUntilExpiration <= 90;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const isExpiringThisMonth =
    isActive &&
    expirationKnown &&
    expiresAt !== null &&
    expiresAt >= now &&
    expiresAt <= monthEnd;

  const paidPayments = membership.payments
    .filter((payment) => payment.status === "PAID")
    .sort((a, b) => {
      const aTime = (a.paidAt ?? a.createdAt).getTime();
      const bTime = (b.paidAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });

  const lastPayment = paidPayments[0] ?? null;
  const lastPaymentAt = lastPayment ? (lastPayment.paidAt ?? lastPayment.createdAt) : null;
  const recentCutoff = new Date(now.getTime() - RECENT_MEMBERSHIP_PAYMENT_DAYS * MS_PER_DAY);
  const recentlyPaid = lastPaymentAt !== null && lastPaymentAt >= recentCutoff;

  const renewalComms = membership.communications
    .filter((message) => message.purpose === "RENEWAL_REMINDER")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const lastReminder = renewalComms[0] ?? null;
  const cooldownCutoff = new Date(now.getTime() - RENEWAL_REMINDER_COOLDOWN_DAYS * MS_PER_DAY);

  let reminderStatus: RenewalReminderStatus = "none";
  if (lastReminder) {
    if (lastReminder.createdAt >= cooldownCutoff) {
      reminderStatus =
        lastReminder.status === "SENT"
          ? "recently_queued"
          : lastReminder.status === "FAILED"
            ? "failed"
            : "recently_queued";
    } else if (lastReminder.status === "SENT") {
      reminderStatus = "sent";
    } else if (lastReminder.status === "FAILED") {
      reminderStatus = "failed";
    } else if (lastReminder.status === "QUEUED") {
      reminderStatus = "queued";
    }
  }

  const usableEmail = hasUsableEmail(membership.contact.email);

  return {
    membershipId: membership.id,
    contactId: membership.contact.id,
    firstName: membership.contact.firstName,
    lastName: membership.contact.lastName,
    email: membership.contact.email,
    phone: membership.contact.phone,
    hasUsableEmail: usableEmail,
    tierName: membership.tier.name,
    tierAmountCents: membership.tier.amountCents,
    tierInterval: membership.tier.interval,
    status: membership.status,
    startsAt: membership.startsAt,
    expiresAt,
    expirationKnown,
    daysUntilExpiration,
    daysExpired,
    lastPaymentAt,
    lastPaymentAmountCents: lastPayment?.amountCents ?? null,
    recentlyPaid,
    reminderStatus,
    lastReminderAt: lastReminder?.createdAt ?? null,
    isActive,
    isExpired,
    isExpiringWithin30,
    isExpiringWithin60,
    isExpiringWithin90,
    isExpiringThisMonth,
  };
}

export function summarizeMembershipRenewals(rows: MembershipRenewalRow[]): MembershipRenewalsSummary {
  return {
    activeMembers: rows.filter((row) => row.isActive).length,
    expiringIn30Days: rows.filter((row) => row.isExpiringWithin30).length,
    expiringIn60Days: rows.filter((row) => row.isExpiringWithin60).length,
    expiringIn90Days: rows.filter((row) => row.isExpiringWithin90).length,
    expiredMembers: rows.filter((row) => row.isExpired).length,
    expiringThisMonth: rows.filter((row) => row.isExpiringThisMonth).length,
    recentlyPaidCount: rows.filter((row) => row.recentlyPaid).length,
    needsReminderCount: rows.filter(
      (row) =>
        row.hasUsableEmail &&
        (row.isExpiringWithin90 || row.isExpired) &&
        row.reminderStatus !== "recently_queued",
    ).length,
    noEmailCount: rows.filter((row) => !row.hasUsableEmail).length,
    totalEnrollments: rows.length,
  };
}

export function filterMembershipRenewals(
  rows: MembershipRenewalRow[],
  filter: RenewalFilter,
): MembershipRenewalRow[] {
  switch (filter) {
    case "active":
      return rows.filter((row) => row.isActive);
    case "expiring_30":
      return rows.filter((row) => row.isExpiringWithin30);
    case "expiring_60":
      return rows.filter((row) => row.isExpiringWithin60);
    case "expiring_90":
      return rows.filter((row) => row.isExpiringWithin90);
    case "expired":
      return rows.filter((row) => row.isExpired);
    case "no_email":
      return rows.filter((row) => !row.hasUsableEmail);
    case "recently_paid":
      return rows.filter((row) => row.recentlyPaid);
    case "needs_reminder":
      return rows.filter(
        (row) =>
          row.hasUsableEmail &&
          (row.isExpiringWithin90 || row.isExpired) &&
          row.reminderStatus !== "recently_queued",
      );
    default:
      return rows;
  }
}

export async function getMembershipRenewalsDesk(tenantId: string) {
  const now = new Date();
  const memberships = await prisma.membership.findMany({
    where: { tenantId },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      tier: {
        select: {
          name: true,
          amountCents: true,
          interval: true,
        },
      },
      payments: {
        where: { purpose: "MEMBERSHIP" },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        select: {
          amountCents: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
        take: 10,
      },
      communications: {
        where: { purpose: "RENEWAL_REMINDER" },
        orderBy: { createdAt: "desc" },
        select: {
          purpose: true,
          status: true,
          createdAt: true,
        },
        take: 5,
      },
    },
    orderBy: [{ expiresAt: "asc" }, { status: "asc" }, { createdAt: "desc" }],
  });

  const rows = memberships.map((membership) => classifyMembershipRenewal(membership, now));
  const summary = summarizeMembershipRenewals(rows);

  return { rows, summary, asOf: now };
}

export async function getMembershipRenewalsSummaryForDashboard(tenantId: string) {
  const { summary } = await getMembershipRenewalsDesk(tenantId);
  return summary;
}
