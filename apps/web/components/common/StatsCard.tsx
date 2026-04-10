import * as React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ElementType;
  className?: string;
}

export function StatsCard({ title, value, trend, icon: Icon, className }: StatsCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <Card className={cn(className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'mt-3 flex items-center gap-1 text-xs font-medium',
              isPositive ? 'text-success' : 'text-destructive',
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend.value)}%</span>
            {trend.label && <span className="text-muted-foreground font-normal">{trend.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
