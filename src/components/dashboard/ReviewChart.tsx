import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';

interface ReviewChartProps {
  series: { date: string; reviews: number }[];
}

export function ReviewChart({ series }: ReviewChartProps) {
  const data = series.map((d) => ({ ...d, label: format(parseISO(d.date), 'EEE') }));
  const total = series.reduce((sum, d) => sum + d.reviews, 0);

  return (
    <div>
      <div
        className="h-48 w-full"
        role="img"
        aria-label={`Weekly activity chart: ${total} cards reviewed across the last 7 days`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E4E6EA" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: '#8B93A2', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8B93A2', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: '#F5F4F0' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #E4E6EA', fontSize: 12 }}
              formatter={(value: number) => [`${value} cards`, 'Reviewed']}
            />
            <Bar dataKey="reviews" fill="#3157E5" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
