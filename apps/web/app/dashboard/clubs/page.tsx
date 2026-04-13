'use client'

import { useState, useEffect } from 'react'
import { getClubs, createClub, deleteClub, updateClub, getClubPosts, createClubPost, deleteClubPost, createClubComment, getMembers } from '@/lib/actions'
import { Plus, Trash2, Search, Building2, MessageSquare, ArrowLeft, Send, Edit } from 'lucide-react'

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
  const [members, setMembers] = useState<any[]>([])
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [posts, setPosts] = useState<ClubPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [postFormData, setPostFormData] = useState({ title: '', body: '' })
  const [commentForms, setCommentForms] = useState<Record<string, string>>({})

  useEffect(() => {
    loadClubs()
    loadMembers()
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

  const loadMembers = async () => {
    try {
      const data = await getMembers()
      setMembers(data as any[])
    } catch (error) {
      console.error('Failed to load members:', error)
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

  const handleEdit = (club: Club) => {
    setEditingClub(club)
    setFormData({
      name: club.name,
      description: club.description || '',
    })
    setShowAddForm(true)
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
        
        {showPostForm ? (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Post</h2>
            <form onSubmit={async (e) => { e.preventDefault(); try { await createClubPost({ clubId: selectedClub.id, authorId: members[0]?.id || '', title: postFormData.title || undefined, body: postFormData.body }); setPostFormData({ title: '', body: '' }); setShowPostForm(false); loadPosts(selectedClub.id); } catch (error) { alert('Failed to create post'); } }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input type="text" placeholder="Post title" value={postFormData.title} onChange={(e) => setPostFormData({ ...postFormData, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea required placeholder="What's on your mind?" value={postFormData.body} onChange={(e) => setPostFormData({ ...postFormData, body: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={4} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Post</button>
                <button type="button" onClick={() => { setShowPostForm(false); setPostFormData({ title: '', body: '' }); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowPostForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-6">
            <MessageSquare className="w-4 h-4" />
            Create Post
          </button>
        )}

        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
              No posts yet. Create the first post!
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-semibold text-sm">
                          {post.author.firstName[0]}{post.author.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{post.author.firstName} {post.author.lastName}</p>
                        <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {post.title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>}
                    <p className="text-gray-700">{post.body}</p>
                  </div>
                  <button onClick={async () => { if (confirm('Delete this post?')) { try { await deleteClubPost(post.id); loadPosts(selectedClub.id); } catch (error) { alert('Failed to delete post'); } } }} className="p-2 hover:bg-red-100 rounded text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Comments ({post.comments.length})</h4>
                  <div className="space-y-3 mb-4">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 text-sm">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-600 font-semibold text-xs">
                            {comment.member.firstName[0]}{comment.member.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{comment.member.firstName} {comment.member.lastName}</p>
                          <p className="text-gray-600">{comment.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentForms[post.id] || ''}
                      onChange={(e) => setCommentForms({ ...commentForms, [post.id]: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      onKeyPress={async (e) => { if (e.key === 'Enter' && commentForms[post.id]?.trim()) { try { await createClubComment({ postId: post.id, memberId: members[0]?.id || '', body: commentForms[post.id] }); setCommentForms({ ...commentForms, [post.id]: '' }); loadPosts(selectedClub.id); } catch (error) { alert('Failed to add comment'); } } }}
                    />
                    <button
                      onClick={async () => { if (commentForms[post.id]?.trim()) { try { await createClubComment({ postId: post.id, memberId: members[0]?.id || '', body: commentForms[post.id] }); setCommentForms({ ...commentForms, [post.id]: '' }); loadPosts(selectedClub.id); } catch (error) { alert('Failed to add comment'); } } }}
                      disabled={!commentForms[post.id]?.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        <button onClick={() => { setEditingClub(null); setFormData({ name: '', description: '' }); setShowAddForm(!showAddForm); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Club
        </button>
      </div>
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{editingClub ? 'Edit Club' : 'Add New Club'}</h2>
          <form onSubmit={async (e) => { e.preventDefault(); try { if (editingClub) { await updateClub(editingClub.id, formData); setEditingClub(null); } else { await createClub(formData); } setFormData({ name: '', description: '' }); setShowAddForm(false); loadClubs(); } catch (error) { console.error('Failed to save club:', error); alert('Failed to save club. Please try again.'); } }} className="space-y-4">
            <input type="text" required placeholder="Club Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{editingClub ? 'Save Changes' : 'Add Club'}</button>
            <button type="button" onClick={() => { setShowAddForm(false); setFormData({ name: '', description: '' }); setEditingClub(null); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
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
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{club.name}</h3>
                    </div>
                    {club.description && (
                      <p className="text-sm text-gray-600 mb-2">{club.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${club.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {club.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(club); }}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(club.id); }}
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
