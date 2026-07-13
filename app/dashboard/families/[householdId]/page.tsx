import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Search, UserMinus, UserPlus } from "lucide-react";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth";
import {
  addHouseholdMember,
  deleteHousehold,
  getHousehold,
  listUnassignedContacts,
  removeHouseholdMember,
  updateHousehold,
} from "@/lib/actions/households";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";

export default async function HouseholdDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ householdId: string }>;
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { householdId } = await params;
  const query = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const activeTenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  if (!activeTenant) redirect("/select-organization");
  const activeTenantId = activeTenant.id;

  const result = await getHousehold(householdId);
  if (!result.ok || !result.data) {
    notFound();
  }
  const household = result.data;

  const unassigned = query.q ? await listUnassignedContacts(query.q) : { ok: true as const, data: [] as any[] };

  async function updateHouseholdAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const res = await updateHousehold(
      {
        householdId,
        name: String(formData.get("name") ?? ""),
        payerContactId: String(formData.get("payerContactId") ?? ""),
      },
      { tenantIdHint: tenantHint },
    );
    if (!res.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/families/${householdId}?error=${encodeURIComponent(res.error)}`);
      }
      redirect(`/dashboard/families/${householdId}?error=${encodeURIComponent(res.error)}`);
    }
    redirectWithActiveTenant(tenantHint ?? activeTenantId, `/dashboard/families/${householdId}`);
  }

  async function addMemberAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const contactId = String(formData.get("contactId") ?? "");
    const res = await addHouseholdMember({ householdId, contactId }, { tenantIdHint: tenantHint });
    if (!res.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/families/${householdId}?error=${encodeURIComponent(res.error)}`);
      }
      redirect(`/dashboard/families/${householdId}?error=${encodeURIComponent(res.error)}`);
    }
    redirectWithActiveTenant(tenantHint ?? activeTenantId, `/dashboard/families/${householdId}`);
  }

  async function removeMemberAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const contactId = String(formData.get("contactId") ?? "");
    const res = await removeHouseholdMember({ householdId, contactId }, { tenantIdHint: tenantHint });
    if (!res.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/families/${householdId}?error=${encodeURIComponent(res.error)}`);
      }
      redirect(`/dashboard/families/${householdId}?error=${encodeURIComponent(res.error)}`);
    }
    redirectWithActiveTenant(tenantHint ?? activeTenantId, `/dashboard/families/${householdId}`);
  }

  async function deleteHouseholdAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const res = await deleteHousehold(householdId, { tenantIdHint: tenantHint });
    if (!res.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/families/${householdId}?error=${encodeURIComponent(res.error)}`);
      }
      redirect(`/dashboard/families/${householdId}?error=${encodeURIComponent(res.error)}`);
    }
    redirectWithActiveTenant(tenantHint ?? activeTenantId, "/dashboard/families");
  }

  return (
    <section className="space-y-6">
      <Link href="/dashboard/families" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All households
      </Link>

      <PageHeader eyebrow="Household" title={household.name} description="Members, payer, and household settings." />

      {query.error && (
        <div className="jg-surface-muted border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {query.error}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Household settings</h2>
          <form action={updateHouseholdAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <TenantScopeHiddenFields tenantId={activeTenant.id} />
            <FormField label="Household name">
              <Input name="name" defaultValue={household.name} required />
            </FormField>
            <FormField label="Payer (billing contact)">
              <Select name="payerContactId" defaultValue={household.payer?.id ?? ""}>
                <option value="">No payer set</option>
                {household.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="sm:col-span-2">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Members ({household.members.length})</h2>
          {household.members.length === 0 ? (
            <EmptyState title="No members yet" description="Search for a contact below to add them." />
          ) : (
            <ul className="mt-3 divide-y divide-border/70">
              {household.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {member.firstName} {member.lastName}
                      {household.payer?.id === member.id && (
                        <Badge variant="brand" className="ml-2">Payer</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <form action={removeMemberAction}>
                    <TenantScopeHiddenFields tenantId={activeTenant.id} />
                    <input type="hidden" name="contactId" value={member.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <UserMinus className="h-4 w-4" />
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Add a member</h2>
          <p className="mt-1 text-sm text-muted-foreground">Search contacts who aren&apos;t in a household yet.</p>
          <form method="get" className="mt-3 flex gap-2">
            <Input name="q" defaultValue={query.q ?? ""} placeholder="Search by name or email" className="max-w-sm" />
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>

          {query.q && (
            <ul className="mt-4 divide-y divide-border/70">
              {unassigned.ok && unassigned.data.length > 0 ? (
                unassigned.data.map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{contact.email}</p>
                    </div>
                    <form action={addMemberAction}>
                      <TenantScopeHiddenFields tenantId={activeTenant.id} />
                      <input type="hidden" name="contactId" value={contact.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        <UserPlus className="h-4 w-4" />
                        Add
                      </Button>
                    </form>
                  </li>
                ))
              ) : (
                <p className="py-3 text-sm text-muted-foreground">No unassigned contacts matched.</p>
              )}
            </ul>
          )}
        </CardBody>
      </Card>

      <form action={deleteHouseholdAction}>
        <TenantScopeHiddenFields tenantId={activeTenant.id} />
        <Button type="submit" variant="destructive" size="sm">
          Delete household
        </Button>
      </form>
    </section>
  );
}
