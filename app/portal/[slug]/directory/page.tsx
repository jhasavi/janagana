import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { initials } from '@/lib/utils'

export const metadata: Metadata = { title: 'Member Directory' }

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; tier?: string }>
}) {
  const { slug } = await params
  const { q, tier: tierFilter } = await searchParams

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { membershipTiers: { where: { isActive: true }, orderBy: { priceCents: 'asc' } } },
  })
  if (!tenant) notFound()

  const where: Record<string, unknown> = {
    tenantId: tenant.id,
    status: 'ACTIVE',
  }
  if (tierFilter && tierFilter !== 'all') {
    where.tierId = tierFilter
  }
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { bio: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
    ]
  }

  const members = await prisma.member.findMany({
    where,
    include: { tier: { select: { name: true, color: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Member Directory</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {members.length} active member{members.length !== 1 ? 's' : ''}
          {q && ` matching "${q}"`}
        </p>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search members..."
          className="max-w-xs"
        />
        {tenant.membershipTiers.length > 0 && (
          <select
            name="tier"
            defaultValue={tierFilter ?? 'all'}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring"
          >
            <option value="all">All tiers</option>
            {tenant.membershipTiers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Search
        </button>
        {(q || tierFilter) && (
          <a href={`/portal/${slug}/directory`} className="px-4 py-2 rounded-md border text-sm hover:bg-muted">
            Clear
          </a>
        )}
      </form>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-muted-foreground">No members found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start gap-4">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback
                    className="text-sm font-semibold"
                    style={{
                      backgroundColor: member.tier?.color
                        ? `${member.tier.color}20`
                        : undefined,
                      color: member.tier?.color ?? undefined,
                    }}
                  >
                    {initials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">
                    {member.firstName} {member.lastName}
                  </p>
                  {member.tier && (
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {member.tier.name}
                    </Badge>
                  )}
                  {member.city && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {[member.city, member.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {member.bio && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {member.bio}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
