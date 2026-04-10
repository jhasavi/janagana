# Webhook and Public API Implementation Summary

## Overview
This document summarizes the implementation of the webhook system and public API with API key authentication for OrgFlow.

## Completed Components

### 1. Database Schema Updates
**File**: `packages/database/prisma/schema.prisma`

Added the following models and enums:

#### Enums
- `WebhookDeliveryStatus`: PENDING, SUCCEEDED, FAILED, RETRYING
- `ApiKeyScope`: READ, WRITE, ADMIN

#### Models
- `WebhookSubscription`: Stores webhook subscriptions with URL, events, secret, and status
- `WebhookDeliveryLog`: Tracks webhook delivery attempts with retry logic
- `ApiKey`: Stores API keys with hashing, scopes, and rate limiting

### 2. Webhook Event Definitions
**File**: `apps/api/src/webhooks/webhook-events.ts`

Defined 23 webhook events across 5 categories:
- **Members**: member.created, member.updated, member.deleted, member.status_changed
- **Events**: event.created, event.updated, event.deleted, event.published, event.registration.created, event.registration.updated, event.registration.cancelled
- **Payments**: payment.received, payment.refunded, payment.failed, payment.partially_refunded
- **Volunteers**: volunteer.application.created, volunteer.application.approved, volunteer.application.rejected, volunteer.application.withdrawn
- **Clubs**: club.created, club.updated, club.deleted, club.member.joined, club.member.left

### 3. Webhook DTOs
**Files**: 
- `apps/api/src/webhooks/dto/webhook-subscription.dto.ts`
- `apps/api/src/webhooks/dto/webhook-delivery.dto.ts`

Created comprehensive DTOs with Swagger documentation for:
- Creating, updating, and testing webhook subscriptions
- Listing and filtering delivery logs
- Response DTOs with proper TypeScript types

### 4. Webhook Services
**Files**:
- `apps/api/src/webhooks/webhook-subscription.service.ts`
- `apps/api/src/webhooks/webhook-delivery.service.ts`

#### WebhookSubscriptionService
- `createSubscription()`: Create new webhook with auto-generated secret
- `listSubscriptions()`: List all webhooks for a tenant
- `getSubscription()`: Get single webhook details
- `updateSubscription()`: Update webhook URL, events, or secret
- `deleteSubscription()`: Remove webhook subscription
- `testSubscription()`: Send test payload to verify endpoint
- `toggleSubscription()`: Enable/disable webhook
- `getActiveSubscriptionsForEvent()`: Get subscriptions for specific event

#### WebhookDeliveryService
- `deliverWebhook()`: Deliver webhook with retry logic
- `attemptDelivery()`: Handle delivery with exponential backoff (1s, 5s, 15s)
- `signPayload()`: HMAC-SHA256 signature for security
- `verifySignature()`: Verify webhook signatures
- `getDeliveryLogs()`: List delivery logs with filtering
- `getDeliveryStats()`: Get aggregated statistics
- `retryFailedWebhooks()`: Batch retry failed deliveries

### 5. Webhook Controller & Module
**Files**:
- `apps/api/src/webhooks/webhooks.controller.ts`
- `apps/api/src/webhooks/webhooks.module.ts`

REST API endpoints with full Swagger documentation:
- `POST /api/v1/webhooks/subscriptions` - Create webhook
- `GET /api/v1/webhooks/subscriptions` - List webhooks
- `GET /api/v1/webhooks/subscriptions/:id` - Get webhook details
- `PUT /api/v1/webhooks/subscriptions/:id` - Update webhook
- `DELETE /api/v1/webhooks/subscriptions/:id` - Delete webhook
- `POST /api/v1/webhooks/subscriptions/:id/test` - Test webhook
- `POST /api/v1/webhooks/subscriptions/:id/toggle` - Toggle webhook
- `GET /api/v1/webhooks/delivery-logs` - List delivery logs
- `GET /api/v1/webhooks/delivery-logs/stats` - Get statistics
- `POST /api/v1/webhooks/delivery-logs/retry` - Retry failed webhooks
- `GET /api/v1/webhooks/events` - List available events

### 6. API Key System
**Files**:
- `apps/api/src/api-keys/api-keys.service.ts`
- `apps/api/src/api-keys/api-key.guard.ts`
- `apps/api/src/api-keys/api-key.decorator.ts`

#### ApiKeysService
- `createApiKey()`: Generate new API key with hashing
- `listApiKeys()`: List all API keys (without actual keys)
- `getApiKey()`: Get single API key details
- `updateApiKey()`: Update API key settings
- `deleteApiKey()`: Remove API key
- `validateApiKey()`: Validate API key and return tenant info
- `updateLastUsed()`: Track API key usage
- `rotateApiKey()`: Generate new key while keeping metadata

#### ApiKeyGuard
- Validates API keys from Authorization header
- Supports both "Bearer <key>" and "<key>" formats
- Enforces scope-based access control
- Attaches tenant info to request context

#### ApiKeyScope Decorator
- `@ApiKeyScope('READ' | 'WRITE' | 'ADMIN')` for endpoint protection

### 7. Module Integration
**File**: `apps/api/src/app.module.ts`

Added WebhooksModule to imports, making webhook endpoints available.

### 8. Dependencies
**File**: `apps/api/package.json`

Added axios dependency for webhook HTTP requests.

## Required Next Steps

### 1. Database Migration
```bash
cd packages/database
npm run migrate
npm run generate
```

This will:
- Create the new tables in PostgreSQL
- Regenerate the Prisma client with new models
- Fix TypeScript errors related to missing Prisma models

### 2. Install New Dependencies
```bash
cd apps/api
npm install
```

This will install the newly added axios dependency.

### 3. Frontend Implementation (Remaining Tasks)

#### Webhook Management Page
Create `apps/web/app/(dashboard)/dashboard/settings/webhooks/page.tsx` with:
- List of registered webhooks
- Add webhook form (URL, event selection, auto-generated secret)
- View delivery logs for each webhook
- Test webhook button
- Enable/disable webhook toggle
- Delete webhook functionality

#### API Key Management Page
Create `apps/web/app/(dashboard)/dashboard/settings/api-keys/page.tsx` with:
- List of API keys (showing prefix only)
- Create new API key form (name, scope, rate limit, expiration)
- Copy API key to clipboard (only shown on creation)
- Rotate API key functionality
- Update API key settings
- Delete API key functionality
- Usage statistics display

#### Public API Endpoints
Create a new module `apps/api/src/public-api/` with:
- Separate rate limiting (different from dashboard)
- CRUD endpoints for Members (READ/WRITE scope)
- CRUD endpoints for Events (READ/WRITE scope)
- Proper API key authentication
- Swagger documentation with API key examples

### 4. Swagger Documentation Enhancement
Update `apps/api/src/main.ts` to add:
- Request/response examples for all endpoints
- Authentication documentation (JWT + API Key)
- Error code reference table
- Webhook signature verification guide
- API key usage examples

## Webhook Payload Format

All webhooks follow this standard format:
```json
{
  "id": "unique-event-id",
  "event": "member.created",
  "data": {
    // Event-specific data
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "tenantId": "tenant-uuid"
}
```

## Webhook Signature Verification

Webhooks are signed with HMAC-SHA256:
- Header: `X-Webhook-Signature: sha256=<signature>`
- Signature is computed as: `HMAC-SHA256(secret, payload_string)`
- Use the secret provided when creating the webhook subscription

## API Key Format

API keys follow the format: `of_<random_base64url>`
- Example: `of_abc123xyz789...`
- Only the first 8 characters are stored in plaintext (prefix)
- Full key is hashed using SHA-256 for storage
- Keys are only shown once during creation

## Rate Limiting

- Dashboard: 100 requests per minute (existing)
- Public API: Configurable per API key (default: 1000/hour)
- Webhook delivery: No rate limiting (internal system)

## Security Considerations

1. **Webhook Secrets**: Auto-generated as `whsec_<32-char-hex>`, only shown on creation
2. **API Keys**: Hashed using SHA-256, never stored in plaintext
3. **HMAC Signatures**: All webhooks are signed for verification
4. **Scope-Based Access**: API keys have READ, WRITE, or ADMIN scopes
5. **Expiration**: Both webhooks and API keys support expiration dates
6. **TLS**: All webhook deliveries use HTTPS
7. **Retry Logic**: Failed webhooks retry with exponential backoff (max 3 attempts)

## Testing Checklist

After completing the migration and installation:

- [ ] Test webhook subscription creation
- [ ] Test webhook delivery to a test endpoint
- [ ] Verify webhook signature verification
- [ ] Test API key creation and validation
- [ ] Test scope-based access control
- [ ] Test webhook retry logic
- [ ] Verify delivery logs are recorded correctly
- [ ] Test API key rotation
- [ ] Test rate limiting on public API
- [ ] Verify Swagger documentation is complete

## Notes

- The TypeScript errors currently showing are expected and will be resolved after running the Prisma migration and generating the client
- The `ApiKeyScope` enum is temporarily defined in the service file; it should be removed once Prisma is regenerated
- All services use a placeholder `tenantId = 'default-tenant-id'` - this should be replaced with actual tenant resolution from the request context
- The webhook delivery uses setTimeout for retries - in production, consider using BullMQ for more robust job queue management
