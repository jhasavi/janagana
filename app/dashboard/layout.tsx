import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const resolution = await resolveTenantForDashboard();
  if (resolution.status === "ZERO_TENANTS") {
    redirect("/onboarding/create-organization");
  }
  if (resolution.status === "MULTI_TENANT") {
    redirect("/select-organization");
  }

  const tenant = resolution.tenant;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-900">Janagana</span>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-gray-600">{tenant.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/select-organization"
                className="text-xs text-blue-600 hover:underline"
              >
                Organizations
              </Link>
              <Link
                href={`/portal/${tenant.slug}`}
                className="text-xs text-blue-600 hover:underline"
              >
                Public portal ↗
              </Link>
              <span className="text-xs text-gray-500">{user.email ?? user.name ?? user.id}</span>
              <form action="/api/sign-out" method="POST">
                <button type="submit" className="text-xs text-gray-700 underline">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-48 shrink-0">
            <nav className="space-y-1">
              {[
                { href: "/dashboard", label: "Overview" },
                { href: "/dashboard/members", label: "Contacts" },
                { href: "/dashboard/tiers", label: "Membership Tiers" },
                { href: "/dashboard/events", label: "Events" },
                { href: "/dashboard/settings", label: "Settings" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
