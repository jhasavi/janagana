# OrgFlow API Documentation

NestJS REST API for the OrgFlow platform.

## Base URL

- Development: `http://localhost:4000`
- Production: `https://api.orgflow.app`

## Authentication

### Admin Portal (JWT via Clerk)
```
Authorization: Bearer <jwt_token>
```

### Member Portal (Magic Link)
Magic link tokens are sent via email and verified through the API.

### Multi-Tenancy
All requests include tenant context via:
- Subdomain: `tenant.orgflow.app`
- Header: `X-Tenant-Slug: tenant-slug`
- Development path: `/tenant-slug/...`

## Modules

### Auth Module

#### Register Organization
```http
POST /auth/register
Content-Type: application/json

{
  "name": "Organization Name",
  "slug": "org-slug",
  "adminEmail": "admin@example.com",
  "adminPassword": "password",
  "adminFirstName": "John",
  "adminLastName": "Doe"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```

#### Magic Link
```http
POST /auth/magic-link
Content-Type: application/json

{
  "email": "member@example.com",
  "tenantSlug": "org-slug"
}
```

#### Verify Magic Link
```http
POST /auth/verify-magic-link
Content-Type: application/json

{
  "token": "verification_token"
}
```

### Tenants Module

#### Get Tenant
```http
GET /tenants/:id
Authorization: Bearer <token>
```

#### Update Tenant
```http
PATCH /tenants/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "branding": {
    "primaryColor": "#667eea",
    "logoUrl": "https://..."
  }
}
```

#### Get Tenant Stats
```http
GET /tenants/:id/stats
Authorization: Bearer <token>
```

### Members Module

#### List Members
```http
GET /members?page=1&limit=20&search=john
Authorization: Bearer <token>
```

#### Create Member
```http
POST /members
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "membershipTierId": "tier_id"
}
```

#### Update Member
```http
PATCH /members/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "status": "ACTIVE"
}
```

#### Delete Member
```http
DELETE /members/:id
Authorization: Bearer <token>
```

#### Import Members
```http
POST /members/import
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: members.csv
```

#### Export Members
```http
GET /members/export
Authorization: Bearer <token>
```

### Events Module

#### List Events
```http
GET /events?page=1&limit=20&category=workshop&upcoming=true
Authorization: Bearer <token>
```

#### Create Event
```http
POST /events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Annual Conference",
  "description": "Our yearly conference",
  "startDate": "2024-06-15",
  "startTime": "09:00",
  "endDate": "2024-06-15",
  "endTime": "17:00",
  "location": "Main Hall",
  "capacity": 100,
  "categoryId": "category_id"
}
```

#### Update Event
```http
PATCH /events/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "capacity": 150
}
```

#### Register for Event
```http
POST /events/:id/register
Authorization: Bearer <token>
```

#### Check-in Member
```http
POST /events/:id/checkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "memberId": "member_id",
  "qrCode": "qr_code_data"
}
```

#### Get Event Stats
```http
GET /events/:id/stats
Authorization: Bearer <token>
```

### Volunteer Module

#### List Opportunities
```http
GET /volunteer/opportunities?status=OPEN&page=1&limit=20
Authorization: Bearer <token>
```

#### Create Opportunity
```http
POST /volunteer/opportunities
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Event Setup",
  "description": "Help set up the event",
  "requiredSkills": "Organization",
  "hoursPerShift": 2
}
```

#### Apply for Opportunity
```http
POST /volunteer/opportunities/:id/apply
Authorization: Bearer <token>
```

#### List My Shifts
```http
GET /volunteer/my-shifts?upcoming=true
Authorization: Bearer <token>
```

#### Log Hours
```http
POST /volunteer/shifts/:id/log-hours
Authorization: Bearer <token>
Content-Type: application/json

{
  "hours": 3,
  "notes": "Great work!"
}
```

### Clubs Module

#### List Clubs
```http
GET /clubs?page=1&limit=20
Authorization: Bearer <token>
```

#### Create Club
```http
POST /clubs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Photography Club",
  "description": "For photography enthusiasts",
  "category": "HOBBY"
}
```

#### Join Club
```http
POST /clubs/:id/join
Authorization: Bearer <token>
```

#### Create Post
```http
POST /clubs/:id/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Check out this photo!",
  "imageUrl": "https://..."
}
```

#### List Posts
```http
GET /clubs/:id/posts?page=1&limit=20
Authorization: Bearer <token>
```

### Donations Module

#### List Campaigns
```http
GET /donations/campaigns?status=ACTIVE&page=1&limit=20
Authorization: Bearer <token>
```

#### Create Campaign
```http
POST /donations/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Annual Fundraiser",
  "description": "Help us reach our goal",
  "goalAmountCents": 500000,
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "allowRecurring": true
}
```

#### Update Campaign
```http
PATCH /donations/campaigns/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "PAUSED"
}
```

#### Create Donation Checkout
```http
POST /donations/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaignId": "campaign_id",
  "amountCents": 2500,
  "currency": "USD",
  "isRecurring": false,
  "donorEmail": "donor@example.com",
  "donorName": "John Doe"
}
```

#### List Donations
```http
GET /donations?page=1&limit=20&startDate=2024-01-01
Authorization: Bearer <token>
```

#### Export Donors
```http
GET /donations/export
Authorization: Bearer <token>
```

#### Generate Tax Receipt
```http
POST /donations/:id/tax-receipt
Authorization: Bearer <token>
```

### Webhooks Module

#### Create Webhook
```http
POST /webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "events": ["member.created", "event.registered"],
  "secret": "webhook_secret"
}
```

#### List Webhooks
```http
GET /webhooks
Authorization: Bearer <token>
```

#### Delete Webhook
```http
DELETE /webhooks/:id
Authorization: Bearer <token>
```

### Communications Module

#### Send Email
```http
POST /communications/send-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "member@example.com",
  "subject": "Welcome!",
  "template": "welcome",
  "data": {
    "name": "John"
  }
}
```

#### Send Bulk Email
```http
POST /communications/send-bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Event Reminder",
  "template": "event-reminder",
  "memberIds": ["id1", "id2"],
  "data": {
    "eventName": "Annual Conference"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per tenant

## Pagination

List endpoints support pagination:

```http
GET /resource?page=1&limit=20
```

Response includes:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Webhooks

OrgFlow sends webhooks for the following events:

- `member.created`
- `member.updated`
- `member.deleted`
- `event.created`
- `event.updated`
- `event.deleted`
- `registration.created`
- `registration.cancelled`
- `donation.completed`
- `donation.failed`

Webhook payload:

```json
{
  "event": "member.created",
  "timestamp": "2024-06-15T10:00:00Z",
  "tenantId": "tenant_id",
  "data": {
    "member": { ... }
  }
}
```

## Swagger UI

Interactive API documentation available at:
- Development: `http://localhost:4000/docs`
- Production: `https://api.orgflow.app/docs`
