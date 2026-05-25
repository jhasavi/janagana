# Stripe Membership Setup

This document explains how to resolve the Stripe warning: `No paid membership tier is configured with a Stripe Price ID.`

## What the warning means

The app detects that a tenant does not have any active paid membership tier with a configured `stripePriceId`.
This warning is accurate when:

- the tenant has no membership tiers,
- or the tenant has only free tiers,
- or the tenant's paid tiers do not have a Stripe Price ID set,
- or the Stripe Price ID is invalid / missing in Stripe.

## Test mode vs live mode

- `test` mode uses Stripe test API keys (`sk_test_*`, `pk_test_*`).
- `live` mode uses Stripe live API keys (`sk_live_*`, `pk_live_*`).

Always verify the mode before making changes.

- In `report` and `plan` modes, the script does not mutate anything.
- In `apply` mode, the script only updates the database or creates Stripe objects when explicit confirmation flags are present.

## Command usage

### Report mode

Inspect the current tenant state without changing anything.

```bash
npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug <slug> --mode report --stripe-mode <test|live>
```

Example:

```bash
npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug namaste-boston --mode report --stripe-mode live
```

### Plan mode

Preview the exact actions the script would take.

```bash
npx tsx scripts/verify-stripe-membership-setup.ts \
  --tenant-slug <slug> \
  --mode plan \
  --stripe-mode <test|live> \
  --tier-name "<name>" \
  --amount-cents <cents> \
  --interval month|year \
  [--stripe-price-id <price_id>]
```

If `--stripe-price-id` is provided, the script validates the price exists in Stripe.
If it is not provided, plan mode describes whether an existing Stripe product/price would be reused or a new one would be created.

### Apply mode

Apply changes only when you are sure.

```bash
npx tsx scripts/verify-stripe-membership-setup.ts \
  --tenant-slug <slug> \
  --mode apply \
  --stripe-mode <test|live> \
  --confirm \
  --tier-name "<name>" \
  --amount-cents <cents> \
  --interval month|year \
  [--stripe-price-id <price_id>] \
  [--confirm-live]
```

- `--confirm` is required for `apply` mode.
- `--confirm-live` is also required when `--stripe-mode live`.

## How to link an existing Stripe price safely

1. Run report mode for the tenant and confirm the slug.
2. If you already have a Stripe Price ID in the correct Stripe environment, use it in plan mode to validate it exists.
3. Use apply mode with `--stripe-price-id <price_id>` to link the existing Stripe price to the tenant tier.

Example:

```bash
npx tsx scripts/verify-stripe-membership-setup.ts \
  --tenant-slug namaste-boston \
  --mode plan \
  --stripe-mode live \
  --tier-name "Monthly Membership" \
  --amount-cents 1999 \
  --interval month \
  --stripe-price-id price_12345
```

If validation passes, apply it with:

```bash
npx tsx scripts/verify-stripe-membership-setup.ts \
  --tenant-slug namaste-boston \
  --mode apply \
  --stripe-mode live \
  --confirm \
  --confirm-live \
  --tier-name "Monthly Membership" \
  --amount-cents 1999 \
  --interval month \
  --stripe-price-id price_12345
```

## How to create a test Stripe price safely

Use `plan` mode first to inspect whether an existing Stripe product or price will be reused.

Then use `apply` mode with `--stripe-mode test` and without `--stripe-price-id`:

```bash
npx tsx scripts/verify-stripe-membership-setup.ts \
  --tenant-slug namaste-boston \
  --mode apply \
  --stripe-mode test \
  --confirm \
  --tier-name "Monthly Membership" \
  --amount-cents 1999 \
  --interval month
```

The script will reuse existing Stripe objects when metadata matches and will not create duplicates.

## How to create a live Stripe price safely

Live Stripe creation is only allowed with explicit confirmation.

```bash
npx tsx scripts/verify-stripe-membership-setup.ts \
  --tenant-slug namaste-boston \
  --mode apply \
  --stripe-mode live \
  --confirm \
  --confirm-live \
  --tier-name "Monthly Membership" \
  --amount-cents 1999 \
  --interval month
```

If you already have a live Stripe Price ID, prefer linking it with `--stripe-price-id` instead of creating a new price.

## How to verify the warning disappears

After applying the setup, rerun report mode:

```bash
npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug <slug> --mode report --stripe-mode <test|live>
```

The report should show a paid active tier with a valid Stripe price lookup and should not expect the dashboard warning.
