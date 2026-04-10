import * as React from 'react';

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  locale?: string;
  className?: string;
}

export function PriceDisplay({ amount, currency = 'USD', locale = 'en-US', className }: PriceDisplayProps) {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100); // amount in cents

  return <span className={className}>{formatted}</span>;
}
