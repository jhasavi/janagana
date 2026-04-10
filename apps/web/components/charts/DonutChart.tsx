'use client';

import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_COLORS } from './LineChart';

interface Props {
  data: { name: string; value: number }[];
  height?: number;
  loading?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
  valueFormatter?: (v: number) => string;
  showLegend?: boolean;
  className?: string;
}

export function DonutChart({
  data,
  height = 240,
  loading,
  innerRadius = 55,
  outerRadius = 90,
  colors = CHART_COLORS,
  valueFormatter,
  showLegend = true,
  className,
}: Props) {
  if (loading) return <Skeleton className="w-full rounded-lg" style={{ height }} />;
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value: unknown) => [
            valueFormatter
              ? valueFormatter(value as number)
              : `${value} (${total > 0 ? Math.round(((value as number) / total) * 100) : 0}%)`,
            '',
          ]}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
