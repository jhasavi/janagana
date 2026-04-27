'use client'

import type { WebhookEndpoint } from '@prisma/client'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Power } from 'lucide-react'
import { createWebhookEndpoint, toggleWebhookEndpoint, deleteWebhookEndpoint } from '@/lib/actions/webhooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const AVAILABLE_EVENTS = [
  'member.created', 'member.updated', 'member.deleted',
  'event.published', 'event.canceled',
  'payment.completed', 'payment.failed',
  'volunteer.signup', 'volunteer.hours_logged',
]

interface Endpoint {
  id: string
  url: string
  events: string[]
  isActive: boolean
  createdAt: Date
  _count: { deliveries: number }
}

const schema = z.object({
  url:    z.string().url('Must be a valid HTTPS URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
})
type Fields = z.infer<typeof schema>

export function WebhooksClient({ initialEndpoints }: { initialEndpoints: Endpoint[] }) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { events: [] },
  })

  const onSubmit = async (values: Fields) => {
    const result = await createWebhookEndpoint({ url: values.url, events: values.events, isActive: true })
    if (result.success && result.data) {
      const newEndpoint: Endpoint = { ...(result.data as WebhookEndpoint), _count: { deliveries: 0 } }
      setEndpoints((prev) => [newEndpoint, ...prev])
      reset()
      setShowForm(false)
      toast.success('Webhook endpoint created')
    } else {
      toast.error(result.error ?? 'Failed to create webhook')
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    setLoading(id)
    const result = await toggleWebhookEndpoint(id, !current)
    if (result.success) {
      setEndpoints((prev) => prev.map((e) => e.id === id ? { ...e, isActive: !current } : e))
    } else {
      toast.error('Failed to update')
    }
    setLoading(null)
  }

  const handleDelete = async (id: string) => {
    setLoading(id)
    const result = await deleteWebhookEndpoint(id)
    if (result.success) {
      setEndpoints((prev) => prev.filter((e) => e.id !== id))
      toast.success('Endpoint deleted')
    } else {
      toast.error('Failed to delete')
    }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add Endpoint
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="url">Endpoint URL</Label>
                <Input id="url" type="url" {...register('url')} placeholder="https://yourapp.com/webhooks/jana-gana" />
                {errors.url && <p className="text-xs text-destructive mt-1">{errors.url.message}</p>}
              </div>
              <div>
                <Label>Events to send</Label>
                {errors.events && <p className="text-xs text-destructive mb-1">{errors.events.message}</p>}
                <Controller
                  control={control}
                  name="events"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      {AVAILABLE_EVENTS.map((event) => (
                        <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={field.value.includes(event)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...field.value, event]
                                : field.value.filter((v) => v !== event)
                              field.onChange(next)
                            }}
                          />
                          {event}
                        </label>
                      ))}
                    </div>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create Endpoint'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { reset(); setShowForm(false) }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {endpoints.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No webhook endpoints yet.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {endpoints.map((ep) => (
            <div key={ep.id} className="flex items-start justify-between px-4 py-3 gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono truncate">{ep.url}</code>
                  <Badge variant={ep.isActive ? 'success' : 'secondary'}>
                    {ep.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ep.events.join(', ')} · {ep._count.deliveries} deliveries · Added {formatDate(ep.createdAt)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={loading === ep.id}
                  onClick={() => handleToggle(ep.id, ep.isActive)}
                  title={ep.isActive ? 'Disable' : 'Enable'}
                >
                  <Power className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  disabled={loading === ep.id}
                  onClick={() => handleDelete(ep.id)}
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
