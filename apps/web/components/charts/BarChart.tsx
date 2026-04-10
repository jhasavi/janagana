'use client';

import * as React from 'react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_COLORS } from './LineChart';

export interface BarConfig {
  dataKey: string;
  name?: string;
  color?: string;
  radius?: [number, number, number, number];
}

interface Props {
  data: object[];
  bars: BarConfig[];
  xDataKey: string;
  height?: number;
  loading?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  yTickFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number) => string;
  className?: string;
  colorEachBar?: boolean; // apply CHART_COLORS individually to each bar cell
}

export function BarChart({
  data,
  bars,
  xDataKey,
  height = 260,
  loading,
  stacked,
  horizontal,
  yTickFormatter,
  tooltipFormatter,
  className,
  colorEachBar,
}: Props) {
  if (loading) return <Skeleton className="w-full rounded-lg" style={{ height }} />;

  const layout = horizontal ? 'vertical' : 'horizontal';

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <ReBarChart
        data={data}
        layout={layout}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="30%"
        barGap={2}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={yTickFormatter}
            />
            <YAxis
              type="category"
              dataKey={xDataKey}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
          </>
        ) : (
          <>
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
          </>
        )}
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
        {bars.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="square" iconSize={10} />
        )}
        {bars.map((b, i) => (
          <Bar
            key={b.dataKey}
            dataKey={b.dataKey}
            name={b.name ?? b.dataKey}
            fill={b.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            stackId={stacked ? 'a' : undefined}
            radius={b.radius ?? (i === bars.length - 1 ? [3, 3, 0, 0] : undefined)}
          >
            {colorEachBar && data.map((_, ci) => (
              <Cell key={ci} fill={CHART_COLORS[ci % CHART_COLORS.length]} />
            ))}
          </Bar>
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}
