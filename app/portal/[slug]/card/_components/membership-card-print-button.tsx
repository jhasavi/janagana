'use client'

import { Button } from '@/components/ui/button'

export function MembershipCardPrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="print:hidden px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      Print / Save as PDF
    </Button>
  )
}
