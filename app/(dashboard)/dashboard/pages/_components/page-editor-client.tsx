'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { createContentPage, updateContentPage, deleteContentPage } from '@/lib/actions/pages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import type { ContentPage } from '@prisma/client'

const schema = z.object({
  title:       z.string().min(1, 'Title required'),
  slug:        z.string().optional(),
  excerpt:     z.string().optional(),
  content:     z.string().default(''),
  isPublished: z.boolean().default(false),
  showInNav:   z.boolean().default(false),
  sortOrder:   z.number().int().default(0),
})
type FormData = z.infer<typeof schema>

const CONTENT_SHORTCUTS = [
  { label: 'Heading', insert: '<h2>Heading</h2>\n' },
  { label: 'Paragraph', insert: '<p>Your text here...</p>\n' },
  { label: 'Bold', insert: '<strong>bold text</strong>' },
  { label: 'Link', insert: '<a href="https://example.com">link text</a>' },
  { label: 'Ordered list', insert: '<ol>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ol>\n' },
  { label: 'Unordered list', insert: '<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n' },
  { label: 'Divider', insert: '<hr />\n' },
]

interface Props {
  page?: ContentPage | null
}

export function PageEditorClient({ page }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:       page?.title ?? '',
      slug:        page?.slug ?? '',
      excerpt:     page?.excerpt ?? '',
      content:     page?.content ?? '',
      isPublished: page?.isPublished ?? false,
      showInNav:   page?.showInNav ?? false,
      sortOrder:   page?.sortOrder ?? 0,
    },
  })

  const content = watch('content')
  const title   = watch('title')

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: true,
      }),
      Placeholder.configure({
        placeholder: 'Write your page content here…',
      }),
    ],
    content: page?.content ?? '',
    onUpdate: ({ editor }) => {
      setValue('content', editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'min-h-[300px] focus:outline-none',
      },
    },
  })

  useEffect(() => {
    if (editor && page) {
      editor.commands.setContent(page.content ?? '')
    }
  }, [editor, page?.content])

  const insertSnippet = (text: string) => {
    if (editor) {
      editor.commands.insertContent(text)
      return
    }

    setValue('content', (content ?? '') + text)
  }

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = page
        ? await updateContentPage(page.id, data)
        : await createContentPage(data)

      if (result.success) {
        toast.success(page ? 'Page updated' : 'Page created')
        router.push('/dashboard/pages')
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  const handleDelete = () => {
    if (!page || !confirm('Delete this page permanently?')) return
    startTransition(async () => {
      const result = await deleteContentPage(page.id)
      if (result.success) {
        toast.success('Page deleted')
        router.push('/dashboard/pages')
      } else {
        toast.error(result.error ?? 'Delete failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/pages"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {page ? 'Edit Page' : 'New Page'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {page ? `Editing "${page.title}"` : 'Create a public-facing page for your portal'}
          </p>
        </div>
        <div className="flex gap-2">
          {page && (
            <Button type="button" variant="ghost" size="icon" onClick={handleDelete} disabled={isPending}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Page'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" {...register('title')} placeholder="Page title" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Input
                  id="excerpt"
                  {...register('excerpt')}
                  placeholder="Short description shown in lists and SEO"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Content (HTML)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreview(!preview)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    {preview ? 'Edit' : 'Preview'}
                  </Button>
                </div>

                {/* Shortcut buttons */}
                {!preview && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {CONTENT_SHORTCUTS.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => insertSnippet(s.insert)}
                        className="text-xs px-2 py-1 rounded border border-border bg-muted hover:bg-muted/80 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {preview ? (
                  <div
                    className="min-h-[300px] rounded-md border p-4 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: content ?? '' }}
                  />
                ) : (
                  <div className="rounded-md border bg-background p-2">
                    {editor ? (
                      <EditorContent editor={editor} />
                    ) : (
                      <div className="min-h-[300px] p-4 text-sm text-muted-foreground">
                        Loading editor…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="slug">
                  URL Slug
                  <span className="text-muted-foreground font-normal ml-1">(auto from title)</span>
                </Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="my-page-slug"
                />
                <p className="text-xs text-muted-foreground">
                  Portal URL: /portal/[org]/pages/<strong>{watch('slug') || 'slug'}</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  {...register('sortOrder', { valueAsNumber: true })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Controller
                  name="isPublished"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="isPublished"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isPublished" className="cursor-pointer font-normal">
                  Published (visible on portal)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Controller
                  name="showInNav"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="showInNav"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="showInNav" className="cursor-pointer font-normal">
                  Show in portal navigation
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
