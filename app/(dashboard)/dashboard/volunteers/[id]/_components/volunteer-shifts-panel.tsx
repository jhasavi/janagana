'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Clock, MapPin, Users } from 'lucide-react'
import { getShifts, createShift, deleteShift } from '@/lib/actions/volunteers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateTime } from '@/lib/utils'

interface Shift {
  id: string
  title: string | null
  startTime: Date
  endTime: Date
  capacity: number | null
  location: string | null
  _count: { signups: number }
}

const schema = z.object({
  title:     z.string().optional(),
  startTime: z.string().min(1, 'Required'),
  endTime:   z.string().min(1, 'Required'),
  capacity:  z.number().int().positive().optional().nullable(),
  location:  z.string().optional(),
})
type Fields = z.infer<typeof schema>

export function VolunteerShiftsPanel({
  opportunityId,
  initialShifts,
}: {
  opportunityId: string
  initialShifts: Shift[]
}) {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  const refresh = async () => {
    const result = await getShifts(opportunityId)
    if (result.success) setShifts(result.data as Shift[])
  }

  const onSubmit = async (values: Fields) => {
    const result = await createShift(opportunityId, {
      ...values,
      capacity: values.capacity ?? null,
    })
    if (result.success) {
      toast.success('Shift created')
      reset()
      setShowForm(false)
      await refresh()
    } else {
      toast.error(result.error ?? 'Failed to create shift')
    }
  }

  const handleDelete = async (shiftId: string) => {
    setDeleting(shiftId)
    const result = await deleteShift(opportunityId, shiftId)
    if (result.success) {
      toast.success('Shift removed')
      setShifts((prev) => prev.filter((s) => s.id !== shiftId))
    } else {
      toast.error(result.error ?? 'Failed to delete shift')
    }
    setDeleting(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base">Shifts</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add Shift
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime">Start *</Label>
                <Input id="startTime" type="datetime-local" {...register('startTime')} />
                {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime.message}</p>}
              </div>
              <div>
                <Label htmlFor="endTime">End *</Label>
                <Input id="endTime" type="datetime-local" {...register('endTime')} />
                {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...register('location')} placeholder="Room 101" />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" type="number" min="1" {...register('capacity', { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" {...register('title')} placeholder="Morning shift" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Create Shift'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { reset(); setShowForm(false) }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shifts yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {shifts.map((shift) => (
              <div key={shift.id} className="flex items-start justify-between rounded-lg border px-4 py-3">
                <div className="space-y-1">
                  {shift.title && <p className="font-medium text-sm">{shift.title}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(shift.startTime)} – {formatDateTime(shift.endTime)}
                    </span>
                    {shift.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {shift.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {shift._count.signups}{shift.capacity ? `/${shift.capacity}` : ''} signed up
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  disabled={deleting === shift.id}
                  onClick={() => handleDelete(shift.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
