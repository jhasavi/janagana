import Link from "next/link";
import { redirect } from "next/navigation";
import { Home, Users } from "lucide-react";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { UpgradePrompt } from "@/components/dashboard/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth";
import { createHousehold, listHouseholds } from "@/lib/actions/households";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; upgrade?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const query = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const activeTenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  if (!activeTenant) redirect("/select-organization");

  const households = await listHouseholds();

  async function createHouseholdAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await createHousehold(
      { name: String(formData.get("name") ?? "") },
      { tenantIdHint: tenantHint },
    );
    if (!result.ok) {
      const upgradeParam = "upgradeRequired" in result && result.upgradeRequired ? "&upgrade=1" : "";
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/families?error=${encodeURIComponent(result.error)}${upgradeParam}`);
      }
      redirect(`/dashboard/families?error=${encodeURIComponent(result.error)}${upgradeParam}`);
    }
    redirectWithActiveTenant(result.data.id, `/dashboard/families/${result.data.id}`);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Families"
        description="Group contacts into households so renewals, RSVPs, and outreach can be seen per family, not just per person."
      />

      {query.error && query.upgrade === "1" ? (
        <UpgradePrompt message={query.error} />
      ) : query.error ? (
        <div className="jg-surface-muted border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {query.error}
        </div>
      ) : null}

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">New household</h2>
          <form action={createHouseholdAction} className="mt-3 flex flex-wrap items-end gap-3">
            <TenantScopeHiddenFields tenantId={activeTenant.id} />
            <FormField label="Household name" className="min-w-64 flex-1">
              <Input name="name" required placeholder="The Sharma Family" />
            </FormField>
            <Button type="submit">Create household</Button>
          </form>
        </CardBody>
      </Card>

      {!households.ok || households.data.length === 0 ? (
        <EmptyState
          title="No households yet"
          description="Create a household above, then add existing contacts to it."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {households.data.map((household) => (
            <Link key={household.id} href={`/dashboard/families/${household.id}`} className="jg-card block p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Home className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-foreground">{household.name}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {household.members.length} member{household.members.length === 1 ? "" : "s"}
              </p>
              {household.payer && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Payer: {household.payer.firstName} {household.payer.lastName}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
