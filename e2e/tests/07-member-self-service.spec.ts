import { config as loadEnv } from "dotenv";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function extractMagicLink(body: string): string {
  const match = body.match(/https?:\/\/\S+\/api\/portal\/member-verify\?\S+/);
  if (!match) throw new Error(`No magic link found in communication body: ${body}`);
  return match[0];
}

test.describe("member self-service portal", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("member can sign in via magic link, view status, edit profile, and sign out", async ({ page }) => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: "purple-wings" },
      select: { id: true, slug: true, name: true },
    });
    expect(tenant, "Expected repaired Purple Wings tenant to exist").toBeTruthy();

    const marker = `member-spec-${Date.now().toString(36)}`;
    const email = `${marker}@example.com`;

    const tier = await prisma.membershipTier.create({
      data: { tenantId: tenant!.id, name: `${marker} Plan`, amountCents: 2500, interval: "ANNUAL", active: true },
    });

    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant!.id,
        firstName: "Member",
        lastName: "Spec",
        email,
        type: "MEMBER",
      },
    });

    const membership = await prisma.membership.create({
      data: {
        tenantId: tenant!.id,
        contactId: contact.id,
        tierId: tier.id,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    try {
      await page.goto(`/portal/${tenant!.slug}/account/sign-in`);
      await page.getByLabel(/email/i).fill(email);
      await page.getByRole("button", { name: /send sign-in link/i }).click();
      await page.waitForURL(/status=sent/);

      const message = await prisma.communicationMessage.findFirst({
        where: { tenantId: tenant!.id, contactId: contact.id, purpose: "MEMBER_SIGN_IN" },
        orderBy: { createdAt: "desc" },
      });
      expect(message, "Expected a queued member sign-in email").toBeTruthy();

      const magicLink = extractMagicLink(message!.body);
      const relativeLink = magicLink.replace(/^https?:\/\/[^/]+/, "");

      await page.goto(relativeLink);
      await page.waitForURL(new RegExp(`/portal/${tenant!.slug}/account$`));

      await expect(page.getByRole("heading", { name: "Member Spec" })).toBeVisible();
      await expect(page.getByText(tier.name).first()).toBeVisible();

      await page.getByLabel(/phone/i).fill("555-0177");
      await page.getByRole("button", { name: /save changes/i }).click();
      await page.waitForURL(/status=profile-updated/);
      await expect(page.getByText(/profile has been updated/i)).toBeVisible();

      const updatedContact = await prisma.contact.findUnique({ where: { id: contact.id } });
      expect(updatedContact?.phone).toBe("555-0177");

      await page.getByRole("button", { name: /sign out/i }).click();
      await page.waitForURL(new RegExp(`/portal/${tenant!.slug}$`));

      await page.goto(`/portal/${tenant!.slug}/account`);
      await page.waitForURL(/account\/sign-in/);
    } finally {
      await prisma.contactSession.deleteMany({ where: { contactId: contact.id } });
      await prisma.contactLoginToken.deleteMany({ where: { contactId: contact.id } });
      await prisma.communicationMessage.deleteMany({ where: { contactId: contact.id } });
      await prisma.membership.deleteMany({ where: { id: membership.id } });
      await prisma.contact.deleteMany({ where: { id: contact.id } });
      await prisma.membershipTier.deleteMany({ where: { id: tier.id } });
    }
  });
});
