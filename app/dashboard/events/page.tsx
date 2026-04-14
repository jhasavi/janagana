'use client'

import { useState, useEffect } from 'react'
import { getEvents, createEvent, deleteEvent, updateEvent, getMembers, registerForEvent, getMemberRegistrations } from '@/lib/actions'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, Search, Calendar, Users, ChevronRight, UserPlus, CheckCircle, XCircle } from 'lucide-react'

type Event = {
  id: string
  title: string
  description?: string | null
  startsAt: Date
  endsAt?: Date | null
  location?: string | null
  status: string
}

type Registration = {
  id: string
  status: string
  confirmationCode?: string | null
  registeredAt: Date
  member: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    location: '',
  })
  const [selectedMemberId, setSelectedMemberId] = useState('')

  useEffect(() => {
    loadEvents()
    loadMembers()
  }, [])

  const loadEvents = async () => {
    try {
      const data = await getEvents()
      setEvents(data as Event[])
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMembers = async () => {
    try {
      const data = await getMembers()
      setMembers(data as any[])
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const loadRegistrations = async (eventId: string) => {
    try {
      const allRegistrations: Registration[] = []
      for (const member of members) {
        const memberRegs = await getMemberRegistrations(member.id)
        const eventRegs = memberRegs.filter((reg: any) => reg.eventId === eventId)
        allRegistrations.push(...eventRegs.map((reg: any) => ({
          ...reg,
          member: {
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
          },
        })))
      }
      setRegistrations(allRegistrations)
    } catch (error) {
      console.error('Failed to load registrations:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const eventData = {
        title: formData.title,
        description: formData.description || undefined,
        startsAt: new Date(formData.startsAt),
        endsAt: formData.endsAt ? new Date(formData.endsAt) : undefined,
        location: formData.location || undefined,
      }

      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData)
        setEditingEvent(null)
      } else {
        await createEvent(eventData)
      }
      setFormData({ title: '', description: '', startsAt: '', endsAt: '', location: '' })
      setShowAddForm(false)
      loadEvents()
    } catch (error) {
      console.error('Failed to save event:', error)
      toast.error('Failed to save event. Please try again.')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent || !selectedMemberId) return
    try {
      await registerForEvent(selectedEvent.id, selectedMemberId)
      setSelectedMemberId('')
      setShowRegisterForm(false)
      loadRegistrations(selectedEvent.id)
    } catch (error) {
      console.error('Failed to register member:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to register member. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    try {
      await deleteEvent(id)
      loadEvents()
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast.error('Failed to delete event. Please try again.')
    }
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      startsAt: new Date(event.startsAt).toISOString().slice(0, 16),
      endsAt: event.endsAt ? new Date(event.endsAt).toISOString().slice(0, 16) : '',
      location: event.location || '',
    })
    setShowAddForm(true)
  }

  const handleViewRegistrations = (event: Event) => {
    setSelectedEvent(event)
    loadRegistrations(event.id)
  }

  const filteredEvents = events.filter(e =>
    `${e.title} ${e.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (selectedEvent) {
    return (
      <div className="p-8">
        <button onClick={() => setSelectedEvent(null)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Events
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedEvent.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(selectedEvent.startsAt).toLocaleDateString()} at{' '}
            {new Date(selectedEvent.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {selectedEvent.location && <span>• {selectedEvent.location}</span>}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Registrations ({registrations.length})</h2>
          <button
            onClick={() => setShowRegisterForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            Register Member
          </button>
        </div>

        {showRegisterForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h3 className="font-semibold mb-3">Register Member for Event</h3>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Member</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Choose a member...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterForm(false)
                    setSelectedMemberId('')
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {registrations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
            No registrations yet. Register a member!
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="divide-y">
              {registrations.map((registration) => (
                <div key={registration.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-semibold text-sm">
                        {registration.member.firstName[0]}{registration.member.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{registration.member.firstName} {registration.member.lastName}</p>
                      <p className="text-sm text-gray-500">{registration.member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {registration.status === 'CONFIRMED' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <span className="text-sm">{registration.status}</span>
                    </div>
                    {registration.confirmationCode && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {registration.confirmationCode}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <button
          onClick={() => {
            setEditingEvent(null)
            setFormData({ title: '', description: '', startsAt: '', endsAt: '', location: '' })
            setShowAddForm(!showAddForm)
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingEvent ? 'Edit Event' : 'Add New Event'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
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
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingEvent ? 'Update Event' : 'Add Event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingEvent(null)
                  setFormData({ title: '', description: '', startsAt: '', endsAt: '', location: '' })
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
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No events found' : 'No events yet. Create your first event!'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredEvents.map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleViewRegistrations(event)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.startsAt).toLocaleDateString()} at{' '}
                        {new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {event.location && <span>• {event.location}</span>}
                    </div>
                    <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                      View registrations <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      {event.status}
                    </span>
                    <button
                      onClick={() => handleEdit(event)}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
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
