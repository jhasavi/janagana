# Stripe Webhooks Setup for Render

This document provides instructions for setting up Stripe webhooks for the Janagana API deployed on Render.

## Webhook Endpoint URL

**Production URL:** `https://janagana-api.onrender.com/api/v1/webhooks/stripe`

## Step-by-Step Setup

### 1. Access Stripe Dashboard

1. Go to https://dashboard.stripe.com/
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**

### 2. Configure Webhook Endpoint

**Endpoint URL:**
```
https://janagana-api.onrender.com/api/v1/webhooks/stripe
```

**Events to listen for:**
- [x] `payment_intent.succeeded`
- [x] `payment_intent.payment_failed`
- [x] `checkout.session.completed`
- [x] `customer.subscription.created`
- [x] `customer.subscription.updated`
- [x] `customer.subscription.deleted`
- [x] `invoice.payment_succeeded`
- [x] `invoice.payment_failed`

**API Version:**
- Select the latest API version (or match your Stripe SDK version)

### 3. Get Webhook Secret

After creating the webhook endpoint:

1. Click on the newly created endpoint
2. Scroll to the **Signing secret** section
3. Click **Reveal** to see the secret
4. Copy the secret (format: `whsec_...`)

### 4. Add Secret to Render

1. Go to your Render dashboard: https://dashboard.render.com/
2. Navigate to the `janagana-api` service
3. Click on the **Environment** tab
4. Add environment variable:
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** [paste the webhook secret from Stripe]
5. Click **Save Changes**

### 5. Test Webhook (Optional)

In the Stripe webhook endpoint page:

1. Click **Send test webhook**
2. Select an event type (e.g., `payment_intent.succeeded`)
3. Click **Send test webhook**
4. Check the response to ensure the endpoint is working

## Stripe Connect Webhooks (Optional)

If you're using Stripe Connect for multi-tenant payments, you may need a separate webhook:

**Endpoint URL:** `https://janagana-api.onrender.com/api/v1/webhooks/stripe/connect`

**Events for Connect:**
- [x] `account.updated`
- [x] `account.external_account.created`
- [x] `account.external_account.deleted`
- [x] `account.external_account.updated`
- [x] `payment_intent.succeeded`
- [x] `payment_intent.payment_failed`

**Setup:**
1. Follow the same steps above but with the Connect endpoint URL
2. Add the secret to Render as `STRIPE_CONNECT_WEBHOOK_SECRET`

## Troubleshooting

### Webhook Not Reaching Endpoint

1. **Check Render logs:**
   - Go to Render dashboard → janagana-api → Logs
   - Look for webhook-related errors

2. **Verify endpoint URL:**
   - Ensure the URL is correct: `https://janagana-api.onrender.com/api/v1/webhooks/stripe`
   - No trailing slashes

3. **Check CORS:**
   - Verify `CORS_ORIGINS` includes `https://janagana-api.onrender.com`

4. **Test with curl:**
   ```bash
   curl -X POST https://janagana-api.onrender.com/api/v1/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### Webhook Signature Verification Failing

1. **Verify secret matches:**
   - Double-check the secret in Render matches Stripe dashboard

2. **Check timestamp:**
   - Stripe webhooks have a 5-minute tolerance
   - Ensure your server time is correct

3. **Test with Stripe CLI:**
   ```bash
   stripe trigger payment_intent.succeeded
   ```

### Webhook Events Not Processing

1. **Check event types:**
   - Ensure all required events are selected in Stripe dashboard

2. **Review event payload:**
   - In Stripe dashboard, view the event details
   - Check if the payload structure matches expectations

3. **Check API logs:**
   - Review logs for processing errors
   - Look for database connection issues

## Security Best Practices

1. **Never commit webhook secrets to git**
   - Always use environment variables
   - Rotate secrets periodically

2. **Use HTTPS only**
   - Render provides HTTPS automatically
   - Never use HTTP for webhooks

3. **Verify signatures**
   - The API automatically verifies webhook signatures
   - This prevents fraudulent webhook events

4. **Idempotency**
   - Webhook handlers should be idempotent
   - Same event can be sent multiple times

## Monitoring

### Stripe Dashboard

- Monitor webhook delivery status
- Check failed webhook attempts
- View webhook event history

### Render Dashboard

- Monitor API health: `/api/v1/health/live`
- Check logs for webhook processing errors
- Set up alerts for high error rates

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Render Webhooks Guide](https://render.com/docs/webhooks)
