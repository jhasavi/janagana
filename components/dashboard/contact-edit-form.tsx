import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { ContactTagsField } from "@/components/dashboard/contact-tags-field";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { formatContactTagsInput } from "@/lib/contacts/tags";
import { CONTACT_TYPE_OPTIONS } from "@/lib/pilot/contact-labels";

type ContactEditFormProps = {
  tenantId: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    type: string;
    notes: string | null;
    tags: string[];
  };
  action: (formData: FormData) => Promise<void>;
};

export function ContactEditForm({ tenantId, contact, action }: ContactEditFormProps) {
  return (
    <Card>
      <CardBody>
        <h2 className="text-base font-semibold text-foreground">Edit contact</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update name, phone, type, tags, and admin notes.</p>
        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
          <TenantScopeHiddenFields tenantId={tenantId} />
          <input type="hidden" name="contactId" value={contact.id} />
          <FormField label="First name">
            <Input name="firstName" required defaultValue={contact.firstName} />
          </FormField>
          <FormField label="Last name">
            <Input name="lastName" required defaultValue={contact.lastName} />
          </FormField>
          <FormField label="Phone">
            <Input name="phone" defaultValue={contact.phone ?? ""} />
          </FormField>
          <FormField label="Contact type">
            <Select name="type" defaultValue={contact.type}>
              {CONTACT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <ContactTagsField defaultValue={formatContactTagsInput(contact.tags)} />
          </div>
          <div className="sm:col-span-2">
            <FormField label="Admin notes">
              <Textarea name="notes" rows={4} defaultValue={contact.notes ?? ""} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm">
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
