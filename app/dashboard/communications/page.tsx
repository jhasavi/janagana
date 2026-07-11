import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { listCommunicationsAdminData, retryCommunication } from "@/lib/actions/communications";
import { readTenantIdHintFromForm, redirectWithActiveTenant } from "@/lib/tenant";
import { formatRelativeTime } from "@/lib/utils";

function purposeLabel(purpose: string): string {
  switch (purpose) {
    case "PAYMENT_RECEIPT":
      return "Payment receipt";
    case "EVENT_CONFIRMATION":
      return "Event confirmation";
    case "EVENT_REMINDER":
      return "Event reminder";
    case "RENEWAL_REMINDER":
      return "Renewal reminder";
    default:
      return "General";
  }
}

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "SENT") return "success";
  if (status === "QUEUED") return "warning";
  if (status === "FAILED") return "danger";
  return "default";
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const status = params.status && ["QUEUED", "SENT", "FAILED"].includes(params.status) ? params.status : "";
  const adminData = await listCommunicationsAdminData(status ? { status } : undefined);
  const data = adminData.ok ? adminData.data : null;
  const basePath = "/dashboard/communications";

  async function retryAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const messageId = String(formData.get("messageId") ?? "");
    const result = await retryCommunication(messageId, { tenantIdHint: tenantHint });
    if (!result.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `${basePath}?error=${encodeURIComponent(result.error)}`);
      }
      redirect(`${basePath}?error=${encodeURIComponent(result.error)}`);
    }
    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, basePath);
    }
    redirect(basePath);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Command center"
        title="Communications"
        description="Every receipt, confirmation, and reminder sent from JanaGana — queued, delivered, and failed messages all land here."
      />

      {params.error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {params.error}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard icon={Mail} tone="primary" label="Total messages" value={String(data.summary.total)} />
            <StatCard icon={CheckCircle2} tone="success" label="Sent" value={String(data.summary.sent)} />
            <StatCard icon={AlertTriangle} tone="warning" label="Queued / failed" value={String(data.summary.queued + data.summary.failed)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip href={basePath} active={!status}>
              All
            </FilterChip>
            <FilterChip href={`${basePath}?status=QUEUED`} active={status === "QUEUED"}>
              Queued
            </FilterChip>
            <FilterChip href={`${basePath}?status=SENT`} active={status === "SENT"}>
              Sent
            </FilterChip>
            <FilterChip href={`${basePath}?status=FAILED`} active={status === "FAILED"}>
              Failed
            </FilterChip>
          </div>

          <Card>
            <CardBody>
              <h2 className="text-base font-bold text-foreground">Outbox</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Receipts and confirmations send automatically. Renewal reminders queue from the renewals desk.
              </p>

              {data.messages.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No messages yet"
                    description="Record a payment or confirm an event registration to see the outbox in action."
                  />
                </div>
              ) : (
                <DataTable className="mt-4">
                  <DataTableHead>
                    <DataTableHeaderCell>When</DataTableHeaderCell>
                    <DataTableHeaderCell>Recipient</DataTableHeaderCell>
                    <DataTableHeaderCell>Purpose</DataTableHeaderCell>
                    <DataTableHeaderCell>Subject</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right">Action</DataTableHeaderCell>
                  </DataTableHead>
                  <DataTableBody>
                    {data.messages.map((message) => (
                      <DataTableRow key={message.id}>
                        <DataTableCell className="whitespace-nowrap text-muted-foreground">
                          <span title={message.sentAt ? message.sentAt.toISOString() : message.createdAt.toISOString()}>
                            {formatRelativeTime(message.sentAt ?? message.createdAt)}
                          </span>
                        </DataTableCell>
                        <DataTableCell>
                          <p className="font-bold text-foreground">{message.recipientName || "—"}</p>
                          <p className="text-muted-foreground">{message.recipientEmail}</p>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-xs">{purposeLabel(message.purpose)}</DataTableCell>
                        <DataTableCell className="max-w-[260px] truncate" title={message.subject}>
                          {message.subject}
                        </DataTableCell>
                        <DataTableCell>
                          <Badge variant={statusVariant(message.status)}>{message.status}</Badge>
                          {message.status === "FAILED" && message.error && (
                            <p className="mt-1 max-w-[200px] truncate text-[10px] text-destructive" title={message.error}>
                              {message.error}
                            </p>
                          )}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {message.status === "FAILED" ? (
                            <form action={retryAction}>
                              <input type="hidden" name="messageId" value={message.id} />
                              <Button type="submit" size="sm" variant="secondary">
                                <Clock3 className="h-3.5 w-3.5" />
                                Retry
                              </Button>
                            </form>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {!adminData.ok && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {adminData.error}
        </div>
      )}
    </section>
  );
}
