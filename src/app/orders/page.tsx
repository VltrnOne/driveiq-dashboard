'use client';
import { useEffect, useState } from 'react';
import { ShoppingBag, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface Order {
  id: string; total: number; status: string; method: string; createdAt: string; notes?: string;
  customer?: { id: string; name: string; tier: string };
  items: { quantity: number; unitPrice: number; menuItem: { name: string; category: string } }[];
}

const statuses = ['ALL', 'PENDING', 'IN_PROGRESS', 'READY', 'COMPLETE', 'CANCELLED'];
const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', IN_PROGRESS: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800', COMPLETE: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const q = status !== 'ALL' ? `?status=${status}` : '';
    fetch(`/api/orders${q}&limit=30`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => { if (r.success) setOrders(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const advance = async (id: string, current: string) => {
    const next: Record<string, string> = { PENDING: 'IN_PROGRESS', IN_PROGRESS: 'READY', READY: 'COMPLETE' };
    if (current === 'READY') {
      await fetch(`/api/orders/${id}/complete`, { method: 'POST', credentials: 'include' });
    } else if (next[current]) {
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next[current] }),
      });
    }
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">Orders</h1>
          <p className="text-sm text-gray-500">{orders.length} showing</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              status === s ? 'bg-[#0D0D0D] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {s === 'ALL' ? 'All Orders' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[o.status]}`}>{o.status.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400">{o.method}</span>
                  {o.customer && <span className="text-xs text-gray-600 font-medium">{o.customer.name}</span>}
                </div>
                <div className="text-sm text-gray-700 truncate">
                  {o.items.map(i => `${i.menuItem.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(' · ')}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(o.createdAt).toLocaleTimeString()} · ${o.total.toFixed(2)}
                </div>
              </div>

              {['PENDING', 'IN_PROGRESS', 'READY'].includes(o.status) && (
                <button
                  onClick={() => advance(o.id, o.status)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    o.status === 'READY' ? 'bg-green-600 text-white hover:bg-green-700' :
                    'bg-[#0066FF] text-white hover:bg-[#0055DD]'
                  }`}
                >
                  {o.status === 'READY' ? <><CheckCircle className="w-4 h-4" /> Complete</> :
                   o.status === 'PENDING' ? <><Clock className="w-4 h-4" /> Start</> :
                   <><CheckCircle className="w-4 h-4" /> Ready</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
