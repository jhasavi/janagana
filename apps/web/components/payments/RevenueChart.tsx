'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { PaymentStats } from '@/lib/types/payments';

interface RevenueChartProps {
  data: PaymentStats['chart'];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-72 rounded-3xl border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
          <Tooltip formatter={(value) => {
            if (typeof value === 'number') {
              return `$${(value / 100).toFixed(2)}`;
            }
            return typeof value === 'string' ? value : '';
          }} />
          <Line type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
