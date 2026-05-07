/**
 * Loading Skeleton Components
 *
 * Reusable skeleton loaders for common dashboard patterns.
 * Use with React Suspense to show during data loading.
 *
 * Example:
 * ```tsx
 * <Suspense fallback={<MembersTableSkeleton />}>
 *   <MembersTable />
 * </Suspense>
 * ```
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'

// Base pulse animation class
const pulseClass = 'bg-muted animate-pulse'

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className={`h-4 w-32 ${pulseClass}`} />
        <div className={`h-3 w-24 ${pulseClass}`} />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`h-3 w-full ${pulseClass}`} />
        <div className={`h-3 w-5/6 ${pulseClass}`} />
      </CardContent>
    </Card>
  )
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-4">
      <div className={`h-8 w-64 ${pulseClass}`} />
      <div className={`h-4 w-96 ${pulseClass}`} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Table header */}
      <div className="flex gap-4 mb-4">
        <div className={`h-4 flex-1 ${pulseClass}`} />
        <div className={`h-4 flex-1 ${pulseClass}`} />
        <div className={`h-4 flex-1 ${pulseClass}`} />
        <div className={`h-4 w-24 ${pulseClass}`} />
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className={`h-4 flex-1 ${pulseClass}`} />
          <div className={`h-4 flex-1 ${pulseClass}`} />
          <div className={`h-4 flex-1 ${pulseClass}`} />
          <div className={`h-4 w-24 ${pulseClass}`} />
        </div>
      ))}
    </div>
  )
}

export function MembersTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className={`h-6 w-40 ${pulseClass}`} />
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={6} />
      </CardContent>
    </Card>
  )
}

export function EventCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <div className={`h-40 w-full ${pulseClass}`} />
          <CardHeader className="space-y-2">
            <div className={`h-5 w-48 ${pulseClass}`} />
            <div className={`h-3 w-32 ${pulseClass}`} />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={`h-3 w-full ${pulseClass}`} />
            <div className={`h-8 w-24 ${pulseClass}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className={`h-4 w-24 ${pulseClass}`} />
          </CardHeader>
          <CardContent>
            <div className={`h-8 w-16 mb-2 ${pulseClass}`} />
            <div className={`h-3 w-32 ${pulseClass}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className={`h-6 w-40 ${pulseClass}`} />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name field */}
        <div className="space-y-2">
          <div className={`h-4 w-16 ${pulseClass}`} />
          <div className={`h-10 w-full ${pulseClass}`} />
        </div>

        {/* Email field */}
        <div className="space-y-2">
          <div className={`h-4 w-16 ${pulseClass}`} />
          <div className={`h-10 w-full ${pulseClass}`} />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-4">
          <div className={`h-10 w-24 ${pulseClass}`} />
          <div className={`h-10 w-24 ${pulseClass}`} />
        </div>
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className={`h-6 w-40 mb-4 ${pulseClass}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-8 w-8 ${pulseClass}`} />
              <div className={`h-4 flex-1 ${pulseClass}`} />
              <div className={`h-4 w-12 ${pulseClass}`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`h-12 w-full ${pulseClass} rounded`} />
      ))}
    </div>
  )
}

/**
 * Usage Example in a Server Component:
 *
 * ```tsx
 * import { Suspense } from 'react'
 * import { MembersTableSkeleton } from '@/components/ui/skeletons'
 * import { MembersTable } from './_components/members-table'
 *
 * export default function MembersPage() {
 *   return (
 *     <div>
 *       <h1>Members</h1>
 *       <Suspense fallback={<MembersTableSkeleton />}>
 *         <MembersTable />
 *       </Suspense>
 *     </div>
 *   )
 * }
 * ```
 */
