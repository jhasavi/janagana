'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface HelpButtonProps {
  title: string
  content: string
  link?: string
}

export function HelpButton({ title, content, link }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  const isInternalLink = link?.startsWith('/')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground whitespace-pre-line">{content}</p>
          {link && isInternalLink ? (
            <Link
              href={link}
              className="text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Learn more →
            </Link>
          ) : link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Learn more →
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
