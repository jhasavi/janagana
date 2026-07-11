import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactTagsField } from "@/components/dashboard/contact-tags-field";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { createContact } from "@/lib/actions/contacts";
import { CONTACT_TYPE_OPTIONS, isContactTypeOption } from "@/lib/pilot/contact-labels";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard, tenantIdFromMutation } from "@/lib/tenant";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; type?: string }>;
}) {
  const params = await searchParams;
  const defaultType = params.type && isContactTypeOption(params.type) ? params.type : "OTHER";
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  async function createContactAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await createContact(
      {
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        type: String(formData.get("type") ?? "OTHER"),
        notes: String(formData.get("notes") ?? ""),
        tags: String(formData.get("tags") ?? ""),
      },
      { tenantIdHint: tenantHint },
    );

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create contact";
      const tenantId = tenantIdFromMutation(tenantHint);
      if (tenantId) {
        redirectWithActiveTenant(tenantId, `/dashboard/members/new?error=${encodeURIComponent(errorMessage)}`);
      }
      redirect(`/dashboard/members/new?error=${encodeURIComponent(errorMessage)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/members?success=1");
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="People"
        title="Add contact"
        description="Create a person record for your community."
        actions={<ButtonLink href="/dashboard/members" variant="secondary" size="sm">Back to contacts</ButtonLink>}
      />

      {params.error && <Alert variant="error">{params.error}</Alert>}

      <Card>
        <CardBody>
          <form action={createContactAction} className="grid gap-4">
            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
            <FormField label="First name">
              <Input name="firstName" required />
            </FormField>
            <FormField label="Last name">
              <Input name="lastName" required />
            </FormField>
            <FormField label="Email">
              <Input name="email" required type="email" />
            </FormField>
            <FormField label="Phone">
              <Input name="phone" />
            </FormField>
            <FormField label="Contact type">
              <Select name="type" defaultValue={defaultType}>
                {CONTACT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <ContactTagsField />
            <FormField label="Notes">
              <Textarea name="notes" rows={3} />
            </FormField>
            <Button type="submit">Save contact</Button>
          </form>
        </CardBody>
      </Card>
    </section>
  );
}
