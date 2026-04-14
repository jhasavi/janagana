'use client'

import { useState, useEffect } from 'react'
import { getApiKeys, createApiKey, deleteApiKey, toggleApiKey } from '@/lib/actions'
import { toast } from 'sonner'
import { Plus, Trash2, Key, CheckCircle, XCircle, Copy, RefreshCw, Clock } from 'lucide-react'

type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  scope: string
  isActive: boolean
  lastUsedAt?: Date | null
  expiresAt?: Date | null
  rateLimit: number
  createdAt: Date
}

const SCOPES = ['READ', 'WRITE', 'ADMIN']

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    scope: 'READ',
    rateLimit: 1000,
  })
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const data = await getApiKeys()
      setApiKeys(data as ApiKey[])
    } catch (error) {
      console.error('Failed to load API keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createApiKey(formData)
      // The server returns the plaintext key once — store it for display
      setNewlyCreatedKey((result as any).plainTextKey)
      setFormData({ name: '', scope: 'READ', rateLimit: 1000 })
      setShowAddForm(false)
      loadApiKeys()
    } catch (error) {
      console.error('Failed to create API key:', error)
      toast.error('Failed to create API key. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return
    try {
      await deleteApiKey(id)
      loadApiKeys()
    } catch (error) {
      console.error('Failed to delete API key:', error)
      toast.error('Failed to delete API key. Please try again.')
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleApiKey(id, !isActive)
      loadApiKeys()
    } catch (error) {
      console.error('Failed to toggle API key:', error)
      toast.error('Failed to toggle API key. Please try again.')
    }
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">API Keys</h1>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <p className="text-gray-600 mb-4">
          API keys allow external applications and scripts to interact with your organization&apos;s data programmatically.
          Create keys with appropriate scopes to control access.
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {newlyCreatedKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Your New API Key</h3>
              <p className="text-sm text-yellow-800 mb-3">
                Copy this key now. You won&apos;t be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-yellow-300 rounded px-3 py-2 font-mono text-sm">
                  {newlyCreatedKey}
                </div>
                <button
                  onClick={() => handleCopyKey(newlyCreatedKey)}
                  className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copiedKey === newlyCreatedKey && (
                  <span className="text-sm text-green-700">Copied!</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="text-yellow-700 hover:text-yellow-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New API Key</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Production App, Development Script"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope
              </label>
              <select
                required
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="READ">Read Only - Can view data</option>
                <option value="WRITE">Write - Can create and update data</option>
                <option value="ADMIN">Admin - Full access including deletions</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Limit (requests per hour)
              </label>
              <input
                type="number"
                required
                min="1"
                max="10000"
                value={formData.rateLimit}
                onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 1000 requests per hour</p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Key
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ name: '', scope: 'READ', rateLimit: 1000 })
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
        ) : apiKeys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No API keys created yet. Create your first key to enable API access.
          </div>
        ) : (
          <div className="divide-y">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{apiKey.name}</h3>
                      {apiKey.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-gray-100 rounded px-3 py-1.5 font-mono text-sm text-gray-700">
                        {apiKey.keyPrefix}...
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {apiKey.scope}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Rate limit: {apiKey.rateLimit}/hour</span>
                      <span>Created {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                      {apiKey.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Expires {new Date(apiKey.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {apiKey.lastUsedAt && (
                        <span>Last used {new Date(apiKey.lastUsedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleToggle(apiKey.id, apiKey.isActive)}
                      className="p-2 hover:bg-gray-100 rounded"
                      title={apiKey.isActive ? 'Disable' : 'Enable'}
                    >
                      <RefreshCw className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(apiKey.id)}
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
