'use client'

import { useState, useEffect } from 'react'
import { getDonationCampaigns, createDonationCampaign, getDonations, createDonation } from '@/lib/actions'
import { toast } from 'sonner'
import { Plus, DollarSign, TrendingUp, Users, Calendar } from 'lucide-react'

type Campaign = {
  id: string
  title: string
  description: string
  goalAmountCents: number
  raisedAmountCents: number
  currency: string
  startDate: Date
  endDate?: Date | null
  isPublic: boolean
  showProgressBar: boolean
  showDonorList: boolean
  allowRecurring: boolean
  createdAt: Date
}

type Donation = {
  id: string
  amountCents: number
  currency: string
  donorName?: string | null
  donorEmail?: string | null
  message?: string | null
  isAnonymous: boolean
  isRecurring: boolean
  createdAt: Date
  campaign?: Campaign | null
  member?: any
}

export default function FundraisingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [showDonationForm, setShowDonationForm] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignFormData, setCampaignFormData] = useState({
    title: '',
    description: '',
    goalAmount: '',
    startDate: '',
    endDate: '',
    isPublic: true,
    showProgressBar: true,
    showDonorList: false,
    allowRecurring: false,
  })
  const [donationFormData, setDonationFormData] = useState({
    campaignId: '',
    amount: '',
    donorName: '',
    donorEmail: '',
    message: '',
    isAnonymous: false,
    isRecurring: false,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [campaignsData, donationsData] = await Promise.all([
        getDonationCampaigns(),
        getDonations(),
      ])
      setCampaigns(campaignsData as Campaign[])
      setDonations(donationsData as Donation[])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createDonationCampaign({
        title: campaignFormData.title,
        description: campaignFormData.description,
        goalAmount: parseFloat(campaignFormData.goalAmount),
        startDate: new Date(campaignFormData.startDate),
        endDate: campaignFormData.endDate ? new Date(campaignFormData.endDate) : undefined,
        isPublic: campaignFormData.isPublic,
        showProgressBar: campaignFormData.showProgressBar,
        showDonorList: campaignFormData.showDonorList,
        allowRecurring: campaignFormData.allowRecurring,
      })
      setCampaignFormData({
        title: '',
        description: '',
        goalAmount: '',
        startDate: '',
        endDate: '',
        isPublic: true,
        showProgressBar: true,
        showDonorList: false,
        allowRecurring: false,
      })
      setShowCampaignForm(false)
      loadData()
    } catch (error) {
      console.error('Failed to create campaign:', error)
      toast.error('Failed to create campaign. Please try again.')
    }
  }

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createDonation({
        campaignId: donationFormData.campaignId || undefined,
        amount: parseFloat(donationFormData.amount),
        donorName: donationFormData.donorName || undefined,
        donorEmail: donationFormData.donorEmail || undefined,
        message: donationFormData.message || undefined,
        isAnonymous: donationFormData.isAnonymous,
        isRecurring: donationFormData.isRecurring,
      })
      setDonationFormData({
        campaignId: '',
        amount: '',
        donorName: '',
        donorEmail: '',
        message: '',
        isAnonymous: false,
        isRecurring: false,
      })
      setShowDonationForm(false)
      loadData()
    } catch (error) {
      console.error('Failed to create donation:', error)
      toast.error('Failed to create donation. Please try again.')
    }
  }

  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedAmountCents, 0)
  const totalGoal = campaigns.reduce((sum, c) => sum + c.goalAmountCents, 0)
  const progressPercentage = totalGoal > 0 ? (totalRaised / totalGoal) * 100 : 0

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Fundraising</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Raised</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(totalRaised / 100).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Donations</p>
              <p className="text-2xl font-bold text-gray-900">{donations.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-gray-900">{progressPercentage.toFixed(1)}%</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowCampaignForm(!showCampaignForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
        <button
          onClick={() => setShowDonationForm(!showDonationForm)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Record Donation
        </button>
      </div>

      {/* Campaign Form */}
      {showCampaignForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Campaign</h2>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={campaignFormData.title}
                onChange={(e) => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                required
                value={campaignFormData.description}
                onChange={(e) => setCampaignFormData({ ...campaignFormData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Amount ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={campaignFormData.goalAmount}
                onChange={(e) => setCampaignFormData({ ...campaignFormData, goalAmount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={campaignFormData.startDate}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={campaignFormData.endDate}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={campaignFormData.isPublic}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, isPublic: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Public</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={campaignFormData.showProgressBar}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, showProgressBar: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Show Progress Bar</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={campaignFormData.allowRecurring}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, allowRecurring: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Allow Recurring</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Campaign
              </button>
              <button
                type="button"
                onClick={() => setShowCampaignForm(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Donation Form */}
      {showDonationForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Record Donation</h2>
          <form onSubmit={handleCreateDonation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign (Optional)</label>
              <select
                value={donationFormData.campaignId}
                onChange={(e) => setDonationFormData({ ...donationFormData, campaignId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">No Campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={donationFormData.amount}
                onChange={(e) => setDonationFormData({ ...donationFormData, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name (Optional)</label>
              <input
                type="text"
                value={donationFormData.donorName}
                onChange={(e) => setDonationFormData({ ...donationFormData, donorName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Email (Optional)</label>
              <input
                type="email"
                value={donationFormData.donorEmail}
                onChange={(e) => setDonationFormData({ ...donationFormData, donorEmail: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
              <textarea
                value={donationFormData.message}
                onChange={(e) => setDonationFormData({ ...donationFormData, message: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={donationFormData.isAnonymous}
                  onChange={(e) => setDonationFormData({ ...donationFormData, isAnonymous: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Anonymous</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={donationFormData.isRecurring}
                  onChange={(e) => setDonationFormData({ ...donationFormData, isRecurring: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Recurring</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Record Donation
              </button>
              <button
                type="button"
                onClick={() => setShowDonationForm(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <h2 className="text-xl font-semibold p-6 border-b">Campaigns</h2>
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No campaigns yet</div>
        ) : (
          <div className="divide-y">
            {campaigns.map((campaign) => {
              const progress = campaign.goalAmountCents > 0
                ? (campaign.raisedAmountCents / campaign.goalAmountCents) * 100
                : 0
              return (
                <div key={campaign.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{campaign.title}</h3>
                      <p className="text-gray-600 text-sm">{campaign.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        ${(campaign.raisedAmountCents / 100).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        of ${(campaign.goalAmountCents / 100).toLocaleString()} goal
                      </p>
                    </div>
                  </div>
                  {campaign.showProgressBar && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{progress.toFixed(1)}% complete</p>
                    </div>
                  )}
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Started: {new Date(campaign.startDate).toLocaleDateString()}</span>
                    {campaign.endDate && (
                      <span>Ends: {new Date(campaign.endDate).toLocaleDateString()}</span>
                    )}
                    {campaign.isPublic && <span>Public</span>}
                    {campaign.allowRecurring && <span>Recurring Allowed</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Donations */}
      <div className="bg-white rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold p-6 border-b">Recent Donations</h2>
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : donations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No donations yet</div>
        ) : (
          <div className="divide-y">
            {donations.slice(0, 10).map((donation) => (
              <div key={donation.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {donation.isAnonymous ? 'Anonymous' : donation.donorName || 'Unknown'}
                    </p>
                    {donation.campaign && (
                      <p className="text-sm text-gray-600">{donation.campaign.title}</p>
                    )}
                    {donation.message && (
                      <p className="text-sm text-gray-600 italic">&ldquo;{donation.message}&rdquo;</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      ${(donation.amountCents / 100).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </p>
                    {donation.isRecurring && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Recurring
                      </span>
                    )}
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
