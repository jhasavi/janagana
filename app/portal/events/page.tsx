'use client'

import { useState, useEffect } from 'react'
import { getEvents, getMembers, registerForEvent, getMemberRegistrations } from '@/lib/actions'
import { toast } from 'sonner'
import { Calendar, MapPin, Users, Check } from 'lucide-react'

export default function PortalEventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [registrations, setRegistrations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [eventsData, membersData] = await Promise.all([getEvents(), getMembers()])
      setEvents(eventsData as any[])
      setMembers(membersData as any[])

      if (membersData && membersData.length > 0) {
        const regs = await getMemberRegistrations(membersData[0].id)
        setRegistrations(regs as any[])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (eventId: string) => {
    if (!members[0]) {
      toast.error('No member profile found for your account')
      return
    }

    try {
      await registerForEvent(eventId, members[0].id)
      await loadData()
      toast.success('Successfully registered for event!')
    } catch (error: any) {
      console.error('Failed to register:', error)
      toast.error(error.message || 'Failed to register for event')
    }
  }

  const isRegistered = (eventId: string) => {
    return registrations.some((r) => r.eventId === eventId)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Events</h1>

      {isLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Available Events</h2>
            {events.length === 0 ? (
              <p className="text-gray-600">No events available</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.startsAt).toLocaleDateString()}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRegister(event.id)}
                      disabled={isRegistered(event.id)}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRegistered(event.id) ? (
                        <>
                          <Check className="w-4 h-4" />
                          Registered
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          Register
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">My Registrations</h2>
            {registrations.length === 0 ? (
              <p className="text-gray-600">You haven&apos;t registered for any events yet</p>
            ) : (
              <div className="space-y-3">
                {registrations.map((reg) => (
                  <div key={reg.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">{reg.event.title}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(reg.event.startsAt).toLocaleDateString()} at{' '}
                        {new Date(reg.event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Confirmation: {reg.confirmationCode}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {reg.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
