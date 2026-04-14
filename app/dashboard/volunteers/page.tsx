'use client'

import { useState, useEffect } from 'react'
import { 
  getVolunteerOpportunities, 
  createVolunteerOpportunity, 
  deleteVolunteerOpportunity, 
  updateVolunteerOpportunity,
  getVolunteerShifts,
  createVolunteerShift,
  deleteVolunteerShift
} from '@/lib/actions'
import { toast } from 'sonner'
import { Plus, Trash2, Search, Users, MapPin, Calendar, Edit, Clock, X, ChevronRight } from 'lucide-react'

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

type VolunteerShift = {
  id: string
  name: string
  description?: string | null
  startsAt: Date
  endsAt: Date
  capacity: number
  location?: string | null
  status: string
  signups: any[]
}

export default function VolunteersPage() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingOpportunity, setEditingOpportunity] = useState<VolunteerOpportunity | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<VolunteerOpportunity | null>(null)
  const [shifts, setShifts] = useState<VolunteerShift[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    isVirtual: false,
  })
  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    description: '',
    startsAt: '',
    endsAt: '',
    capacity: 1,
    location: '',
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

  const loadShifts = async (opportunityId: string) => {
    try {
      const data = await getVolunteerShifts(opportunityId)
      setShifts(data as VolunteerShift[])
    } catch (error) {
      console.error('Failed to load shifts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingOpportunity) {
        await updateVolunteerOpportunity(editingOpportunity.id, formData)
        setEditingOpportunity(null)
      } else {
        await createVolunteerOpportunity(formData)
      }
      setFormData({ title: '', description: '', location: '', isVirtual: false })
      setShowAddForm(false)
      loadOpportunities()
    } catch (error) {
      console.error('Failed to save opportunity:', error)
      toast.error('Failed to save opportunity. Please try again.')
    }
  }

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOpportunity) return
    try {
      await createVolunteerShift({
        opportunityId: selectedOpportunity.id,
        name: shiftFormData.name,
        description: shiftFormData.description,
        startsAt: new Date(shiftFormData.startsAt),
        endsAt: new Date(shiftFormData.endsAt),
        capacity: shiftFormData.capacity,
        location: shiftFormData.location,
      })
      setShiftFormData({ name: '', description: '', startsAt: '', endsAt: '', capacity: 1, location: '' })
      setShowShiftForm(false)
      loadShifts(selectedOpportunity.id)
    } catch (error) {
      console.error('Failed to save shift:', error)
      toast.error('Failed to save shift. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this volunteer opportunity?')) return
    try {
      await deleteVolunteerOpportunity(id)
      loadOpportunities()
    } catch (error) {
      console.error('Failed to delete opportunity:', error)
      toast.error('Failed to delete opportunity. Please try again.')
    }
  }

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return
    try {
      await deleteVolunteerShift(id)
      if (selectedOpportunity) loadShifts(selectedOpportunity.id)
    } catch (error) {
      console.error('Failed to delete shift:', error)
      toast.error('Failed to delete shift. Please try again.')
    }
  }

  const handleEdit = (opportunity: VolunteerOpportunity) => {
    setEditingOpportunity(opportunity)
    setFormData({
      title: opportunity.title,
      description: opportunity.description || '',
      location: opportunity.location || '',
      isVirtual: opportunity.isVirtual,
    })
    setShowAddForm(true)
  }

  const handleViewShifts = (opportunity: VolunteerOpportunity) => {
    setSelectedOpportunity(opportunity)
    loadShifts(opportunity.id)
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
            setEditingOpportunity(null)
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
          <h2 className="text-xl font-semibold mb-4">
            {editingOpportunity ? 'Edit Volunteer Opportunity' : 'Add New Volunteer Opportunity'}
          </h2>
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
                {editingOpportunity ? 'Update Opportunity' : 'Add Opportunity'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingOpportunity(null)
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

      {selectedOpportunity && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{selectedOpportunity.title} - Shifts</h2>
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-1"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to all opportunities
              </button>
            </div>
            <button
              onClick={() => setShowShiftForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Shift
            </button>
          </div>

          {showShiftForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3">Add New Shift</h3>
              <form onSubmit={handleShiftSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                  <input
                    type="text"
                    required
                    value={shiftFormData.name}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={shiftFormData.startsAt}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, startsAt: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={shiftFormData.endsAt}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, endsAt: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={shiftFormData.capacity}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, capacity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                    <input
                      type="text"
                      value={shiftFormData.location}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, location: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    value={shiftFormData.description}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Shift
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowShiftForm(false)
                      setShiftFormData({ name: '', description: '', startsAt: '', endsAt: '', capacity: 1, location: '' })
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {shifts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No shifts yet. Add your first shift!
            </div>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div key={shift.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold">{shift.name}</h4>
                    </div>
                    {shift.description && (
                      <p className="text-sm text-gray-600 mb-1">{shift.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(shift.startsAt).toLocaleDateString()} {new Date(shift.startsAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(shift.endsAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {shift.signups.length} / {shift.capacity}
                      </div>
                      {shift.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {shift.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteShift(shift.id)}
                    className="p-2 hover:bg-red-100 rounded text-red-600"
                    title="Delete shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              <div key={opportunity.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleViewShifts(opportunity)}>
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
                      <span className="text-xs text-blue-600 flex items-center gap-1">
                        View shifts <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(opportunity)}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(opportunity.id)}
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
