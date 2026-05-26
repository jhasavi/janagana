export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tenant placeholder</h1>
        <p className="text-sm text-gray-500 mt-1">Foundation mode. Clerk tenant binding is not implemented yet.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Setup status
        </h2>
        <ul className="space-y-2">
          <SetupItem done={false} label="Organization mapped" action={{ href: "/select-organization", label: "Not implemented yet" }} />
          <SetupItem done={false} label="Membership tier added" action={{ href: "/dashboard/tiers", label: "Open tiers" }} />
          <SetupItem done={false} label="Member added" action={{ href: "/dashboard/members", label: "Open members" }} />
          <SetupItem done={false} label="Event created" action={{ href: "/dashboard/events", label: "Open events" }} />
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Members" value="Not implemented yet" href="/dashboard/members" />
        <StatCard label="Tiers" value="Not implemented yet" href="/dashboard/tiers" />
        <StatCard label="Events" value="Not implemented yet" href="/dashboard/events" />
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
  value: string;
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
