'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DollarSign, Calendar, Building2, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { Deal, Contact, Company } from '@prisma/client'

type DealWithRelations = Deal & {
  contact: Contact
  company: Company | null
}

interface DealKanbanProps {
  deals: DealWithRelations[]
}

const stages = [
  { id: 'LEAD', label: 'Lead', color: 'bg-gray-100' },
  { id: 'QUALIFIED', label: 'Qualified', color: 'bg-blue-100' },
  { id: 'PROPOSAL', label: 'Proposal', color: 'bg-yellow-100' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-100' },
  { id: 'CLOSED_WON', label: 'Won', color: 'bg-green-100' },
  { id: 'CLOSED_LOST', label: 'Lost', color: 'bg-red-100' },
]

export function DealKanban({ deals }: DealKanbanProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const groupedDeals = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter((deal) => deal.stage === stage.id)
    return acc
  }, {} as Record<string, DealWithRelations[]>)

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const response = await fetch(`/api/dashboard/crm/deals/${deleteId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to delete deal:', error)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <div className={`${stage.color} rounded-t-lg p-3`}>
              <h3 className="font-semibold text-sm">
                {stage.label} ({groupedDeals[stage.id]?.length || 0})
              </h3>
            </div>
            <div className="border border-t-0 rounded-b-lg p-3 space-y-3 min-h-[400px] bg-card">
              {groupedDeals[stage.id]?.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/dashboard/crm/deals/${deal.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {deal.title}
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/crm/deals/${deal.id}`}>
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(deal.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{formatCurrency(deal.valueCents)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {deal.contact.firstName} {deal.contact.lastName}
                    </div>
                    {deal.company && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {deal.company.name}
                      </div>
                    )}
                    {deal.expectedCloseDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(deal.expectedCloseDate)}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {deal.probability}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {groupedDeals[stage.id]?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No deals
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this deal? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Deal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
