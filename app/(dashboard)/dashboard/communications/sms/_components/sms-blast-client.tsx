'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { MessageSquare, Send, Users } from 'lucide-react'
import Link from 'next/link'
import { sendSmsBlast } from '@/lib/actions/communications'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  message:  z.string().min(1, 'Message required').max(1600),
  audience: z.enum(['all', 'opted_in', 'tier']),
  tierId:   z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Tier {
  id: string
  name: string
}

interface Props {
  tiers: Tier[]
  optInCount: number
}

export function SmsBlastClient({ tiers, optInCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; total: number } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { message: '', audience: 'opted_in' },
  })

  const audience = watch('audience')
  const message  = watch('message')
  const charCount = message?.length ?? 0
  const smsCount  = Math.ceil(charCount / 160) || 0

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await sendSmsBlast(data)
      if (result.success && result.data) {
        setLastResult(result.data)
        toast.success(`Sent ${result.data.sent} SMS message${result.data.sent !== 1 ? 's' : ''}`)
        reset()
      } else {
        toast.error(result.error ?? 'Failed to send SMS')
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Compose SMS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select
                  defaultValue="opted_in"
                  onValueChange={(v) => setValue('audience', v as FormData['audience'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opted_in">SMS Opted-In Members ({optInCount})</SelectItem>
                    <SelectItem value="all">All Members with Phone (ignores opt-in)</SelectItem>
                    {tiers.length > 0 && (
                      <SelectItem value="tier">Specific Tier (opted-in only)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {audience === 'tier' && tiers.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Membership Tier</Label>
                  <Select onValueChange={(v) => setValue('tierId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Message</Label>
                  <span className={`text-xs ${charCount > 1600 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {charCount}/1600 chars · {smsCount} SMS segment{smsCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <Textarea
                  id="message"
                  {...register('message')}
                  rows={6}
                  placeholder="Type your SMS message here..."
                />
                {errors.message && (
                  <p className="text-xs text-destructive">{errors.message.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                <Send className="h-4 w-4" />
                {isPending ? 'Sending...' : 'Send SMS Blast'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>

      <div className="space-y-4">
        {lastResult && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-base text-green-700 dark:text-green-400">Last Blast Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients found</span>
                <strong>{lastResult.total}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sent successfully</span>
                <strong className="text-green-600">{lastResult.sent}</strong>
              </div>
              {lastResult.failed > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed</span>
                  <strong className="text-destructive">{lastResult.failed}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> SMS Opt-In Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Members opted in</span>
              <strong>{optInCount}</strong>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Members must have a phone number and SMS opt-in enabled in their profile to receive SMS messages (except when using &ldquo;All Members&rdquo; audience).
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/dashboard/members">Manage Members</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>• Keep messages under 160 characters to send as 1 SMS segment.</p>
            <p>• Always include your org name so recipients know who sent it.</p>
            <p>• Twilio charges per SMS segment, per recipient.</p>
            <p>• Set SMS_DISABLED=true in .env to test without sending real messages.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
