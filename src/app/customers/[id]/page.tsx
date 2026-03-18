'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, Car, ShoppingBag, QrCode, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface CustomerDetail {
  id: string; name: string; email?: string; phone?: string; photoUrl?: string;
  rewardPoints: number; tier: string; visitCount: number; notes?: string;
  preferences?: string[]; allergies?: string[]; faceEnrolled: boolean; qrToken: string;
  vehicles: { id: string; licensePlate: string; make?: string; model?: string; color?: string; isPrimary: boolean }[];
  orders: { id: string; total: number; status: string; createdAt: string; items: { menuItem: { name: string }; quantity: number }[] }[];
  rewardTxns: { id: string; points: number; type: string; note?: string; createdAt: string }[];
}

const tierColors: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-800', SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-800', PLATINUM: 'bg-purple-100 text-purple-800',
};

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => { if (r.success) setCustomer(r.data); });
  }, [id]);

  if (!customer) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <Link href="/customers" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0D0D0D] w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-[#F5F0EB] flex items-center justify-center text-3xl font-bold text-[#0D0D0D] shrink-0 overflow-hidden">
          {customer.photoUrl ? <img src={customer.photoUrl} className="w-full h-full object-cover" alt="" /> : customer.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0D0D0D]">{customer.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tierColors[customer.tier]}`}>{customer.tier}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1 space-x-4">
            {customer.phone && <span>{customer.phone}</span>}
            {customer.email && <span>{customer.email}</span>}
          </div>
          <div className="flex items-center gap-6 mt-3 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-bold text-[#0D0D0D]">{customer.rewardPoints.toLocaleString()}</span>
              <span className="text-gray-400">points</span>
            </div>
            <div className="text-gray-400">{customer.visitCount} visits</div>
            {customer.faceEnrolled && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Face enrolled</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowQR(!showQR)} className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
            <QrCode className="w-4 h-4" /> QR Code
          </button>
        </div>
      </div>

      {showQR && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center gap-3">
          <h3 className="font-semibold text-[#0D0D0D]">Customer QR Code</h3>
          <img src={`/api/customers/${id}/qrcode`} alt="QR Code" className="w-48 h-48" />
          <p className="text-xs text-gray-500 text-center">Customer scans this at the drive-thru window to identify themselves instantly</p>
          <a href={`/api/customers/${id}/qrcode`} download className="text-sm text-[#0066FF] hover:underline">Download PNG</a>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Vehicles */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-[#0D0D0D] mb-4 flex items-center gap-2"><Car className="w-4 h-4" /> Vehicles</h3>
          {customer.vehicles.length === 0 ? (
            <p className="text-sm text-gray-400">No vehicles registered</p>
          ) : (
            <div className="space-y-3">
              {customer.vehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-[#0D0D0D]">{v.licensePlate}</div>
                    <div className="text-xs text-gray-400">{[v.color, v.make, v.model].filter(Boolean).join(' ')}</div>
                  </div>
                  {v.isPrimary && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Primary</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preferences & allergies */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-[#0D0D0D] mb-4">Preferences</h3>
          <div className="space-y-3">
            {customer.allergies && customer.allergies.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> Allergies</div>
                <div className="flex flex-wrap gap-1.5">
                  {customer.allergies.map(a => (
                    <span key={a} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {customer.preferences && customer.preferences.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-1.5">Preferences</div>
                <div className="flex flex-wrap gap-1.5">
                  {customer.preferences.map(p => (
                    <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {customer.notes && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Notes</div>
                <p className="text-sm text-gray-700">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rewards summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-[#0D0D0D] mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Reward History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {customer.rewardTxns.map(t => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 text-xs truncate">{t.note ?? t.type}</span>
                <span className={`font-semibold text-xs ${t.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {t.points > 0 ? '+' : ''}{t.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-[#0D0D0D] mb-4 flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Recent Orders</h3>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-gray-400">No orders yet</p>
        ) : (
          <div className="space-y-3">
            {customer.orders.map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-[#0D0D0D]">
                    {o.items.map(i => `${i.menuItem.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
                  </div>
                  <div className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">${o.total.toFixed(2)}</div>
                  <span className={`text-xs status-${o.status} px-2 py-0.5 rounded-full`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
