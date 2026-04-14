'use client'

import { useState, useEffect } from 'react'
import { getWebhooks, createWebhook, deleteWebhook, toggleWebhook } from '@/lib/actions'
import { toast } from 'sonner'
import { Plus, Trash2, Webhook, CheckCircle, XCircle, Copy, RefreshCw } from 'lucide-react'

type Webhook = {
  id: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  lastTriggeredAt?: Date | null
  createdAt: Date
}

const AVAILABLE_EVENTS = [
  'member.created',
  'member.updated',
  'member.deleted',
  'event.created',
  'event.updated',
  'event.deleted',
  'event.registration.created',
  'event.registration.cancelled',
  'volunteer.shift.created',
  'volunteer.shift.updated',
  'volunteer.shift.deleted',
  'volunteer.shift.signup.created',
  'volunteer.shift.signup.cancelled',
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
  })
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null)

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      const data = await getWebhooks()
      setWebhooks(data as Webhook[])
    } catch (error) {
      console.error('Failed to load webhooks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createWebhook(formData)
      setFormData({ url: '', events: [] })
      setShowAddForm(false)
      loadWebhooks()
    } catch (error) {
      console.error('Failed to create webhook:', error)
      toast.error('Failed to create webhook. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return
    try {
      await deleteWebhook(id)
      loadWebhooks()
    } catch (error) {
      console.error('Failed to delete webhook:', error)
      toast.error('Failed to delete webhook. Please try again.')
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleWebhook(id, !isActive)
      loadWebhooks()
    } catch (error) {
      console.error('Failed to toggle webhook:', error)
      toast.error('Failed to toggle webhook. Please try again.')
    }
  }

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret)
    setCopiedSecret(secret)
    setTimeout(() => setCopiedSecret(null), 2000)
  }

  const toggleEvent = (event: string) => {
    if (formData.events.includes(event)) {
      setFormData({
        ...formData,
        events: formData.events.filter(e => e !== event),
      })
    } else {
      setFormData({
        ...formData,
        events: [...formData.events, event],
      })
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Webhooks</h1>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <p className="text-gray-600 mb-4">
          Webhooks allow external services to be notified when certain events happen in your organization. 
          Configure webhooks to receive real-time notifications.
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Webhook</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                required
                placeholder="https://your-server.com/webhook"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Events to Subscribe
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {AVAILABLE_EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Webhook
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ url: '', events: [] })
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No webhooks configured yet. Add your first webhook to start receiving notifications.
          </div>
        ) : (
          <div className="divide-y">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Webhook className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{webhook.url}</h3>
                      {webhook.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-600">
                        {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''} subscribed
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">
                        Created {new Date(webhook.createdAt).toLocaleDateString()}
                      </span>
                      {webhook.lastTriggeredAt && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-600">
                            Last triggered {new Date(webhook.lastTriggeredAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded px-3 py-1.5 font-mono text-sm text-gray-700">
                        {webhook.secret}
                      </div>
                      <button
                        onClick={() => handleCopySecret(webhook.secret)}
                        className="p-2 hover:bg-gray-200 rounded"
                        title="Copy secret"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                      {copiedSecret === webhook.secret && (
                        <span className="text-xs text-green-600">Copied!</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {webhook.events.slice(0, 3).map((event) => (
                        <span key={event} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {event}
                        </span>
                      ))}
                      {webhook.events.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          +{webhook.events.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleToggle(webhook.id, webhook.isActive)}
                      className="p-2 hover:bg-gray-100 rounded"
                      title={webhook.isActive ? 'Disable' : 'Enable'}
                    >
                      <RefreshCw className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="p-2 hover:bg-red-100 rounded text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
