# JanaGana — Stripe Webhooks Setup

---

## Webhook Endpoint URL

**Production:** `https://your-domain.com/api/webhooks/stripe`  
**Local dev (Stripe CLI):** `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## Required Events

Configure these in Stripe Dashboard → Developers → Webhooks → your endpoint:

| Event | Handler |
|-------|---------|
| `checkout.session.completed` | Attaches `stripeCustomerId` to member |
| `customer.subscription.created` | Saved on member for renewal tracking |
| `customer.subscription.updated` | Updates `stripeSubscriptionId` + `renewsAt` |
| `customer.subscription.deleted` | Clears subscription fields on member |
| `invoice.payment_succeeded` | (optional) record invoice paid |
| `invoice.payment_failed` | (optional) alert admin |

---

## Setup Steps

### 1. Create webhook endpoint in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks.
2. Click **Add endpoint**.
3. Set endpoint URL to your production domain: `https://your-domain.com/api/webhooks/stripe`
4. Select the events listed above.
5. Click **Add endpoint**.

### 2. Get signing secret

1. Click on the newly created endpoint.
2. Scroll to **Signing secret** → click **Reveal**.
3. Copy the value (starts with `whsec_`).
4. Add to Vercel (or `.env.local`): `STRIPE_WEBHOOK_SECRET=whsec_...`

### 3. Local development (Stripe CLI)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Log in
stripe login

# Forward events to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# This prints a webhook signing secret (whsec_...) — copy it to .env.local
```

---

## Security

- **Signature verification**: every inbound Stripe webhook is verified via `stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)` — invalid signatures are rejected with 400.
- **Never expose** `STRIPE_WEBHOOK_SECRET` in client-side code.
- **Rotate secrets**: if a signing secret is compromised, delete the webhook endpoint in Stripe and create a new one.
- **Idempotency**: webhook handlers are idempotent (Stripe may replay events multiple times).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `400 Invalid signature` | Verify `STRIPE_WEBHOOK_SECRET` matches Stripe endpoint signing secret |
| Events not arriving | Check Stripe Dashboard → Webhooks → event delivery log |
| `500 STRIPE_WEBHOOK_SECRET not configured` | Add env var to Vercel |
| Local webhook not forwarding | Ensure Stripe CLI is running: `stripe listen ...` |

---

## Testing

```bash
# Trigger a test event locally
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```
