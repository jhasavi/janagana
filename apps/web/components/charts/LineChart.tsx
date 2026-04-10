'use client';

import * as React from 'react';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ec4899',
  '#14b8a6', '#f59e0b', '#6366f1', '#ef4444',
];

export interface LineConfig {
  dataKey: string;
  name?: string;
  color?: string;
  strokeDasharray?: string;
}

interface Props {
  data: object[];
  lines: LineConfig[];
  xDataKey: string;
  height?: number;
  loading?: boolean;
  yTickFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number) => string;
  className?: string;
}

export function LineChart({
  data,
  lines,
  xDataKey,
  height = 260,
  loading,
  yTickFormatter,
  tooltipFormatter,
  className,
}: Props) {
  if (loading) return <Skeleton className={`w-full rounded-lg`} style={{ height }} />;

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ReLineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey={xDataKey}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={yTickFormatter}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 13,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) =>
            tooltipFormatter ? tooltipFormatter(value) : value
          }
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {lines.map((l, i) => (
          <Line
            key={l.dataKey}
            type="monotone"
            dataKey={l.dataKey}
            name={l.name ?? l.dataKey}
            stroke={l.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            strokeDasharray={l.strokeDasharray}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}
