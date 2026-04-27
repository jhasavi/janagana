'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { createApiKey, revokeApiKey, deleteApiKey } from '@/lib/actions/api-keys'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  isActive: boolean
  lastUsedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
}

const schema = z.object({
  name: z.string().min(1, 'Name required').max(100),
})
type Fields = z.infer<typeof schema>

export function ApiKeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: Fields) => {
    const result = await createApiKey({ name: values.name, permissions: [] })
    if (result.success && 'rawKey' in result && result.rawKey) {
      setNewKey(result.rawKey)
      setKeys((prev) => [result.data as ApiKey, ...prev])
      reset()
      setShowForm(false)
      toast.success('API key created — copy it now, it won\'t be shown again')
    } else {
      toast.error(result.error ?? 'Failed to create key')
    }
  }

  const handleRevoke = async (id: string) => {
    setLoading(id)
    const result = await revokeApiKey(id)
    if (result.success) {
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, isActive: false } : k))
      toast.success('Key revoked')
    } else {
      toast.error(result.error ?? 'Failed to revoke')
    }
    setLoading(null)
  }

  const handleDelete = async (id: string) => {
    setLoading(id)
    const result = await deleteApiKey(id)
    if (result.success) {
      setKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success('Key deleted')
    } else {
      toast.error(result.error ?? 'Failed to delete')
    }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Newly created key reveal */}
      {newKey && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-800">
            Copy your API key — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white border px-3 py-1.5 text-sm font-mono break-all">
              {newKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied') }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>Dismiss</Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New API Key
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="name">Key Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g. CI/CD Deploy" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { reset(); setShowForm(false) }}>
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No API keys yet.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{key.name}</span>
                  <Badge variant={key.isActive ? 'success' : 'secondary'}>
                    {key.isActive ? 'Active' : 'Revoked'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {key.keyPrefix}…
                  {key.lastUsedAt && ` · Last used ${formatDate(key.lastUsedAt)}`}
                  {key.expiresAt && ` · Expires ${formatDate(key.expiresAt)}`}
                </p>
              </div>
              <div className="flex gap-1">
                {key.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading === key.id}
                    onClick={() => handleRevoke(key.id)}
                  >
                    <XCircle className="h-4 w-4" /> Revoke
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  disabled={loading === key.id}
                  onClick={() => handleDelete(key.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
