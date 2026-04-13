'use client'

import { useState, useEffect } from 'react'
import { getUserTenant, updateTenant } from '@/lib/actions'
import { Building2, Upload } from 'lucide-react'

export default function OrganizationSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [tenant, setTenant] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    primaryColor: '',
  })

  useEffect(() => {
    loadTenant()
  }, [])

  const loadTenant = async () => {
    try {
      const data = await getUserTenant()
      if (data) {
        setTenant(data)
        setFormData({
          name: data.name,
          slug: data.slug,
          logoUrl: data.logoUrl || '',
          primaryColor: data.primaryColor || '',
        })
      }
    } catch (error) {
      console.error('Failed to load tenant:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updateTenant(formData)
      await loadTenant()
      alert('Organization settings updated successfully!')
    } catch (error) {
      console.error('Failed to update tenant:', error)
      alert('Failed to update organization settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Organization Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Needham Community Center"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Slug (URL)
            </label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., needham-community"
            />
            <p className="text-sm text-gray-500 mt-1">
              This will be your organization&apos;s unique URL
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg"
                placeholder="https://example.com/logo.png"
              />
              <button
                type="button"
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
            {formData.logoUrl && (
              <div className="mt-2">
                <img src={formData.logoUrl} alt="Logo preview" className="h-16 w-auto" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={formData.primaryColor || '#2563eb'}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-12 h-10 border rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg"
                placeholder="#2563eb"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
