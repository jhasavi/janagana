'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Search } from 'lucide-react'
import Link from 'next/link'
import { createMember, updateMember } from '@/lib/actions/members'
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
import type { Member, MembershipTier } from '@prisma/client'

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  smsOptIn: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BANNED']),
  tierId: z.string().optional().nullable(),
  joinedAt: z.string().optional(),
  renewsAt: z.string().optional().nullable(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  bio: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface MemberFormProps {
  member?: Member | null
  tiers: MembershipTier[]
}

export function MemberForm({ member, tiers }: MemberFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLookingUpContact, startLookupTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: member?.firstName ?? '',
      lastName: member?.lastName ?? '',
      email: member?.email ?? '',
      phone: member?.phone ?? '',
      smsOptIn: (member as Member & { smsOptIn?: boolean })?.smsOptIn ?? false,
      status: member?.status ?? 'ACTIVE',
      tierId: member?.tierId ?? null,
      joinedAt: member?.joinedAt
        ? new Date(member.joinedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      renewsAt: member?.renewsAt
        ? new Date(member.renewsAt).toISOString().split('T')[0]
        : null,
      address: member?.address ?? '',
      city: member?.city ?? '',
      state: member?.state ?? '',
      postalCode: member?.postalCode ?? '',
      country: member?.country ?? 'US',
      bio: member?.bio ?? '',
      notes: member?.notes ?? '',
    },
  })

  const lookupExistingContact = () => {
    const email = watch('email')
    if (!email) {
      toast.error('Enter an email first to search contacts')
      return
    }

    startLookupTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/crm/contacts/search?q=${encodeURIComponent(email)}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          toast.error(result.error ?? 'Failed to search contacts')
          return
        }

        const match = (result.contacts ?? [])[0]
        if (!match) {
          toast.info('No existing contact found. A new contact will be created with this membership.')
          return
        }

        setValue('firstName', match.firstName || watch('firstName'))
        setValue('lastName', match.lastName || watch('lastName'))
        if (!watch('phone')) setValue('phone', match.phone || '')
        if (!watch('address')) setValue('address', match.address || '')
        if (!watch('city')) setValue('city', match.city || '')
        if (!watch('state')) setValue('state', match.state || '')
        if (!watch('postalCode')) setValue('postalCode', match.postalCode || '')
        if (!watch('country')) setValue('country', match.country || 'US')

        toast.success(`Using existing contact: ${match.firstName} ${match.lastName}`)
      } catch {
        toast.error('Failed to search contacts')
      }
    })
  }

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = member
        ? await updateMember(member.id, data)
        : await createMember(data)

      if (result.success) {
        toast.success(member ? 'Membership updated' : 'Membership created')
        router.push('/dashboard/members')
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {member ? 'Edit Membership' : 'Add Membership'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {member
              ? `Editing ${member.firstName} ${member.lastName}`
              : 'Search for an existing contact first, then create membership enrollment'}
          </p>
        </div>
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? 'Saving...' : 'Save Membership'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: main fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact & Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Contact Email <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input id="email" type="email" {...register('email')} />
                  <Button type="button" variant="outline" onClick={lookupExistingContact} disabled={isLookingUpContact}>
                    <Search className="h-4 w-4" />
                    {isLookingUpContact ? 'Searching...' : 'Find Contact'}
                  </Button>
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Search for an existing contact first. If none exists, a new contact will be created inline.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" {...register('phone')} />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                <Controller
                  name="smsOptIn"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="smsOptIn"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="smsOptIn" className="cursor-pointer font-normal">
                  SMS opt-in — member consents to receive SMS notifications
                </Label>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  placeholder="Short bio or description..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" {...register('address')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register('state')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode">Zip Code</Label>
                <Input id="postalCode" {...register('postalCode')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register('country')} />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register('notes')}
                placeholder="Private notes about this member (not visible to them)..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: status / tier / dates */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Membership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  defaultValue={watch('status')}
                  onValueChange={(v) =>
                    setValue('status', v as FormData['status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="BANNED">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tiers.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Membership Tier</Label>
                  <Select
                    defaultValue={watch('tierId') ?? 'none'}
                    onValueChange={(v) =>
                      setValue('tierId', v === 'none' ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No tier</SelectItem>
                      {tiers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="joinedAt">Join Date</Label>
                <Input id="joinedAt" type="date" {...register('joinedAt')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="renewsAt">Renewal Date</Label>
                <Input id="renewsAt" type="date" {...register('renewsAt')} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
