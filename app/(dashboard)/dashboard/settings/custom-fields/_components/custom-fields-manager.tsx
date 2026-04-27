'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, GripVertical, LayoutList, Loader2 } from 'lucide-react'
import type { MemberCustomField } from '@prisma/client'
import { createCustomField, updateCustomField, deleteCustomField } from '@/lib/actions/custom-fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Short text' },
  { value: 'TEXTAREA', label: 'Long text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'BOOLEAN', label: 'Yes / No' },
  { value: 'SELECT', label: 'Dropdown (select)' },
  { value: 'URL', label: 'URL / Website' },
  { value: 'PHONE', label: 'Phone number' },
]

const schema = z.object({
  fieldName: z.string().min(1, 'Required').max(80),
  fieldType: z.enum(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'URL', 'PHONE']),
  isRequired: z.boolean(),
  helpText: z.string().optional(),
  optionsRaw: z.string().optional(), // comma-separated for SELECT type
})

type FormValues = z.infer<typeof schema>

interface Props {
  initialFields: MemberCustomField[]
}

export function CustomFieldsManager({ initialFields }: Props) {
  const [fields, setFields] = useState<MemberCustomField[]>(initialFields)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MemberCustomField | null>(null)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fieldName: '', fieldType: 'TEXT', isRequired: false, helpText: '', optionsRaw: '' },
  })

  const watchedType = watch('fieldType')

  function openCreate() {
    setEditing(null)
    reset({ fieldName: '', fieldType: 'TEXT', isRequired: false, helpText: '', optionsRaw: '' })
    setOpen(true)
  }

  function openEdit(field: MemberCustomField) {
    setEditing(field)
    reset({
      fieldName: field.fieldName,
      fieldType: field.fieldType as FormValues['fieldType'],
      isRequired: field.isRequired,
      helpText: field.helpText ?? '',
      optionsRaw: field.options.join(', '),
    })
    setOpen(true)
  }

  function onSubmit(values: FormValues) {
    const options = values.optionsRaw
      ? values.optionsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    startTransition(async () => {
      const payload = { ...values, options }
      const result = editing
        ? await updateCustomField(editing.id, payload)
        : await createCustomField(payload)

      if (result.success) {
        toast.success(editing ? 'Field updated' : 'Field created')
        setOpen(false)
        // Optimistically update list
        if (editing) {
          setFields((prev) => prev.map((f) => (f.id === editing.id ? (result.data as MemberCustomField) : f)))
        } else {
          setFields((prev) => [...prev, result.data as MemberCustomField])
        }
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCustomField(id)
      if (result.success) {
        toast.success('Field removed')
        setFields((prev) => prev.filter((f) => f.id !== id))
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Fields</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define extra data fields to collect for every member in your organization.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <LayoutList className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No custom fields yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add fields like &ldquo;T-Shirt Size&rdquo;, &ldquo;Emergency Contact&rdquo;, or &ldquo;Membership ID&rdquo;.
            </p>
            <Button className="mt-4" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add your first field
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fields.map((field) => (
            <Card key={field.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{field.fieldName}</span>
                    <Badge variant="outline" className="text-xs">
                      {FIELD_TYPES.find((t) => t.value === field.fieldType)?.label ?? field.fieldType}
                    </Badge>
                    {field.isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  </div>
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>
                  )}
                  {field.fieldType === 'SELECT' && field.options.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Options: {field.options.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(field)} className="h-7 w-7 p-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(field.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit field' : 'New custom field'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="fieldName">Field label *</Label>
              <Input id="fieldName" placeholder="e.g. T-Shirt Size" {...register('fieldName')} />
              {errors.fieldName && <p className="text-xs text-destructive">{errors.fieldName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Field type</Label>
              <Select
                value={watchedType}
                onValueChange={(v) => setValue('fieldType', v as FormValues['fieldType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {watchedType === 'SELECT' && (
              <div className="space-y-1.5">
                <Label htmlFor="optionsRaw">Options (comma-separated) *</Label>
                <Input id="optionsRaw" placeholder="e.g. Small, Medium, Large, XL" {...register('optionsRaw')} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="helpText">Help text (optional)</Label>
              <Input id="helpText" placeholder="Shown below the field in forms" {...register('helpText')} />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isRequired"
                type="checkbox"
                className="rounded border-input"
                {...register('isRequired')}
              />
              <Label htmlFor="isRequired" className="cursor-pointer">Required field</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create field'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
