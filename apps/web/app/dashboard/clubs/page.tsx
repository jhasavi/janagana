'use client'

import { useState, useEffect } from 'react'
import { getClubs, createClub, deleteClub, getClubPosts, createClubPost, deleteClubPost, createClubComment } from '@/lib/actions'
import { Plus, Trash2, Search, Building2, MessageSquare, ArrowLeft, Send } from 'lucide-react'

type Club = {
  id: string
  name: string
  slug: string
  description?: string | null
  isActive: boolean
  createdAt: Date
}

type ClubPost = {
  id: string
  title?: string | null
  body: string
  isPinned: boolean
  createdAt: Date
  author: {
    firstName: string
    lastName: string
  }
  comments: Array<{
    id: string
    body: string
    createdAt: Date
    member: {
      firstName: string
      lastName: string
    }
  }>
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [posts, setPosts] = useState<ClubPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [postFormData, setPostFormData] = useState({ title: '', body: '' })
  const [commentForms, setCommentForms] = useState<Record<string, string>>({})

  useEffect(() => {
    loadClubs()
  }, [])

  const loadClubs = async () => {
    try {
      const data = await getClubs()
      setClubs(data as Club[])
    } catch (error) {
      console.error('Failed to load clubs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPosts = async (clubId: string) => {
    try {
      const data = await getClubPosts(clubId)
      setPosts(data as ClubPost[])
    } catch (error) {
      console.error('Failed to load posts:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this club?')) return
    try {
      await deleteClub(id)
      loadClubs()
    } catch (error) {
      console.error('Failed to delete club:', error)
      alert('Failed to delete club. Please try again.')
    }
  }

  const filteredClubs = clubs.filter(c =>
    `${c.name} ${c.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (selectedClub) {
    return (
      <div className="p-8">
        <button onClick={() => setSelectedClub(null)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Clubs
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{selectedClub.name}</h1>
        <p className="text-gray-600 mb-8">Posts and comments coming soon...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        <button onClick={() => { setFormData({ name: '', description: '' }); setShowAddForm(!showAddForm); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Club
        </button>
      </div>
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Club</h2>
          <form onSubmit={async (e) => { e.preventDefault(); try { await createClub(formData); setFormData({ name: '', description: '' }); setShowAddForm(false); loadClubs(); } catch (error) { alert('Failed to save club'); } }} className="space-y-4">
            <input type="text" required placeholder="Club Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add Club</button>
            <button type="button" onClick={() => { setShowAddForm(false); setFormData({ name: '', description: '' }); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search clubs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 outline-none" />
        </div>
        {isLoading ? <div className="p-8 text-center text-gray-500">Loading...</div> : filteredClubs.length === 0 ? <div className="p-8 text-center text-gray-500">No clubs yet</div> : (
          <div className="grid grid-cols-3 gap-4 p-4">
            {filteredClubs.map((club) => (
              <div key={club.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedClub(club); loadPosts(club.id); }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{club.name}</h3>
                    </div>
                    {club.description && <p className="text-sm text-gray-600">{club.description}</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(club.id); }} className="p-2 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
