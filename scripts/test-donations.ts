import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { DONATION_PRESET_CENTS, MIN_DONATION_CENTS } from "@/lib/actions/public-donations";
import { processStripeWebhookEvent } from "@/lib/payments/stripe-webhooks";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(DONATION_PRESET_CENTS.length >= 4, "Expected donation presets");
  assert(MIN_DONATION_CENTS === 100, "Min donation should be $1");

  const marker = `donations-${Date.now().toString(36)}`;
  const tenant = await prisma.tenant.create({
    data: { slug: `${marker}-t`, name: `Donate ${marker}`, clerkOrgId: `dev_${marker}`, status: "ACTIVE" },
  });

  const contact = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Pat",
      lastName: "Donor",
      email: `${marker}@example.org`,
      type: "OTHER",
    },
  });

  const payment = await prisma.paymentRecord.create({
    data: {
      tenantId: tenant.id,
      contactId: contact.id,
      amountCents: 5000,
      status: "PENDING",
      method: "STRIPE",
      purpose: "DONATION",
      provider: "stripe",
      notes: "Test donation checkout",
    },
  });

  const event = {
    id: `evt_${marker}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${marker}`,
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 5000,
        currency: "usd",
        client_reference_id: payment.id,
        metadata: { paymentRecordId: payment.id, purpose: "DONATION" },
      },
    },
  };

  const webhook = await processStripeWebhookEvent(event);
  assert(webhook.ok && webhook.processed, "Donation webhook should process");

  const paid = await prisma.paymentRecord.findUnique({ where: { id: payment.id } });
  assert(paid?.status === "PAID", "Donation payment should be PAID");
  assert(paid?.purpose === "DONATION", "Purpose must remain DONATION");

  const receipt = await prisma.paymentReceipt.findFirst({ where: { paymentId: payment.id } });
  assert(receipt !== null, "Receipt should be issued for paid donation");

  const updatedContact = await prisma.contact.findUnique({ where: { id: contact.id } });
  assert(updatedContact?.type === "DONOR", "Contact should become DONOR");

  // Tenant isolation: admin list is auth-gated; verify query scope via prisma directly
  const tenantDonations = await prisma.paymentRecord.count({
    where: { tenantId: tenant.id, purpose: "DONATION", status: "PAID" },
  });
  assert(tenantDonations === 1, "Tenant should have 1 paid donation");

  console.log("Donations slice checks passed:");
  console.log("- Stripe webhook handles DONATION purpose");
  console.log("- Receipt issued:", receipt?.receiptNumber);
  console.log("- Contact typed DONOR");

  await prisma.paymentReceipt.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.stripeWebhookEvent.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.paymentRecord.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
