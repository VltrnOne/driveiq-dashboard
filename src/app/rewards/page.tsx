'use client';
import { useEffect, useState } from 'react';
import { Star, TrendingUp, Award } from 'lucide-react';

interface TopCustomer {
  id: string; name: string; photoUrl?: string; tier: string; rewardPoints: number; visitCount: number; revenue: number;
}

const tierColors: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-800', SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-800', PLATINUM: 'bg-purple-100 text-purple-800',
};
const tierEmoji: Record<string, string> = { BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', PLATINUM: '💎' };

export default function RewardsPage() {
  const [top, setTop] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/top-customers?limit=20', { credentials: 'include' })
      .then(r => r.json())
      .then(r => { if (r.success) setTop(r.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D0D0D]">Rewards & Loyalty</h1>
        <p className="text-sm text-gray-500">Customer leaderboard (last 30 days)</p>
      </div>

      {/* Tier overview */}
      <div className="grid grid-cols-4 gap-4">
        {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map(tier => {
          const count = top.filter(c => c.tier === tier).length;
          return (
            <div key={tier} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <div className="text-3xl mb-2">{tierEmoji[tier]}</div>
              <div className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold mb-2 ${tierColors[tier]}`}>{tier}</div>
              <div className="text-2xl font-bold text-[#0D0D0D]">{count}</div>
              <div className="text-xs text-gray-400">customers</div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 font-semibold text-[#0D0D0D]">
          <Award className="w-4 h-4" /> Top Customers
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {top.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 text-center font-bold text-gray-400 text-sm">
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                </div>
                <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center font-bold text-[#0D0D0D] shrink-0 overflow-hidden">
                  {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" alt="" /> : c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#0D0D0D] truncate">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.visitCount} visits · ${c.revenue.toFixed(2)} spent</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${tierColors[c.tier]}`}>{c.tier}</span>
                <div className="flex items-center gap-1 text-sm font-semibold text-[#0D0D0D] shrink-0">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  {c.rewardPoints.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
