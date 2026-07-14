import { config as loadEnv } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { isPro, FREE_LIMITS } from "@/lib/plans/gate";
import { processStripeWebhookEvent } from "@/lib/payments/stripe-webhooks";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const ROOT = process.cwd();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function testGateHelpers() {
  assert(isPro({ plan: "PRO" }) === true, "PRO tenant should be isPro");
  assert(isPro({ plan: "FREE" }) === false, "FREE tenant should not be isPro");
  assert(FREE_LIMITS.customFields === 1, "Free custom field cap should be 1");
  assert(FREE_LIMITS.publishedEvents === 3, "Free published event cap should be 3");
  assert(FREE_LIMITS.membershipTiers === 1, "Free membership tier cap should be 1");
  console.log("PASS plan gate helpers");
}

function testStaticWiring() {
  const customFields = readFileSync(join(ROOT, "lib/actions/custom-fields.ts"), "utf8");
  const events = readFileSync(join(ROOT, "lib/actions/events.ts"), "utf8");
  const tiers = readFileSync(join(ROOT, "lib/actions/membership-tiers.ts"), "utf8");
  const billing = readFileSync(join(ROOT, "lib/actions/billing.ts"), "utf8");
  const settings = readFileSync(join(ROOT, "app/dashboard/settings/page.tsx"), "utf8");
  const webhooks = readFileSync(join(ROOT, "lib/payments/stripe-webhooks.ts"), "utf8");

  assert(customFields.includes("FREE_LIMITS") && customFields.includes("upgradeRequired"), "custom fields must gate on plan");
  assert(events.includes("FREE_LIMITS") && events.includes("upgradeRequired"), "events must gate published count on plan");
  assert(tiers.includes("FREE_LIMITS") && tiers.includes("upgradeRequired"), "membership tiers must gate active count on plan");
  assert(billing.includes("createProUpgradeCheckout") && billing.includes("createManageBillingSession"), "billing actions must exist");
  assert(settings.includes("UpgradePrompt") && settings.includes("isPro"), "settings page must render plan state");
  assert(webhooks.includes("platform_subscription"), "webhook handler must process platform subscription checkout");
  assert(webhooks.includes("customer.subscription.deleted"), "webhook handler must downgrade on subscription deletion");
  console.log("PASS plan billing static wiring");
}

async function testUpgradeDowngradeLifecycle() {
  const marker = `plan-${Date.now().toString(36)}`;
  const tenant = await prisma.tenant.create({
    data: { slug: `${marker}-t`, name: `Plan ${marker}`, clerkOrgId: `dev_${marker}`, status: "ACTIVE" },
  });

  assert(tenant.plan === "FREE", "New tenant should default to FREE plan");

  const customerId = `cus_${marker}`;
  const subscriptionId = `sub_${marker}`;

  const checkoutEvent = {
    id: `evt_checkout_${marker}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${marker}`,
        object: "checkout.session",
        payment_status: "paid",
        customer: customerId,
        subscription: subscriptionId,
        client_reference_id: tenant.id,
        metadata: { purpose: "platform_subscription", tenantId: tenant.id },
      },
    },
  };

  const checkoutResult = await processStripeWebhookEvent(checkoutEvent);
  assert(checkoutResult.ok && checkoutResult.processed, "Platform subscription checkout should process");

  let updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
  assert(updated?.plan === "PRO", "Tenant should upgrade to PRO after paid checkout");
  assert(updated?.stripeCustomerId === customerId, "Tenant should persist Stripe customer id");
  assert(updated?.stripeSubscriptionId === subscriptionId, "Tenant should persist Stripe subscription id");

  const upgradeAudit = await prisma.auditLog.findFirst({
    where: { tenantId: tenant.id, metadata: { path: ["change"], equals: "plan_upgraded_to_pro" } },
  });
  assert(upgradeAudit !== null, "Upgrade should be audit logged");

  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const updatedEvent = {
    id: `evt_updated_${marker}`,
    type: "customer.subscription.updated",
    data: {
      object: {
        id: subscriptionId,
        object: "subscription",
        customer: customerId,
        status: "active",
        current_period_end: periodEnd,
      },
    },
  };
  const updatedResult = await processStripeWebhookEvent(updatedEvent);
  assert(updatedResult.ok && updatedResult.processed, "Subscription update should process");

  updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
  assert(updated?.planRenewsAt !== null, "planRenewsAt should be set from subscription period end");
  assert(
    Math.abs((updated!.planRenewsAt!.getTime() - periodEnd * 1000)) < 1000,
    "planRenewsAt should match Stripe's current_period_end",
  );

  const deletedEvent = {
    id: `evt_deleted_${marker}`,
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: subscriptionId,
        object: "subscription",
        customer: customerId,
        status: "canceled",
      },
    },
  };
  const deletedResult = await processStripeWebhookEvent(deletedEvent);
  assert(deletedResult.ok && deletedResult.processed, "Subscription deletion should process");

  updated = await prisma.tenant.findUnique({ where: { id: tenant.id } });
  assert(updated?.plan === "FREE", "Tenant should downgrade to FREE after subscription deletion");
  assert(updated?.stripeSubscriptionId === null, "Subscription id should be cleared on downgrade");
  assert(updated?.planRenewsAt === null, "planRenewsAt should be cleared on downgrade");

  const downgradeAudit = await prisma.auditLog.findFirst({
    where: { tenantId: tenant.id, metadata: { path: ["change"], equals: "plan_downgraded_to_free" } },
  });
  assert(downgradeAudit !== null, "Downgrade should be audit logged");

  console.log("Plan billing lifecycle checks passed:");
  console.log("- checkout.session.completed (platform_subscription) upgrades tenant to PRO");
  console.log("- customer.subscription.updated refreshes planRenewsAt");
  console.log("- customer.subscription.deleted downgrades tenant to FREE");

  await prisma.stripeWebhookEvent.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });
}

async function main() {
  testGateHelpers();
  testStaticWiring();
  await testUpgradeDowngradeLifecycle();
  console.log("Plan & billing checks passed");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
