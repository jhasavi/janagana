'use client'

import { useState, useEffect } from 'react'
import { getVolunteerOpportunities, createVolunteerOpportunity, deleteVolunteerOpportunity } from '@/lib/actions'
import { Plus, Trash2, Search, Users, MapPin, Calendar } from 'lucide-react'

type VolunteerOpportunity = {
  id: string
  title: string
  slug: string
  description?: string | null
  location?: string | null
  isVirtual: boolean
  startsAt?: Date | null
  endsAt?: Date | null
  isActive: boolean
  createdAt: Date
}

export default function VolunteersPage() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    isVirtual: false,
  })

  useEffect(() => {
    loadOpportunities()
  }, [])

  const loadOpportunities = async () => {
    try {
      const data = await getVolunteerOpportunities()
      setOpportunities(data as VolunteerOpportunity[])
    } catch (error) {
      console.error('Failed to load opportunities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createVolunteerOpportunity(formData)
      setFormData({ title: '', description: '', location: '', isVirtual: false })
      setShowAddForm(false)
      loadOpportunities()
    } catch (error) {
      console.error('Failed to save opportunity:', error)
      alert('Failed to save opportunity. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this volunteer opportunity?')) return
    try {
      await deleteVolunteerOpportunity(id)
      loadOpportunities()
    } catch (error) {
      console.error('Failed to delete opportunity:', error)
      alert('Failed to delete opportunity. Please try again.')
    }
  }

  const filteredOpportunities = opportunities.filter(o =>
    `${o.title} ${o.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Volunteer Opportunities</h1>
        <button
          onClick={() => {
            setFormData({ title: '', description: '', location: '', isVirtual: false })
            setShowAddForm(!showAddForm)
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Opportunity
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Volunteer Opportunity</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVirtual"
                checked={formData.isVirtual}
                onChange={(e) => setFormData({ ...formData, isVirtual: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isVirtual" className="text-sm text-gray-700">
                Virtual opportunity
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Opportunity
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ title: '', description: '', location: '', isVirtual: false })
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
        <div className="p-4 border-b flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No opportunities found' : 'No volunteer opportunities yet. Create your first opportunity!'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-4">
            {filteredOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{opportunity.title}</h3>
                    </div>
                    {opportunity.description && (
                      <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {opportunity.location && !opportunity.isVirtual && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {opportunity.location}
                        </div>
                      )}
                      {opportunity.isVirtual && (
                        <div className="flex items-center gap-1">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Virtual</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${opportunity.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {opportunity.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(opportunity.id)}
                    className="p-2 hover:bg-red-100 rounded text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
