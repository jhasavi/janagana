'use client';

import * as React from 'react';
import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_COLORS } from './LineChart';

export interface AreaConfig {
  dataKey: string;
  name?: string;
  color?: string;
  fillOpacity?: number;
}

interface Props {
  data: object[];
  areas: AreaConfig[];
  xDataKey: string;
  height?: number;
  loading?: boolean;
  stacked?: boolean;
  yTickFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number) => string;
  className?: string;
}

export function AreaChart({
  data,
  areas,
  xDataKey,
  height = 260,
  loading,
  stacked,
  yTickFormatter,
  tooltipFormatter,
  className,
}: Props) {
  if (loading) return <Skeleton className="w-full rounded-lg" style={{ height }} />;

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ReAreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {areas.map((a, i) => {
            const color = a.color ?? CHART_COLORS[i % CHART_COLORS.length];
            return (
              <linearGradient key={a.dataKey} id={`grad-${a.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
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
        {areas.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={8} />
        )}
        {areas.map((a, i) => {
          const color = a.color ?? CHART_COLORS[i % CHART_COLORS.length];
          return (
            <Area
              key={a.dataKey}
              type="monotone"
              dataKey={a.dataKey}
              name={a.name ?? a.dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${a.dataKey})`}
              fillOpacity={a.fillOpacity ?? 1}
              stackId={stacked ? 'a' : undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          );
        })}
      </ReAreaChart>
    </ResponsiveContainer>
  );
}
