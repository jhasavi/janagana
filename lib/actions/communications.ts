import { prisma } from "@/lib/prisma";
import { deliverCommunicationMessage } from "@/lib/communications/deliver";
import { requireActiveTenantForActions, requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";

export type CommunicationListRow = {
  id: string;
  purpose: string;
  status: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  body: string;
  error: string | null;
  scheduledFor: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  contact: { id: string; firstName: string; lastName: string } | null;
};

export async function listCommunicationsAdminData(filters?: { status?: string; purpose?: string }) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: null };
  }
  const context = auth.context;

  const where = {
    tenantId: context.tenant.id,
    ...(filters?.status ? { status: filters.status as never } : {}),
    ...(filters?.purpose ? { purpose: filters.purpose as never } : {}),
  };

  const [messages, queuedCount, sentCount, failedCount] = await Promise.all([
    prisma.communicationMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        purpose: true,
        status: true,
        recipientEmail: true,
        recipientName: true,
        subject: true,
        body: true,
        error: true,
        scheduledFor: true,
        sentAt: true,
        createdAt: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.communicationMessage.count({ where: { tenantId: context.tenant.id, status: "QUEUED" } }),
    prisma.communicationMessage.count({ where: { tenantId: context.tenant.id, status: "SENT" } }),
    prisma.communicationMessage.count({ where: { tenantId: context.tenant.id, status: "FAILED" } }),
  ]);

  return {
    ok: true as const,
    data: {
      messages: messages as CommunicationListRow[],
      summary: {
        queued: queuedCount,
        sent: sentCount,
        failed: failedCount,
        total: queuedCount + sentCount + failedCount,
      },
    },
  };
}

export async function retryCommunication(messageId: string, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const message = await prisma.communicationMessage.findFirst({
    where: { id: messageId, tenantId: context.tenant.id },
    select: { id: true },
  });
  if (!message) {
    return { ok: false as const, error: "Message not found" };
  }

  const result = await deliverCommunicationMessage(message.id);
  if (!result.ok) {
    return { ok: false as const, error: "Delivery failed — check Resend configuration" };
  }

  return { ok: true as const };
}
