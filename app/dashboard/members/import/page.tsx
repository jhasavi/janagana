import Link from "next/link";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FormField, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { resolveTenantForDashboard } from "@/lib/tenant";

export default async function ContactImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    importCreated?: string;
    importUpdated?: string;
    importSkipped?: string;
    importErrors?: string;
    importPreview?: string;
  }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Contacts"
        title="Import spreadsheet"
        description="Migrate from Raklet, Excel, or Google Sheets. Export your member list, upload here, preview row counts, then import. Re-import is safe — we upsert by email per community."
        actions={
          <Link href="/dashboard/members" className="text-sm font-semibold text-primary hover:text-foreground">
            ← Back to contacts
          </Link>
        }
      />

      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.importPreview === "1" && (
        <Alert variant="warning">
          Preview only — {params.importCreated ?? "0"} would be created, {params.importUpdated ?? "0"} would be updated,{" "}
          {params.importSkipped ?? "0"} skipped. Click <strong>Import now</strong> to apply.
        </Alert>
      )}
      {params.importErrors && (
        <Alert variant="warning">Row warnings: {params.importErrors}</Alert>
      )}

      <Card>
        <CardBody>
          <p className="text-xs text-muted-foreground">
            Required column: <strong>Email</strong> or <strong>E-mail address</strong> (Raklet export shape). Name and phone
            columns are optional.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <a href="/templates/contact-import-template.csv" className="font-semibold text-primary hover:text-foreground">
              Download template CSV
            </a>
            {" · "}
            Namaste Boston live CRM sync uses <code className="font-mono">npm run import:nb-crm</code> when connected to
            Supabase.
          </p>
          <form action="/api/import/contacts" method="post" encType="multipart/form-data" className="mt-4 grid gap-3 md:grid-cols-2">
            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
            <FormField label="File" className="md:col-span-2">
              <input
                name="file"
                type="file"
                required
                accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="block w-full text-sm"
              />
            </FormField>
            <FormField label="Import type">
              <Select name="preset" defaultValue="raklet">
                <option value="raklet">Raklet export</option>
                <option value="generic">General spreadsheet</option>
                <option value="class_roster">Class roster (TPW-style)</option>
              </Select>
            </FormField>
            <FormField label="Tag (optional)">
              <Input name="importTag" placeholder="e.g. raklet-2026" />
            </FormField>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" name="mode" value="preview" variant="secondary">
                Preview
              </Button>
              <Button type="submit" name="mode" value="import">
                Import now
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </section>
  );
}
