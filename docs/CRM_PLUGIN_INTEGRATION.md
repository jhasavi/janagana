# JanaGana CRM Plugin Integration Guide

This guide explains how to integrate the JanaGana CRM plugin into your external websites to provide CRM, Event, and Membership management capabilities.

## Overview

The JanaGana CRM plugin provides a REST API that allows external websites to:
- Manage contacts (CRM)
- Track deals and sales pipelines
- Log activities (calls, emails, meetings)
- Manage tasks and follow-ups
- Sync with membership and event data

## Architecture

- **Multi-tenant**: Each tenant (organization) has isolated data
- **API Key Authentication**: Secure API access using tenant-specific API keys
- **Automatic Data Sync**: Members sync to Contacts, Events sync to Activities
- **RESTful API**: Standard HTTP methods for CRUD operations

## Getting Started

### 1. Get Your API Key

Contact your JanaGana administrator to generate an API key for your tenant. API keys are:
- Tenant-specific (isolates data per organization)
- Hashed and stored securely
- Can be revoked or expired
- Tracked for usage analytics

### 2. API Base URL

```
https://your-janagana-instance.com/api/plugin/crm
```

For local development:
```
http://localhost:3000/api/plugin/crm
```

### 3. Authentication

Include your API key in the request header:

```bash
curl -H "x-api-key: your_api_key_here" \
  https://your-janagana-instance.com/api/plugin/crm/contacts
```

Or using Bearer token:

```bash
curl -H "Authorization: Bearer your_api_key_here" \
  https://your-janagana-instance.com/api/plugin/crm/contacts
```

## API Endpoints

### Contacts

#### List Contacts

```bash
GET /api/plugin/crm/contacts
```

Query Parameters:
- `page` (default: 1)
- `limit` (default: 50)
- `search` - Search by name or email
- `companyId` - Filter by company

Response:
```json
{
  "contacts": [
    {
      "id": "clxxxx",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "jobTitle": "CEO",
      "companyId": "clxxxx",
      "company": { ... },
      "memberId": "clxxxx",
      "member": { ... },
      "source": "website",
      "notes": "...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### Create Contact

```bash
POST /api/plugin/crm/contacts
```

Request Body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "jobTitle": "CEO",
  "linkedinUrl": "https://linkedin.com/in/johndoe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "companyId": "clxxxx",
  "memberId": "clxxxx",
  "source": "website",
  "notes": "Lead from contact form"
}
```

### Companies

#### List Companies

```bash
GET /api/plugin/crm/companies
```

Query Parameters:
- `page` (default: 1)
- `limit` (default: 50)
- `search` - Search by name or domain

Response:
```json
{
  "companies": [
    {
      "id": "clxxxx",
      "name": "Acme Corp",
      "domain": "acme.com",
      "industry": "Technology",
      "size": "51-200",
      "website": "https://acme.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94102",
      "country": "US",
      "description": "Technology company",
      "_count": {
        "contacts": 5,
        "deals": 3
      }
    }
  ],
  "pagination": { ... }
}
```

#### Create Company

```bash
POST /api/plugin/crm/companies
```

Request Body:
```json
{
  "name": "Acme Corp",
  "domain": "acme.com",
  "industry": "Technology",
  "size": "51-200",
  "website": "https://acme.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94102",
  "country": "US",
  "description": "Technology company"
}
```

### Deals

#### List Deals

```bash
GET /api/plugin/crm/deals
```

Query Parameters:
- `page` (default: 1)
- `limit` (default: 50)
- `stage` - Filter by stage (LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST)
- `contactId` - Filter by contact
- `companyId` - Filter by company

Response:
```json
{
  "deals": [
    {
      "id": "clxxxx",
      "contactId": "clxxxx",
      "companyId": "clxxxx",
      "title": "Enterprise License",
      "description": "Annual enterprise license",
      "valueCents": 5000000,
      "currency": "USD",
      "stage": "PROPOSAL",
      "probability": 60,
      "expectedCloseDate": "2024-12-31T00:00:00Z",
      "source": "website",
      "sourceId": "form_123",
      "contact": { ... },
      "company": { ... },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### Create Deal

```bash
POST /api/plugin/crm/deals
```

Request Body:
```json
{
  "contactId": "clxxxx",
  "companyId": "clxxxx",
  "title": "Enterprise License",
  "description": "Annual enterprise license",
  "valueCents": 5000000,
  "currency": "USD",
  "stage": "LEAD",
  "probability": 10,
  "expectedCloseDate": "2024-12-31T00:00:00Z",
  "source": "website",
  "sourceId": "form_123"
}
```

### Activities

#### List Activities

```bash
GET /api/plugin/crm/activities
```

Query Parameters:
- `page` (default: 1)
- `limit` (default: 50)
- `type` - Filter by type (CALL, EMAIL, MEETING, NOTE, TASK, OTHER)
- `contactId` - Filter by contact
- `dealId` - Filter by deal

Response:
```json
{
  "activities": [
    {
      "id": "clxxxx",
      "contactId": "clxxxx",
      "dealId": "clxxxx",
      "type": "MEETING",
      "title": "Product Demo",
      "description": "Demo of enterprise features",
      "direction": "outbound",
      "duration": 60,
      "location": "Zoom",
      "completed": true,
      "completedAt": "2024-01-01T00:00:00Z",
      "contact": { ... },
      "deal": { ... },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### Create Activity

```bash
POST /api/plugin/crm/activities
```

Request Body:
```json
{
  "contactId": "clxxxx",
  "dealId": "clxxxx",
  "type": "MEETING",
  "title": "Product Demo",
  "description": "Demo of enterprise features",
  "direction": "outbound",
  "duration": 60,
  "location": "Zoom",
  "completed": true,
  "completedAt": "2024-01-01T00:00:00Z"
}
```

### Tasks

#### List Tasks

```bash
GET /api/plugin/crm/tasks
```

Query Parameters:
- `page` (default: 1)
- `limit` (default: 50)
- `status` - Filter by status (TODO, IN_PROGRESS, COMPLETED, CANCELLED)
- `contactId` - Filter by contact
- `dealId` - Filter by deal

Response:
```json
{
  "tasks": [
    {
      "id": "clxxxx",
      "contactId": "clxxxx",
      "dealId": "clxxxx",
      "title": "Follow up on proposal",
      "description": "Send revised proposal",
      "status": "TODO",
      "priority": "HIGH",
      "dueDate": "2024-01-15T00:00:00Z",
      "completed": false,
      "contact": { ... },
      "deal": { ... },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### Create Task

```bash
POST /api/plugin/crm/tasks
```

Request Body:
```json
{
  "contactId": "clxxxx",
  "dealId": "clxxxx",
  "title": "Follow up on proposal",
  "description": "Send revised proposal",
  "status": "TODO",
  "priority": "HIGH",
  "dueDate": "2024-01-15T00:00:00Z"
}
```

## Data Sync

The CRM automatically syncs data with the membership and event systems:

### Member → Contact Sync
When a member is created or updated, a corresponding Contact record is automatically created/updated in the CRM. This ensures all members are available in the CRM for sales and relationship management.

### Event Registration → Activity Sync
When a member registers for an event, an Activity record is automatically created in the CRM to track the engagement.

### Donation → Activity Sync
When a donation is made, an Activity record is automatically created to track the contribution.

## Deal Stages

Deals progress through these stages:
- `LEAD` - Initial contact
- `QUALIFIED` - Qualified prospect
- `PROPOSAL` - Proposal sent
- `NEGOTIATION` - In negotiation
- `CLOSED_WON` - Deal won
- `CLOSED_LOST` - Deal lost

## Activity Types

Activities can be:
- `CALL` - Phone call
- `EMAIL` - Email communication
- `MEETING` - In-person or virtual meeting
- `NOTE` - General note
- `TASK` - Task completion
- `OTHER` - Other activity

## Task Priorities

Tasks can have these priorities:
- `LOW` - Low priority
- `MEDIUM` - Medium priority
- `HIGH` - High priority
- `URGENT` - Urgent

## Error Handling

All endpoints return standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized (invalid API key)
- `409` - Conflict (duplicate resource)
- `500` - Server error

Error response format:
```json
{
  "error": "Error message here"
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse. Contact your administrator for specific rate limits for your tenant.

## Webhooks

Webhooks can be configured to receive notifications when CRM data changes. Contact your administrator to set up webhook endpoints for your tenant.

## Security

- API keys are hashed using SHA-256 before storage
- All API requests use HTTPS
- Tenant data is fully isolated
- API key usage is tracked and logged
- API keys can be revoked at any time

## Example Integration

### JavaScript/TypeScript

```typescript
const API_KEY = 'your_api_key_here'
const BASE_URL = 'https://your-janagana-instance.com/api/plugin/crm'

async function createContact(contactData: any) {
  const response = await fetch(`${BASE_URL}/contacts`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contactData),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to create contact: ${response.statusText}`)
  }
  
  return response.json()
}

// Usage
const contact = await createContact({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  source: 'website',
})
```

### Python

```python
import requests

API_KEY = 'your_api_key_here'
BASE_URL = 'https://your-janagana-instance.com/api/plugin/crm'

def create_contact(contact_data):
    response = requests.post(
        f'{BASE_URL}/contacts',
        headers={'x-api-key': API_KEY},
        json=contact_data
    )
    response.raise_for_status()
    return response.json()

# Usage
contact = create_contact({
    'firstName': 'John',
    'lastName': 'Doe',
    'email': 'john@example.com',
    'source': 'website'
})
```

### PHP

```php
$apiKey = 'your_api_key_here';
$baseUrl = 'https://your-janagana-instance.com/api/plugin/crm';

function createContact($contactData) {
    global $apiKey, $baseUrl;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $baseUrl . '/contacts');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'x-api-key: ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($contactData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 201) {
        throw new Exception('Failed to create contact');
    }
    
    return json_decode($response, true);
}

// Usage
$contact = createContact([
    'firstName' => 'John',
    'lastName' => 'Doe',
    'email' => 'john@example.com',
    'source' => 'website'
]);
```

## Support

For integration support or questions, contact your JanaGana administrator or open an issue in the project repository.
