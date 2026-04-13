'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTenant } from '@/lib/actions'

export default function OnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })

  const validateForm = () => {
    const newErrors: { name?: string; slug?: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Organization name must be at least 2 characters'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Organization slug is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Slug must be at least 3 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      await createTenant(formData)
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Failed to create tenant:', error)
      if (error.message?.includes('Unique constraint')) {
        setErrors({ slug: 'This slug is already taken. Please choose another.' })
      } else {
        alert('Failed to create organization. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Jana Gana
        </h1>
        <p className="text-gray-600 mb-8">
          Let&apos;s set up your organization
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              placeholder="e.g., Needham Community Center"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              Organization Slug (URL)
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 ${errors.slug ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              placeholder="e.g., needham-community"
            />
            <p className="text-sm text-gray-500 mt-1">
              This will be your organization&apos;s unique URL
            </p>
            {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Creating Organization...' : 'Create Organization'}
          </button>
        </form>
      </div>
    </div>
  )
}
