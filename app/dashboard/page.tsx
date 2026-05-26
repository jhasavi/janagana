import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTenantByClerkOrgId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const [user, tenant] = await Promise.all([
    currentUser(),
    getTenantByClerkOrgId(orgId),
  ]);

  if (!tenant) redirect("/onboarding/create-organization");

  const [memberCount, tierCount, eventCount] = await Promise.all([
    prisma.contact.count({ where: { tenantId: tenant.id } }),
    prisma.membershipTier.count({ where: { tenantId: tenant.id, active: true } }),
    prisma.event.count({ where: { tenantId: tenant.id } }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Signed in as {user?.primaryEmailAddress?.emailAddress}
        </p>
      </div>

      {/* Setup checklist */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Setup status
        </h2>
        <ul className="space-y-2">
          <SetupItem
            done
            label="Organization created"
            note={tenant.name}
          />
          <SetupItem
            done={tierCount > 0}
            label="Membership tier added"
            note={tierCount > 0 ? `${tierCount} tier${tierCount !== 1 ? "s" : ""}` : undefined}
            action={{ href: "/dashboard/tiers/new", label: "Add tier" }}
          />
          <SetupItem
            done={memberCount > 0}
            label="First member added"
            note={memberCount > 0 ? `${memberCount} contact${memberCount !== 1 ? "s" : ""}` : undefined}
            action={{ href: "/dashboard/members/new", label: "Add member" }}
          />
          <SetupItem
            done={eventCount > 0}
            label="First event created"
            note={eventCount > 0 ? `${eventCount} event${eventCount !== 1 ? "s" : ""}` : undefined}
            action={{ href: "/dashboard/events/new", label: "Create event" }}
          />
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Members"
          value={memberCount}
          href="/dashboard/members"
        />
        <StatCard
          label="Active Tiers"
          value={tierCount}
          href="/dashboard/tiers"
        />
        <StatCard
          label="Events"
          value={eventCount}
          href="/dashboard/events"
        />
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
      {!done && action && (
        <a
          href={action.href}
          className="text-xs text-blue-600 hover:underline"
        >
          {action.label}
        </a>
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
  value: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
    >
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </a>
  );
}
