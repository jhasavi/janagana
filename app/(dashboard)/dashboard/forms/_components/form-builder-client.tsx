'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, Loader2, Eye, Settings2, ClipboardList } from 'lucide-react'
import type { CustomForm, FormField } from '@prisma/client'
import { createForm, updateForm, saveFormFields } from '@/lib/actions/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Short text' },
  { value: 'TEXTAREA', label: 'Long text' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'RADIO', label: 'Radio buttons' },
  { value: 'HEADING', label: '— Heading' },
  { value: 'PARAGRAPH', label: '— Paragraph text' },
]

type FieldDraft = {
  id?: string
  fieldType: string
  label: string
  placeholder?: string
  helpText?: string
  isRequired: boolean
  options: string[]
  sortOrder: number
  content?: string
  optionsRaw?: string
}

const settingsSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().optional(),
  isPublished: z.boolean(),
  requiresAuth: z.boolean(),
  confirmationMessage: z.string().optional(),
})
type SettingsValues = z.infer<typeof settingsSchema>

type FormWithFields = CustomForm & { fields: FormField[] }

interface Props { form?: FormWithFields | null }

export function FormBuilderClient({ form }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'fields' | 'settings'>('fields')
  const [fields, setFields] = useState<FieldDraft[]>(
    form?.fields.map((f) => ({
      id: f.id,
      fieldType: f.fieldType,
      label: f.label,
      placeholder: f.placeholder ?? '',
      helpText: f.helpText ?? '',
      isRequired: f.isRequired,
      options: f.options,
      sortOrder: f.sortOrder,
      content: f.content ?? '',
      optionsRaw: f.options.join(', '),
    })) ?? []
  )
  const [saving, startSave] = useTransition()
  const [savedFormId, setSavedFormId] = useState<string | null>(form?.id ?? null)

  const { register, handleSubmit, watch, getValues, formState: { errors } } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      title: form?.title ?? '',
      description: form?.description ?? '',
      isPublished: form?.isPublished ?? false,
      requiresAuth: form?.requiresAuth ?? false,
      confirmationMessage: form?.confirmationMessage ?? '',
    },
  })

  function addField(type: string) {
    setFields((prev) => [
      ...prev,
      {
        fieldType: type,
        label: type === 'HEADING' ? 'Section heading' : type === 'PARAGRAPH' ? 'Paragraph text' : `New ${type.toLowerCase()} field`,
        isRequired: false,
        options: [],
        sortOrder: prev.length,
        optionsRaw: '',
      },
    ])
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function handleSaveAll(settings: SettingsValues) {
    startSave(async () => {
      const formPayload = {
        title: settings.title,
        description: settings.description,
        isPublished: settings.isPublished,
        requiresAuth: settings.requiresAuth,
        confirmationMessage: settings.confirmationMessage,
      }

      let formId = savedFormId
      if (!formId) {
        const result = await createForm(formPayload)
        if (!result.success) { toast.error(result.error); return }
        formId = result.data!.id
        setSavedFormId(formId)
      } else {
        const result = await updateForm(formId, formPayload)
        if (!result.success) { toast.error(result.error); return }
      }

      // Save fields
      const fieldPayload = fields.map((f, i) => ({
        ...f,
        options: f.optionsRaw ? f.optionsRaw.split(',').map((o) => o.trim()).filter(Boolean) : f.options,
        sortOrder: i,
      }))
      const fieldsResult = await saveFormFields(formId!, fieldPayload)
      if (!fieldsResult.success) { toast.error(fieldsResult.error); return }

      toast.success('Form saved')
      if (!savedFormId) router.replace(`/dashboard/forms/${formId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(handleSaveAll)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{form ? 'Edit Form' : 'New Form'}</h1>
          {form && <p className="text-muted-foreground text-sm mt-1">{form.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant={tab === 'fields' ? 'default' : 'outline'} size="sm" onClick={() => setTab('fields')}>
            <ClipboardList className="h-4 w-4" /> Fields
          </Button>
          <Button type="button" variant={tab === 'settings' ? 'default' : 'outline'} size="sm" onClick={() => setTab('settings')}>
            <Settings2 className="h-4 w-4" /> Settings
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {tab === 'fields' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Field palette */}
          <div className="col-span-1">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Add fields</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {FIELD_TYPES.map((t) => (
                  <Button key={t.value} type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={() => addField(t.value)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Field canvas */}
          <div className="col-span-2 space-y-3">
            {fields.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <p className="text-sm">Click a field type on the left to add it.</p>
                </CardContent>
              </Card>
            )}
            {fields.map((field, index) => (
              <Card key={index}>
                <CardContent className="space-y-3 py-4 px-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">{FIELD_TYPES.find((t) => t.value === field.fieldType)?.label ?? field.fieldType}</Badge>
                    <div className="flex-1" />
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeField(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {field.fieldType === 'HEADING' || field.fieldType === 'PARAGRAPH' ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Content</Label>
                      <Textarea
                        rows={2}
                        value={field.content ?? ''}
                        onChange={(e) => updateField(index, { content: e.target.value })}
                        placeholder={field.fieldType === 'HEADING' ? 'Section title' : 'Descriptive text...'}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Label *</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="Field label"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={field.placeholder ?? ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="Optional hint"
                          />
                        </div>
                      </div>
                      {(field.fieldType === 'SELECT' || field.fieldType === 'RADIO' || field.fieldType === 'CHECKBOX') && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Options (comma-separated)</Label>
                          <Input
                            value={field.optionsRaw ?? ''}
                            onChange={(e) => updateField(index, { optionsRaw: e.target.value })}
                            placeholder="Option A, Option B, Option C"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Help text</Label>
                        <Input
                          value={field.helpText ?? ''}
                          onChange={(e) => updateField(index, { helpText: e.target.value })}
                          placeholder="Optional description shown below the field"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.isRequired}
                          onChange={(e) => updateField(index, { isRequired: e.target.checked })}
                          className="rounded"
                        />
                        Required
                      </label>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <Card className="max-w-2xl">
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Form title *</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmationMessage">Confirmation message</Label>
              <Textarea id="confirmationMessage" rows={2} placeholder="Thank you for submitting!" {...register('confirmationMessage')} />
            </div>
            <Separator />
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" {...register('isPublished')} />
                Published (publicly accessible)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded" {...register('requiresAuth')} />
                Members only
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
