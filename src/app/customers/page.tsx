'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Star, Car } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  rewardPoints: number;
  tier: string;
  visitCount: number;
  lastVisitAt?: string;
  vehicles: { licensePlate: string }[];
}

const tierColors: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-800',
  SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-purple-100 text-purple-800',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/customers?search=${encodeURIComponent(search)}&limit=30`, { credentials: 'include' })
        .then(r => r.json())
        .then(r => { if (r.success) { setCustomers(r.data); setTotal(r.pagination.total); } })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">Customers</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} registered</p>
        </div>
        <Link href="/customers/new" className="flex items-center gap-2 bg-[#0D0D0D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2D2D2D] transition-colors">
          <Plus className="w-4 h-4" /> New Customer
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, or plate…"
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {customers.map(c => (
            <Link key={c.id} href={`/customers/${c.id}`} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-[#0066FF]/30 transition-all block">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#F5F0EB] flex items-center justify-center font-bold text-lg text-[#0D0D0D] shrink-0 overflow-hidden">
                  {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" alt="" /> : c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#0D0D0D] truncate">{c.name}</div>
                  <div className="text-xs text-gray-400 truncate">{c.phone ?? c.email ?? 'No contact'}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColors[c.tier]}`}>{c.tier}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-500" />{c.rewardPoints.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
                <span>{c.visitCount} visits</span>
                {c.vehicles[0] && (
                  <span className="flex items-center gap-1">
                    <Car className="w-3 h-3" />{c.vehicles[0].licensePlate}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
