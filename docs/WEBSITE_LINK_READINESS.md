# Website Link Readiness — v3

Date: 2026-05-27
Status: Website CTA integration + tenant-scoped lead capture ready

## Approved Portal Links

- The Purple Wings website link target:
  - `http://localhost:3020/portal/purple-wings`
- Namaste Boston website link target:
  - `http://localhost:3020/portal/namaste-boston`
- The Purple Wings lead capture target:
  - `http://localhost:3020/portal/purple-wings/contact?interest=newsletter`
- Namaste Boston lead capture target:
  - `http://localhost:3020/portal/namaste-boston/contact?interest=investment`

## Scope Notes

- This milestone includes direct link integration from external websites to tenant portal and contact pages.
- Tenant-scoped lead capture is enabled on portal contact routes.
- No widget/embed/API sync is included in this milestone.
- No CRM, Stripe, donation, volunteer, or communications automation is included.

## External Website Env Contract

- `NEXT_PUBLIC_JANAGANA_PORTAL_BASE_URL` must be set in website repos.
- Local dev value:
  - `NEXT_PUBLIC_JANAGANA_PORTAL_BASE_URL=http://localhost:3020`
- Production target value:
  - `NEXT_PUBLIC_JANAGANA_PORTAL_BASE_URL=https://janagana.namasteneedham.com`

## Validation Steps

1. Open each website CTA link and confirm it resolves to the correct tenant slug page.
2. Open each contact link and submit a lead with a unique email.
3. Confirm lead capture returns success and does not require auth.
4. Confirm tenant title and context match URL slug.
5. Register attendee in one tenant and verify no visibility in the other tenant portal/admin.
6. Run `npm run test:lead:capture` and confirm tenant isolation + no Clerk org growth.
