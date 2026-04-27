'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import {
  createSurvey,
  updateSurvey,
  deleteSurvey,
  saveSurveyQuestions,
} from '@/lib/actions/surveys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Survey, SurveyQuestion } from '@prisma/client'

const settingsSchema = z.object({
  title:       z.string().min(1, 'Title required'),
  description: z.string().optional(),
  isPublished: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  showResults: z.boolean().default(false),
  closesAt:    z.string().optional().nullable(),
})
type SettingsData = z.infer<typeof settingsSchema>

type QuestionDraft = {
  id?: string
  text: string
  type: SurveyQuestion['type']
  options: string[]
  isRequired: boolean
  sortOrder: number
}

const QUESTION_TYPES: { value: SurveyQuestion['type']; label: string }[] = [
  { value: 'TEXT', label: 'Short Text' },
  { value: 'TEXTAREA', label: 'Long Text' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice (radio)' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice (checkboxes)' },
  { value: 'RATING', label: 'Rating (1–5 stars)' },
  { value: 'YES_NO', label: 'Yes / No' },
]

interface Props {
  survey?: (Survey & { questions: SurveyQuestion[] }) | null
}

export function SurveyBuilderClient({ survey }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'questions' | 'settings'>('questions')

  const [questions, setQuestions] = useState<QuestionDraft[]>(
    survey?.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      isRequired: q.isRequired,
      sortOrder: q.sortOrder,
    })) ?? []
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      title:       survey?.title ?? '',
      description: survey?.description ?? '',
      isPublished: survey?.isPublished ?? false,
      isAnonymous: survey?.isAnonymous ?? false,
      showResults: survey?.showResults ?? false,
      closesAt:    survey?.closesAt ? new Date(survey.closesAt).toISOString().split('T')[0] : null,
    },
  })

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { text: '', type: 'TEXT', options: [], isRequired: false, sortOrder: prev.length },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    )
  }

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] } : q
      )
    )
  }

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) }
          : q
      )
    )
  }

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex) } : q
      )
    )
  }

  const onSave = (settings: SettingsData) => {
    startTransition(async () => {
      let surveyId = survey?.id
      if (!surveyId) {
        const created = await createSurvey(settings)
        if (!created.success || !created.data) {
          toast.error(created.error ?? 'Failed to create survey')
          return
        }
        surveyId = created.data.id
      } else {
        const updated = await updateSurvey(surveyId, settings)
        if (!updated.success) {
          toast.error(updated.error ?? 'Failed to update survey')
          return
        }
      }

      const qResult = await saveSurveyQuestions(surveyId, questions)
      if (!qResult.success) {
        toast.error(qResult.error ?? 'Failed to save questions')
        return
      }

      toast.success(survey ? 'Survey updated' : 'Survey created')
      router.push('/dashboard/surveys')
    })
  }

  const handleDelete = () => {
    if (!survey || !confirm('Delete this survey and all responses?')) return
    startTransition(async () => {
      const result = await deleteSurvey(survey.id)
      if (result.success) {
        toast.success('Survey deleted')
        router.push('/dashboard/surveys')
      } else {
        toast.error(result.error ?? 'Delete failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/surveys"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{survey ? 'Edit Survey' : 'New Survey'}</h1>
        </div>
        <div className="flex gap-2">
          {survey && (
            <Button type="button" variant="ghost" size="icon" onClick={handleDelete} disabled={isPending}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Survey'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['questions', 'settings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'questions' && (
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <Card key={qi}>
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Q{qi + 1}</span>
                <div className="flex-1" />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeQuestion(qi)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Question *</Label>
                    <Input
                      value={q.text}
                      onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                      placeholder="Enter question text..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={q.type}
                      onValueChange={(v) => updateQuestion(qi, { type: v as typeof q.type, options: [] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id={`req-${qi}`}
                      checked={q.isRequired}
                      onChange={(e) => updateQuestion(qi, { isRequired: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    <Label htmlFor={`req-${qi}`} className="cursor-pointer font-normal">Required</Label>
                  </div>
                </div>

                {/* Options for choice types */}
                {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && (
                  <div className="space-y-2">
                    <Label>Answer Options</Label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 shrink-0"
                          onClick={() => removeOption(qi, oi)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addOption(qi)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Option
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>
      )}

      {tab === 'settings' && (
        <div className="max-w-lg space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Survey Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...register('title')} placeholder="Survey title" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} rows={3} placeholder="What is this survey about?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closesAt">Closes At (optional)</Label>
                <Input id="closesAt" type="date" {...register('closesAt')} />
              </div>
              <Separator />
              {(['isPublished', 'isAnonymous', 'showResults'] as const).map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <Controller
                    name={field}
                    control={control}
                    render={({ field: f }) => (
                      <input
                        type="checkbox"
                        id={field}
                        className="h-4 w-4 rounded"
                        checked={f.value as boolean}
                        onChange={f.onChange}
                      />
                    )}
                  />
                  <Label htmlFor={field} className="cursor-pointer font-normal">
                    {field === 'isPublished' && 'Published (visible to members)'}
                    {field === 'isAnonymous' && 'Anonymous responses'}
                    {field === 'showResults' && 'Show results to respondents after submission'}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </form>
  )
}
