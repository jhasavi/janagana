import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantForActions, requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";
import {
  createStripeCustomer,
  createStripeInvoice,
  createStripeInvoiceItem,
  finalizeAndSendStripeInvoice,
  voidStripeInvoice,
} from "@/lib/payments/stripe";

export const SponsorCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    tier: z.string().trim().max(100).optional().or(z.literal("")),
    contactName: z.string().trim().max(200).optional().or(z.literal("")),
    contactEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
    contactPhone: z.string().trim().max(50).optional().or(z.literal("")),
    website: z.string().trim().max(300).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    eventId: z.string().trim().min(1).optional().or(z.literal("")),
  })
  .strict();

export const SponsorUpdateSchema = SponsorCreateSchema.extend({
  sponsorId: z.string().trim().min(1),
}).strict();

export const SponsorArchiveSchema = z
  .object({
    sponsorId: z.string().trim().min(1),
  })
  .strict();

async function resolveEventId(tenantId: string, eventIdInput: string | undefined) {
  if (!eventIdInput) return { ok: true as const, eventId: null };
  const event = await prisma.event.findFirst({ where: { id: eventIdInput, tenantId }, select: { id: true } });
  if (!event) return { ok: false as const, error: "Selected event not found" };
  return { ok: true as const, eventId: event.id };
}

export async function createSponsor(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = SponsorCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid sponsor input" };
  }

  const eventResolution = await resolveEventId(context.tenant.id, parsed.data.eventId || undefined);
  if (!eventResolution.ok) return eventResolution;

  try {
    const sponsor = await prisma.sponsor.create({
      data: {
        tenantId: context.tenant.id,
        name: parsed.data.name,
        tier: parsed.data.tier || null,
        contactName: parsed.data.contactName || null,
        contactEmail: parsed.data.contactEmail || null,
        contactPhone: parsed.data.contactPhone || null,
        website: parsed.data.website || null,
        notes: parsed.data.notes || null,
        eventId: eventResolution.eventId,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: "CREATE",
        metadata: { entity: "Sponsor", sponsorId: sponsor.id },
      },
    });

    return { ok: true as const, data: sponsor };
  } catch {
    return { ok: false as const, error: "Failed to create sponsor" };
  }
}

export async function updateSponsor(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = SponsorUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid sponsor input" };
  }

  const existing = await prisma.sponsor.findFirst({
    where: { id: parsed.data.sponsorId, tenantId: context.tenant.id },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, error: "Sponsor not found" };

  const eventResolution = await resolveEventId(context.tenant.id, parsed.data.eventId || undefined);
  if (!eventResolution.ok) return eventResolution;

  const sponsor = await prisma.sponsor.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      tier: parsed.data.tier || null,
      contactName: parsed.data.contactName || null,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone || null,
      website: parsed.data.website || null,
      notes: parsed.data.notes || null,
      eventId: eventResolution.eventId,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "UPDATE",
      metadata: { entity: "Sponsor", sponsorId: sponsor.id },
    },
  });

  return { ok: true as const, data: sponsor };
}

export async function archiveSponsor(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = SponsorArchiveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid sponsor input" };
  }

  const existing = await prisma.sponsor.findFirst({
    where: { id: parsed.data.sponsorId, tenantId: context.tenant.id },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, error: "Sponsor not found" };

  const sponsor = await prisma.sponsor.update({
    where: { id: existing.id },
    data: { archivedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "UPDATE",
      metadata: { entity: "Sponsor", sponsorId: sponsor.id, change: "archived" },
    },
  });

  return { ok: true as const, data: sponsor };
}

function summarizeInvoices(invoices: Array<{ amountCents: number; status: string }>) {
  let invoicedCents = 0;
  let outstandingCents = 0;
  let collectedCents = 0;
  for (const invoice of invoices) {
    if (invoice.status === "VOID") continue;
    invoicedCents += invoice.amountCents;
    if (invoice.status === "SENT") outstandingCents += invoice.amountCents;
    if (invoice.status === "PAID") collectedCents += invoice.amountCents;
  }
  return { invoicedCents, outstandingCents, collectedCents };
}

export async function listSponsors() {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) return { ok: false as const, error: auth.error, data: [] as any[] };
  const context = auth.context;

  const sponsors = await prisma.sponsor.findMany({
    where: { tenantId: context.tenant.id, archivedAt: null },
    include: {
      event: { select: { id: true, title: true } },
      invoices: { select: { amountCents: true, status: true } },
    },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  const data = sponsors.map((sponsor) => ({
    ...sponsor,
    invoiceCount: sponsor.invoices.length,
    ...summarizeInvoices(sponsor.invoices),
  }));

  return { ok: true as const, data };
}

export async function getSponsorDetail(sponsorId: string) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) return { ok: false as const, error: auth.error, data: null as any };
  const context = auth.context;

  const sponsor = await prisma.sponsor.findFirst({
    where: { id: sponsorId, tenantId: context.tenant.id },
    include: {
      event: { select: { id: true, title: true } },
      invoices: { orderBy: [{ createdAt: "desc" }] },
    },
  });
  if (!sponsor) return { ok: false as const, error: "Sponsor not found", data: null as any };

  return {
    ok: true as const,
    data: { ...sponsor, ...summarizeInvoices(sponsor.invoices) },
  };
}

export const SponsorInvoiceDraftSchema = z
  .object({
    sponsorId: z.string().trim().min(1),
    description: z.string().trim().min(1).max(300),
    amountCents: z.number().int().min(1),
    dueDate: z.coerce.date().optional().nullable(),
  })
  .strict();

export async function createSponsorInvoiceDraft(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = SponsorInvoiceDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid invoice input" };
  }

  const sponsor = await prisma.sponsor.findFirst({
    where: { id: parsed.data.sponsorId, tenantId: context.tenant.id },
    select: { id: true },
  });
  if (!sponsor) return { ok: false as const, error: "Sponsor not found" };

  const dueDate = parsed.data.dueDate && !Number.isNaN(parsed.data.dueDate.getTime()) ? parsed.data.dueDate : null;

  const invoice = await prisma.sponsorInvoice.create({
    data: {
      tenantId: context.tenant.id,
      sponsorId: sponsor.id,
      description: parsed.data.description,
      amountCents: parsed.data.amountCents,
      dueDate,
      status: "DRAFT",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "CREATE",
      metadata: { entity: "SponsorInvoice", sponsorInvoiceId: invoice.id, sponsorId: sponsor.id },
    },
  });

  return { ok: true as const, data: invoice };
}

export const SponsorInvoiceIdSchema = z
  .object({
    sponsorInvoiceId: z.string().trim().min(1),
  })
  .strict();

export async function sendSponsorInvoice(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = SponsorInvoiceIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid invoice input" };
  }

  const invoice = await prisma.sponsorInvoice.findFirst({
    where: { id: parsed.data.sponsorInvoiceId, tenantId: context.tenant.id },
    include: { sponsor: true },
  });
  if (!invoice) return { ok: false as const, error: "Invoice not found" };
  if (invoice.status !== "DRAFT") return { ok: false as const, error: "Only draft invoices can be sent" };
  if (!invoice.sponsor.contactEmail) {
    return { ok: false as const, error: "Add a contact email for this sponsor before sending an invoice" };
  }

  let stripeCustomerId = invoice.sponsor.stripeCustomerId;
  if (!stripeCustomerId) {
    const customerResult = await createStripeCustomer({
      email: invoice.sponsor.contactEmail,
      name: invoice.sponsor.contactName || invoice.sponsor.name,
      metadata: { tenantId: context.tenant.id, sponsorId: invoice.sponsor.id },
    });
    if (!customerResult.ok) return { ok: false as const, error: customerResult.error };
    stripeCustomerId = customerResult.customerId;
    await prisma.sponsor.update({ where: { id: invoice.sponsor.id }, data: { stripeCustomerId } });
  }

  const itemResult = await createStripeInvoiceItem({
    customerId: stripeCustomerId,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    description: invoice.description,
    metadata: { tenantId: context.tenant.id, sponsorInvoiceId: invoice.id },
  });
  if (!itemResult.ok) return { ok: false as const, error: itemResult.error };

  const daysUntilDue = invoice.dueDate
    ? Math.max(1, Math.ceil((invoice.dueDate.getTime() - Date.now()) / 86_400_000))
    : undefined;

  const invoiceResult = await createStripeInvoice({
    customerId: stripeCustomerId,
    daysUntilDue,
    metadata: { tenantId: context.tenant.id, sponsorInvoiceId: invoice.id, purpose: "sponsor_invoice" },
  });
  if (!invoiceResult.ok) return { ok: false as const, error: invoiceResult.error };

  const sendResult = await finalizeAndSendStripeInvoice(invoiceResult.invoiceId);
  if (!sendResult.ok) return { ok: false as const, error: sendResult.error };

  const updated = await prisma.sponsorInvoice.update({
    where: { id: invoice.id },
    data: {
      stripeInvoiceId: invoiceResult.invoiceId,
      hostedInvoiceUrl: sendResult.hostedInvoiceUrl,
      status: "SENT",
      sentAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "UPDATE",
      metadata: {
        entity: "SponsorInvoice",
        sponsorInvoiceId: invoice.id,
        change: "sent",
        stripeInvoiceId: invoiceResult.invoiceId,
      },
    },
  });

  return { ok: true as const, data: updated };
}

export async function voidSponsorInvoice(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = SponsorInvoiceIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid invoice input" };
  }

  const invoice = await prisma.sponsorInvoice.findFirst({
    where: { id: parsed.data.sponsorInvoiceId, tenantId: context.tenant.id },
  });
  if (!invoice) return { ok: false as const, error: "Invoice not found" };
  if (invoice.status === "PAID") return { ok: false as const, error: "Cannot void a paid invoice" };
  if (invoice.status === "VOID") return { ok: false as const, error: "Invoice is already void" };

  if (invoice.status === "SENT" && invoice.stripeInvoiceId) {
    const voidResult = await voidStripeInvoice(invoice.stripeInvoiceId);
    if (!voidResult.ok) return { ok: false as const, error: voidResult.error };
  }

  const updated = await prisma.sponsorInvoice.update({
    where: { id: invoice.id },
    data: { status: "VOID", voidedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "UPDATE",
      metadata: { entity: "SponsorInvoice", sponsorInvoiceId: invoice.id, change: "voided" },
    },
  });

  return { ok: true as const, data: updated };
}
