'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2, Eye, Phone, Mail, Building2, Linkedin } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, initials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { deleteContactFilter, saveContactFilter } from '@/lib/actions/saved-filters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Contact, Member, Company } from '@prisma/client'

const SYSTEM_ARCHIVE_TAG = '__system_archived'

type ContactWithRelations = Contact & {
  member: Member | null
  company: Company | null
  _count: {
    donations: number
    volunteerSignups: number
    eventRegistrations: number
    deals: number
    tasks: number
    enrollments: number
  }
}

type SavedContactFilter = {
  id: string
  name: string
  filters: {
    search?: string | null
    status?: string | null
    role?: string | null
    tag?: string | null
  }
}

interface ContactTableProps {
  contacts: ContactWithRelations[]
  savedFilters: SavedContactFilter[]
  onArchive: (contactId: string) => Promise<{ success: boolean; error?: string }>
}

export function ContactTable({ contacts, savedFilters, onArchive }: ContactTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, startDelete] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'members' | 'donors' | 'volunteers' | 'attendees' | 'leads'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [tagFilter, setTagFilter] = useState('')
  const [savedFiltersState, setSavedFiltersState] = useState<SavedContactFilter[]>(savedFilters)
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)
  const [saveName, setSaveName] = useState('')
  const [isSaving, startSave] = useTransition()
  const [isDeletingSaved, startDeleteSaved] = useTransition()

  useEffect(() => {
    setSavedFiltersState(savedFilters)
  }, [savedFilters])

  const filteredContacts = contacts.filter((contact) => {
    const searchMatches =
      contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.emails?.[0] ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchQuery)) ||
      (contact.jobTitle && contact.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()))

    const isArchived = contact.tags.includes(SYSTEM_ARCHIVE_TAG) || contact.tags.includes('archived')
    const statusMatches =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !isArchived) ||
      (statusFilter === 'archived' && isArchived)

    const roleMatches =
      roleFilter === 'all' ||
      (roleFilter === 'members' && (contact.member !== null || contact._count.enrollments > 0)) ||
      (roleFilter === 'donors' && contact._count.donations > 0) ||
      (roleFilter === 'volunteers' && contact._count.volunteerSignups > 0) ||
      (roleFilter === 'attendees' && contact._count.eventRegistrations > 0) ||
      (roleFilter === 'leads' && contact._count.deals > 0 && contact._count.enrollments === 0)

    const tagMatches =
      tagFilter.trim() === '' ||
      contact.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()))

    return searchMatches && statusMatches && roleMatches && tagMatches
  })

  const handleDelete = () => {
    if (!deleteId) return
    startDelete(async () => {
      try {
        const result = await onArchive(deleteId)
        if (result.success) {
          toast.success('Contact deleted')
          setDeleteId(null)
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to delete contact')
        }
      } catch (error) {
        toast.error('Failed to delete contact')
      }
    })
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">👥</span>
        </div>
        <h3 className="font-semibold text-lg mb-1">No contacts yet</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Get started by adding your first contact.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/crm/contacts/new">Add Contact</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'All Contacts'],
            ['members', 'Members'],
            ['donors', 'Donors'],
            ['volunteers', 'Volunteers'],
            ['attendees', 'Attendees'],
            ['leads', 'Leads'],
          ].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={roleFilter === value ? 'default' : 'outline'}
              onClick={() => setRoleFilter(value as typeof roleFilter)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'secondary' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            All Statuses
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'active' ? 'secondary' : 'outline'}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'archived' ? 'secondary' : 'outline'}
            onClick={() => setStatusFilter('archived')}
          >
            Archived
          </Button>
          <Input
            placeholder="Filter by tag"
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="max-w-[200px]"
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Saved filters:</span>
            {savedFiltersState.length === 0 ? (
              <span className="text-muted-foreground">No saved views yet.</span>
            ) : (
              savedFiltersState.map((filter) => (
                <Button
                  key={filter.id}
                  size="sm"
                  variant={selectedFilterId === filter.id ? 'secondary' : 'outline'}
                  onClick={() => {
                    setSearchQuery(filter.filters.search ?? '')
                    setStatusFilter(filter.filters.status === 'archived' ? 'archived' : filter.filters.status === 'active' ? 'active' : 'all')
                    setRoleFilter((filter.filters.role ?? 'all') as typeof roleFilter)
                    setTagFilter(filter.filters.tag ?? '')
                    setSelectedFilterId(filter.id)
                  }}
                >
                  {filter.name}
                </Button>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Save current view..."
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              className="max-w-[220px]"
            />
            <Button
              size="sm"
              onClick={() => {
                if (!saveName.trim()) return
                startSave(async () => {
                  const result = await saveContactFilter({
                    name: saveName.trim(),
                    filters: {
                      search: searchQuery || undefined,
                      status: statusFilter !== 'all' ? statusFilter : undefined,
                      role: roleFilter !== 'all' ? roleFilter : undefined,
                      tag: tagFilter || undefined,
                    },
                  })
                  if (result.success) {
                    setSavedFiltersState([result.data, ...savedFiltersState])
                    setSelectedFilterId(result.data.id)
                    setSaveName('')
                    toast.success('Saved view')
                    router.refresh()
                  } else {
                    toast.error(result.error ?? 'Failed to save view')
                  }
                })
              }}
              disabled={!saveName.trim() || isSaving}
            >
              {isSaving ? 'Saving…' : 'Save view'}
            </Button>
            {selectedFilterId && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  startDeleteSaved(async () => {
                    const result = await deleteContactFilter(selectedFilterId)
                    if (result.success) {
                      setSavedFiltersState((prev) => prev.filter((filter) => filter.id !== selectedFilterId))
                      setSelectedFilterId(null)
                      toast.success('Deleted saved view')
                      router.refresh()
                    } else {
                      toast.error(result.error ?? 'Failed to delete saved view')
                    }
                  })
                }}
                disabled={isDeletingSaved}
              >
                {isDeletingSaved ? 'Deleting…' : 'Delete view'}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRoleFilter('donors')
                setStatusFilter('active')
                setTagFilter('')
              }}
            >
              Active Donors
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRoleFilter('leads')
                setStatusFilter('active')
                setTagFilter('')
              }}
            >
              Open Leads
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRoleFilter('all')
                setStatusFilter('archived')
                setTagFilter('')
              }}
            >
              Archived Contacts
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contact.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                        {initials(contact.firstName, contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        href={`/dashboard/crm/contacts/${contact.id}`}
                        className="font-medium hover:underline text-sm"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{contact.email}</p>
                      </div>
                      {contact.linkedinUrl && (
                        <a
                          href={contact.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Linkedin className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {contact.phone ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {contact.phone}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {contact.jobTitle || '—'}
                </TableCell>
                <TableCell>
                  {contact.company ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {contact.company.name}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.source ? (
                    <Badge variant="outline" className="text-xs">
                      {contact.source}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(contact.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/crm/contacts/${contact.id}`}>
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/crm/contacts/${contact.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Contact</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This moves the contact into an archived state for safer cleanup workflows.
            You can restore archived contacts from Organization Console data cleanup tools.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Archiving...' : 'Archive Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
