'use client'

import { useState, useEffect } from 'react'
import { getVolunteerOpportunities, getMembers, applyForVolunteerOpportunity, getVolunteerApplications } from '@/lib/actions'
import { Heart, MapPin, Check, Send } from 'lucide-react'

export default function PortalVolunteersPage() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null)
  const [coverLetter, setCoverLetter] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [oppsData, membersData] = await Promise.all([getVolunteerOpportunities(), getMembers()])
      setOpportunities(oppsData as any[])
      setMembers(membersData as any[])

      if (membersData && membersData.length > 0) {
        const apps = await getVolunteerApplications(membersData[0].id)
        setApplications(apps as any[])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async () => {
    if (!members[0] || !selectedOpportunity) {
      return
    }

    try {
      await applyForVolunteerOpportunity(selectedOpportunity.id, members[0].id, coverLetter)
      setShowApplicationForm(false)
      setCoverLetter('')
      setSelectedOpportunity(null)
      await loadData()
      alert('Application submitted successfully!')
    } catch (error: any) {
      console.error('Failed to apply:', error)
      alert(error.message || 'Failed to submit application')
    }
  }

  const hasApplied = (opportunityId: string) => {
    return applications.some((a) => a.opportunityId === opportunityId)
  }

  const openApplicationForm = (opportunity: any) => {
    setSelectedOpportunity(opportunity)
    setShowApplicationForm(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Volunteer Opportunities</h1>

      {isLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Available Opportunities</h2>
            {opportunities.length === 0 ? (
              <p className="text-gray-600">No volunteer opportunities available</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2">{opp.title}</h3>
                    {opp.description && (
                      <p className="text-sm text-gray-600 mb-3">{opp.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      {opp.location && !opp.isVirtual && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {opp.location}
                        </div>
                      )}
                      {opp.isVirtual && (
                        <div className="flex items-center gap-1">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Virtual</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (hasApplied(opp.id)) {
                          return
                        }
                        openApplicationForm(opp)
                      }}
                      disabled={hasApplied(opp.id)}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {hasApplied(opp.id) ? (
                        <>
                          <Check className="w-4 h-4" />
                          Applied
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4" />
                          Apply Now
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">My Applications</h2>
            {applications.length === 0 ? (
              <p className="text-gray-600">You haven&apos;t applied for any opportunities yet</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div key={app.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">{app.opportunity.title}</h3>
                      {app.coverLetter && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{app.coverLetter}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      app.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      app.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      app.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showApplicationForm && selectedOpportunity && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-semibold mb-4">Apply for {selectedOpportunity.title}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cover Letter (optional)
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell us why you're interested in this opportunity..."
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApply}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Submit Application
                    </button>
                    <button
                      onClick={() => {
                        setShowApplicationForm(false)
                        setCoverLetter('')
                        setSelectedOpportunity(null)
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
