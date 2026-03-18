'use client';
import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Users } from 'lucide-react';

interface SalesData {
  chart: { date: string; revenue: number; count: number }[];
  totalRevenue: number; totalOrders: number; avgOrderValue: number;
}

interface PopularItem { name: string; category: string; totalQuantity: number; }

export default function AnalyticsPage() {
  const [sales, setSales] = useState<SalesData | null>(null);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/sales', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/analytics/popular-items', { credentials: 'include' }).then(r => r.json()),
    ]).then(([s, p]) => {
      if (s.success) setSales(s.data);
      if (p.success) setPopular(p.data);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Revenue (30d)', value: sales ? `$${sales.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—', icon: DollarSign, color: 'text-green-600' },
    { label: 'Orders (30d)', value: sales?.totalOrders?.toLocaleString() ?? '—', icon: ShoppingBag, color: 'text-blue-600' },
    { label: 'Avg Order', value: sales ? `$${sales.avgOrderValue.toFixed(2)}` : '—', icon: TrendingUp, color: 'text-orange-500' },
    { label: 'Unique Customers', value: '—', icon: Users, color: 'text-violet-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D0D0D]">Analytics</h1>
        <p className="text-sm text-gray-500">Last 30 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <div className={`${color} mb-2`}><Icon className="w-5 h-5" /></div>
            <div className="text-2xl font-bold text-[#0D0D0D]">{loading ? '…' : value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-[#0D0D0D] mb-4">Daily Revenue</h3>
          {!loading && sales && (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sales.chart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066FF" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#0066FF" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Popular items */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-[#0D0D0D] mb-4">Popular Items</h3>
          {!loading && popular.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={popular.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="totalQuantity" radius={[0, 4, 4, 0]}>
                  {popular.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={`hsl(${220 + i * 15}, 80%, ${55 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
