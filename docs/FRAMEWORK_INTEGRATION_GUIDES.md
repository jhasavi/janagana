# Framework-Specific Integration Guides

This guide provides step-by-step instructions for integrating JanaGana CRM plugin into different web frameworks.

## Overview

JanaGana provides a REST API that can be called from any web framework. The integration requires:

1. **API Key** - Generated from JanaGana dashboard
2. **API URL** - Your JanaGana instance URL (e.g., https://janagana.namasteneedham.com/api/plugin)
3. **HTTP Client** - To make API requests

## Getting Your API Key (UI-Based)

### Step 1: Sign In to JanaGana

Go to your JanaGana instance (e.g., https://janagana.namasteneedham.com) and sign in.

### Step 2: Navigate to Settings

1. Go to Dashboard
2. Click on "Settings" in the sidebar
3. Select "API Keys"

### Step 3: Generate API Key

1. Click "Generate New API Key"
2. Copy the API key (format: `jg_live_...`)
3. Store it securely in your environment variables

### Step 4: Note Your API URL

Your API URL is: `https://your-janagana-domain.com/api/plugin`

Replace `your-janagana-domain.com` with your actual JanaGana domain.

---

## Next.js Integration

### 1. Add Environment Variables

Create or update `.env.local`:

```env
JANAGANA_API_URL=https://your-janagana-domain.com/api/plugin
JANAGANA_API_KEY=your_api_key_here
```

For production, add these to your Vercel/Netlify environment variables.

### 2. Create API Client

Create `lib/janagana.ts`:

```typescript
const API_URL = process.env.JANAGANA_API_URL
const API_KEY = process.env.JANAGANA_API_KEY

async function janaganaRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`JanaGana API error: ${error.error || response.statusText}`)
  }

  return response.json()
}

// Create a contact/member
export async function createMember(data: {
  email: string
  firstName: string
  lastName: string
  phone?: string
}) {
  return janaganaRequest('/crm/contacts', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      source: 'your-website',
    }),
  })
}

// Fetch events
export async function getEvents() {
  return janaganaRequest('/events')
}

// Register for event
export async function registerForEvent(data: {
  eventId: string
  email: string
  firstName: string
  lastName: string
  phone?: string
}) {
  return janaganaRequest('/event-registrations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

### 3. Integrate on Signup

In your signup page/component:

```typescript
import { createMember } from '@/lib/janagana'

async function handleSignup(formData: FormData) {
  // Your existing signup logic
  await yourAuthSystem.signup(formData)
  
  // Create member in JanaGana
  try {
    await createMember({
      email: formData.get('email'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
    })
  } catch (error) {
    console.error('Failed to create JanaGana member:', error)
    // Don't block signup if JanaGana fails
  }
}
```

### 4. Display Events

Create `app/events/page.tsx`:

```typescript
import { getEvents } from '@/lib/janagana'

export default async function EventsPage() {
  const { events } = await getEvents()

  return (
    <div>
      <h1>Upcoming Events</h1>
      {events.map((event) => (
        <div key={event.id}>
          <h2>{event.title}</h2>
          <p>{event.description}</p>
          <p>{new Date(event.startDate).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## React Integration

### 1. Add Environment Variables

Create `.env`:

```env
REACT_APP_JANAGANA_API_URL=https://your-janagana-domain.com/api/plugin
REACT_APP_JANAGANA_API_KEY=your_api_key_here
```

### 2. Create API Client

Create `src/lib/janagana.js`:

```javascript
const API_URL = process.env.REACT_APP_JANAGANA_API_URL
const API_KEY = process.env.REACT_APP_JANAGANA_API_KEY

async function janaganaRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`JanaGana API error: ${error.error || response.statusText}`)
  }

  return response.json()
}

export const janaganaAPI = {
  createMember: (data) => janaganaRequest('/crm/contacts', {
    method: 'POST',
    body: JSON.stringify({ ...data, source: 'your-website' }),
  }),

  getEvents: () => janaganaRequest('/events'),

  registerForEvent: (data) => janaganaRequest('/event-registrations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}
```

### 3. Use in Components

```javascript
import { useState, useEffect } from 'react'
import { janaganaAPI } from './lib/janagana'

function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    janaganaAPI.getEvents()
      .then(data => setEvents(data.events))
      .catch(error => console.error(error))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Upcoming Events</h1>
      {events.map(event => (
        <div key={event.id}>
          <h2>{event.title}</h2>
          <p>{event.description}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## Vanilla JavaScript Integration

### 1. Add Environment Variables

Create `.env` (or use a config file):

```javascript
const config = {
  JANAGANA_API_URL: 'https://your-janagana-domain.com/api/plugin',
  JANAGANA_API_KEY: 'your_api_key_here',
}
```

### 2. Create API Client

Create `js/janagana.js`:

```javascript
const API_URL = config.JANAGANA_API_URL
const API_KEY = config.JANAGANA_API_KEY

async function janaganaRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`JanaGana API error: ${error.error || response.statusText}`)
  }

  return response.json()
}

const janaganaAPI = {
  createMember: (data) => janaganaRequest('/crm/contacts', {
    method: 'POST',
    body: JSON.stringify({ ...data, source: 'your-website' }),
  }),

  getEvents: () => janaganaRequest('/events'),

  registerForEvent: (data) => janaganaRequest('/event-registrations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}
```

### 3. Use in Your Code

```javascript
// On form submit
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const formData = {
    email: document.getElementById('email').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
  }

  try {
    await janaganaAPI.createMember(formData)
    alert('Member created successfully!')
  } catch (error) {
    console.error(error)
    alert('Failed to create member')
  }
})

// Load events
async function loadEvents() {
  try {
    const data = await janaganaAPI.getEvents()
    const eventsContainer = document.getElementById('events')
    
    data.events.forEach(event => {
      const eventDiv = document.createElement('div')
      eventDiv.innerHTML = `
        <h2>${event.title}</h2>
        <p>${event.description}</p>
        <p>${new Date(event.startDate).toLocaleDateString()}</p>
      `
      eventsContainer.appendChild(eventDiv)
    })
  } catch (error) {
    console.error(error)
  }
}

loadEvents()
```

---

## PHP Integration

### 1. Add Environment Variables

Create `.env`:

```env
JANAGANA_API_URL=https://your-janagana-domain.com/api/plugin
JANAGANA_API_KEY=your_api_key_here
```

### 2. Create API Client

Create `includes/janagana.php`:

```php
<?php
class JanaganaAPI {
    private $apiUrl;
    private $apiKey;

    public function __construct() {
        $this->apiUrl = getenv('JANAGANA_API_URL');
        $this->apiKey = getenv('JANAGANA_API_KEY');
    }

    private function request($endpoint, $data = null, $method = 'GET') {
        $ch = curl_init();
        
        $url = $this->apiUrl . $endpoint;
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'x-api-key: ' . $this->apiKey,
            'Content-Type: application/json',
        ]);
        
        if ($method === 'POST' && $data) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("JanaGana API error: " . $response);
        }
        
        return json_decode($response, true);
    }

    public function createMember($data) {
        return $this->request('/crm/contacts', array_merge($data, ['source' => 'your-website']), 'POST');
    }

    public function getEvents() {
        return $this->request('/events');
    }

    public function registerForEvent($data) {
        return $this->request('/event-registrations', $data, 'POST');
    }
}
```

### 3. Use in Your PHP Code

```php
<?php
require_once 'includes/janagana.php';

$janagana = new JanaganaAPI();

// Create member on signup
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $janagana->createMember([
            'email' => $_POST['email'],
            'firstName' => $_POST['firstName'],
            'lastName' => $_POST['lastName'],
        ]);
        echo "Member created successfully!";
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage();
    }
}

// Get events
try {
    $events = $janagana->getEvents();
    foreach ($events['events'] as $event) {
        echo "<h2>" . htmlspecialchars($event['title']) . "</h2>";
        echo "<p>" . htmlspecialchars($event['description']) . "</p>";
    }
} catch (Exception $e) {
    echo "Error loading events: " . $e->getMessage();
}
?>
```

---

## Python (Django/Flask) Integration

### 1. Add Environment Variables

Create `.env`:

```env
JANAGANA_API_URL=https://your-janagana-domain.com/api/plugin
JANAGANA_API_KEY=your_api_key_here
```

### 2. Create API Client

Create `janagana_client.py`:

```python
import os
import requests
from dotenv import load_dotenv

load_dotenv()

class JanaganaAPI:
    def __init__(self):
        self.api_url = os.getenv('JANAGANA_API_URL')
        self.api_key = os.getenv('JANAGANA_API_KEY')
        self.headers = {
            'x-api-key': self.api_key,
            'Content-Type': 'application/json'
        }

    def _request(self, endpoint, data=None, method='GET'):
        url = f"{self.api_url}{endpoint}"
        
        if method == 'POST':
            response = requests.post(url, json=data, headers=self.headers)
        else:
            response = requests.get(url, headers=self.headers)
        
        response.raise_for_status()
        return response.json()

    def create_member(self, data):
        return self._request('/crm/contacts', {**data, 'source': 'your-website'}, 'POST')

    def get_events(self):
        return self._request('/events')

    def register_for_event(self, data):
        return self._request('/event-registrations', data, 'POST')
```

### 3. Use in Django View

```python
from django.http import JsonResponse
from janagana_client import JanaganaAPI

def events_view(request):
    api = JanaganaAPI()
    try:
        data = api.get_events()
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
```

### 4. Use in Flask Route

```python
from flask import Flask, jsonify
from janagana_client import JanaganaAPI

app = Flask(__name__)
api = JanaganaAPI()

@app.route('/events')
def events():
    try:
        data = api.get_events()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

---

## Ruby on Rails Integration

### 1. Add Environment Variables

Create `.env`:

```env
JANAGANA_API_URL=https://your-janagana-domain.com/api/plugin
JANAGANA_API_KEY=your_api_key_here
```

### 2. Create API Client

Create `app/services/janagana_api.rb`:

```ruby
class JanaganaAPI
  def initialize
    @api_url = ENV['JANAGANA_API_URL']
    @api_key = ENV['JANAGANA_API_KEY']
  end

  def request(endpoint, data = nil, method = :get)
    headers = {
      'x-api-key' => @api_key,
      'Content-Type' => 'application/json'
    }

    url = "#{@api_url}#{endpoint}"

    if method == :post
      response = HTTParty.post(url, body: data.to_json, headers: headers)
    else
      response = HTTParty.get(url, headers: headers)
    end

    unless response.success?
      raise "JanaGana API error: #{response.body}"
    end

    JSON.parse(response.body)
  end

  def create_member(data)
    request('/crm/contacts', data.merge(source: 'your-website'), :post)
  end

  def get_events
    request('/events')
  end

  def register_for_event(data)
    request('/event-registrations', data, :post)
  end
end
```

### 3. Use in Controller

```ruby
class EventsController < ApplicationController
  def index
    api = JanaganaAPI.new
    @events = api.get_events['events']
  rescue => e
    flash[:error] = "Failed to load events: #{e.message}"
    @events = []
  end
end
```

---

## API Endpoints Reference

### Contacts (Members)

**Create Contact**
```
POST /crm/contacts
Body: {
  email: string,
  firstName: string,
  lastName: string,
  phone?: string
}
```

**List Contacts**
```
GET /crm/contacts?page=1&limit=50&search=query
```

### Events

**List Events**
```
GET /events?status=PUBLISHED
```

### Event Registrations

**Register for Event**
```
POST /event-registrations
Body: {
  eventId: string,
  email: string,
  firstName: string,
  lastName: string,
  phone?: string
}
```

### Other CRM Endpoints

- `/crm/companies` - Manage companies
- `/crm/deals` - Manage deals/pipeline
- `/crm/activities` - Log activities
- `/crm/tasks` - Manage tasks

---

## Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Use different API keys for different environments**
   - Development API key
   - Staging API key
   - Production API key

3. **Rotate API keys regularly**
   - Generate new keys from JanaGana dashboard
   - Update environment variables
   - Delete old keys

4. **Implement rate limiting on your side**
   - Cache API responses
   - Don't make unnecessary API calls

5. **Handle errors gracefully**
   - Don't block user actions if JanaGana API fails
   - Log errors for debugging
   - Show user-friendly error messages

---

## Testing Your Integration

### Test API Connection

```bash
curl -H "x-api-key: your_api_key" \
  https://your-janagana-domain.com/api/plugin/crm/contacts
```

### Test Member Creation

```bash
curl -X POST \
  -H "x-api-key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}' \
  https://your-janagana-domain.com/api/plugin/crm/contacts
```

### Test Events Fetch

```bash
curl -H "x-api-key: your_api_key" \
  https://your-janagana-domain.com/api/plugin/events
```

---

## Support

For issues or questions:
- Check the main integration guide: `CRM_PLUGIN_INTEGRATION.md`
- Review API documentation in JanaGana dashboard
- Contact support through your JanaGana instance
