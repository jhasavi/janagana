'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: number; // percentage, positive = up
  changeLabel?: string;
  formatter?: (v: number) => string;
  icon?: React.ElementType;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel = 'vs last period',
  formatter,
  icon: Icon,
  loading,
  className,
}: Props) {
  if (loading) return <Skeleton className={cn('h-28 rounded-xl', className)} />;

  const displayValue =
    typeof value === 'number' && formatter ? formatter(value) : String(value);

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isFlat = change !== undefined && change === 0;

  return (
    <div className={cn('rounded-xl border bg-card p-4 space-y-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {Icon && (
          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight">{displayValue}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      {change !== undefined && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            isPositive && 'text-green-600 dark:text-green-400',
            isNegative && 'text-red-600 dark:text-red-400',
            isFlat && 'text-muted-foreground',
          )}
        >
          {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
          {isNegative && <TrendingDown className="h-3.5 w-3.5" />}
          {isFlat && <Minus className="h-3.5 w-3.5" />}
          <span>
            {isPositive ? '+' : ''}{change.toFixed(1)}% {changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
