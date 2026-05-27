import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveTenantForDashboard } from "@/lib/tenant";

export default async function DashboardPage() {
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  const [contactsCount, tiersCount, eventsCount] = tenant
    ? await Promise.all([
        prisma.contact.count({ where: { tenantId: tenant.id } }),
        prisma.membershipTier.count({ where: { tenantId: tenant.id } }),
        prisma.event.count({ where: { tenantId: tenant.id } }),
      ])
    : [0, 0, 0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tenant: {tenant?.name ?? "Not resolved"}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Current counts</h2>
        <ul className="space-y-2">
          <SetupItem done={true} label={`Contacts: ${contactsCount}`} action={{ href: "/dashboard/members", label: "Open members" }} />
          <SetupItem done={true} label={`Membership tiers: ${tiersCount}`} action={{ href: "/dashboard/tiers", label: "Open tiers" }} />
          <SetupItem done={true} label={`Events: ${eventsCount}`} action={{ href: "/dashboard/events", label: "Open events" }} />
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Members" value={String(contactsCount)} href="/dashboard/members" />
        <StatCard label="Tiers" value={String(tiersCount)} href="/dashboard/tiers" />
        <StatCard label="Events" value={String(eventsCount)} href="/dashboard/events" />
      </div>
    </div>
  );
}

function SetupItem({
  done,
  label,
  note,
  action,
}: {
  done: boolean;
  label: string;
  note?: string;
  action?: { href: string; label: string };
}) {
  return (
    <li className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={done ? "text-green-500" : "text-gray-300"}>
          {done ? "✓" : "○"}
        </span>
        <span className={`text-sm ${done ? "text-gray-700" : "text-gray-400"}`}>
          {label}
        </span>
        {note && <span className="text-xs text-gray-400">({note})</span>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-xs text-blue-600 hover:underline"
        >
          {action.label}
        </Link>
      )}
    </li>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
    >
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </Link>
  );
}
