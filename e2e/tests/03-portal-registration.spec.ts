import { config as loadEnv } from "dotenv";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

test.describe("public portal registration", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("published portal event can be viewed and registered", async ({ page }) => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: "purple-wings" },
      select: { id: true, slug: true, name: true },
    });
    expect(tenant, "Expected repaired Purple Wings tenant to exist").toBeTruthy();

    const marker = `portal-spec-${Date.now().toString(36)}`;
    const publishedSlug = `${marker}-published`;
    const draftSlug = `${marker}-draft`;

    await prisma.event.createMany({
      data: [
        {
          tenantId: tenant!.id,
          title: `${marker} Published Class`,
          slug: publishedSlug,
          description: "Playwright portal smoke published event",
          startsAt: new Date("2032-02-01T10:00:00.000Z"),
          status: "PUBLISHED",
          priceCents: 2500,
          capacity: 20,
        },
        {
          tenantId: tenant!.id,
          title: `${marker} Draft Class`,
          slug: draftSlug,
          description: "Playwright portal smoke draft event",
          startsAt: new Date("2032-02-02T10:00:00.000Z"),
          status: "DRAFT",
          priceCents: 0,
          capacity: 10,
        },
      ],
    });

    try {
      await page.goto(`/portal/${tenant!.slug}/events`);
      await expect(page.getByRole("heading", { name: /events/i })).toBeVisible();
      await expect(page.getByText(`${marker} Published Class`)).toBeVisible();
      await expect(page.getByText(`${marker} Draft Class`)).toHaveCount(0);

      await page.getByRole("link", { name: /view details/i }).first().click();
      await expect(page.getByRole("heading", { name: `${marker} Published Class` })).toBeVisible();
      await page.getByRole("link", { name: /register/i }).click();

      await expect(page.getByRole("heading", { name: /register for/i })).toBeVisible();
      await page.getByLabel(/first name/i).fill("Portal");
      await page.getByLabel(/last name/i).fill("Visitor");
      await page.getByLabel(/email/i).fill(`${marker}@example.com`);
      await page.getByLabel(/phone/i).fill("555-0100");
      await page.getByRole("button", { name: /complete registration/i }).click();

      await expect(page.getByText(/registration successful/i)).toBeVisible();
    } finally {
      await prisma.eventRegistration.deleteMany({ where: { event: { slug: { in: [publishedSlug, draftSlug] } } } });
      await prisma.event.deleteMany({ where: { slug: { in: [publishedSlug, draftSlug] } } });
    }
  });
});
