'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface HelpButtonProps {
  className?: string;
}

export function HelpButton({ className }: HelpButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      asChild
    >
      <Link href="/help" aria-label="Help">
        <HelpCircle className="h-5 w-5" />
      </Link>
    </Button>
  );
}
