'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, ExternalLink, File } from 'lucide-react'
import { uploadMemberDocument, deleteMemberDocument } from '@/lib/actions/documents'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { MemberDocument } from '@prisma/client'
import { formatDate } from '@/lib/utils'

const DOCTYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  ID_PROOF: 'ID Proof',
  ADDRESS_PROOF: 'Address Proof',
  MEMBERSHIP_FORM: 'Membership Form',
  WAIVER: 'Waiver / Release',
  CERTIFICATE: 'Certificate',
  PHOTO: 'Photo',
  OTHER: 'Other',
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  memberId: string
  initialDocs: MemberDocument[]
}

export function MemberDocuments({ memberId, initialDocs }: Props) {
  const [docs, setDocs] = useState(initialDocs)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [docType, setDocType] = useState('GENERAL')
  const [description, setDescription] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error('Please select a file')
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.set('memberId', memberId)
      fd.set('documentType', docType)
      fd.set('description', description)
      fd.set('file', file)

      const result = await uploadMemberDocument(fd)
      if (result.success && result.data) {
        setDocs((prev) => [result.data as MemberDocument, ...prev])
        toast.success('Document uploaded')
        setOpen(false)
        setDescription('')
        setDocType('GENERAL')
        if (fileRef.current) fileRef.current.value = ''
      } else {
        toast.error(result.error ?? 'Upload failed')
      }
    })
  }

  const handleDelete = (docId: string) => {
    startTransition(async () => {
      const result = await deleteMemberDocument(docId)
      if (result.success) {
        setDocs((prev) => prev.filter((d) => d.id !== docId))
        toast.success('Document deleted')
      } else {
        toast.error(result.error ?? 'Delete failed')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {docs.length} document{docs.length !== 1 ? 's' : ''}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select defaultValue="GENERAL" onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCTYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description of this document..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">File</Label>
                <input
                  id="file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.txt"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">PDF, images, Word docs. Max 10 MB.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 border rounded-lg border-dashed">
          <FileText className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No documents uploaded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
            >
              <File className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.fileName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{DOCTYPE_LABELS[doc.documentType] ?? doc.documentType}</span>
                  {doc.fileSizeBytes && <span>· {formatBytes(doc.fileSizeBytes)}</span>}
                  <span>· {formatDate(doc.createdAt)}</span>
                </div>
                {doc.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="sr-only">View</span>
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(doc.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
