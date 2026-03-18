'use client';
import { useState } from 'react';
import { useDetectionStream, type DetectionEvent } from '@/hooks/useDetectionStream';
import CustomerPopup from '@/components/live/CustomerPopup';
import DetectionPanel from '@/components/live/DetectionPanel';
import CameraFeed from '@/components/live/CameraFeed';
import { ShoppingBag, Users, Star, TrendingUp } from 'lucide-react';

export default function LivePage() {
  const { connected, events, latest, dismiss } = useDetectionStream();
  const [selectedEvent, setSelectedEvent] = useState<DetectionEvent | null>(null);

  const activeEvent = selectedEvent ?? latest;

  const handleConfirmOrder = async (items: string[], sessionId?: string) => {
    // In a full impl, this would open an order creation modal
    console.log('Confirming order:', items, 'for session:', sessionId);
  };

  const stats = [
    { label: 'Detections Today', value: events.filter(e => e.type === 'detection').length, icon: Users, color: 'text-blue-600' },
    { label: 'Orders Ready', value: 0, icon: ShoppingBag, color: 'text-orange-500' },
    { label: 'Points Awarded', value: 0, icon: Star, color: 'text-yellow-500' },
    { label: 'Avg Wait', value: '2m', icon: TrendingUp, color: 'text-green-600' },
  ];

  return (
    <div className="p-6 space-y-6 relative min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">Live Drive-Thru</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time customer detection & order management</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${
          connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {connected ? 'System Online' : 'Reconnecting…'}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
            <Icon className={`w-8 h-8 ${color} opacity-80`} />
            <div>
              <div className="text-2xl font-bold text-[#0D0D0D]">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Camera feed — takes 2 cols */}
        <div className="col-span-2 space-y-4">
          <CameraFeed />

          {/* Manual detection trigger */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-sm text-[#0D0D0D] mb-3">Manual Lookup</h3>
            <ManualLookup />
          </div>
        </div>

        {/* Detection panel — 1 col */}
        <div>
          <DetectionPanel
            events={events}
            connected={connected}
            onSelect={setSelectedEvent}
          />
        </div>
      </div>

      {/* Customer popup */}
      {activeEvent && activeEvent.type === 'detection' && (
        <CustomerPopup
          event={activeEvent}
          onDismiss={() => { dismiss(); setSelectedEvent(null); }}
          onConfirmOrder={handleConfirmOrder}
        />
      )}
    </div>
  );
}

function ManualLookup() {
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const lookup = async () => {
    if (!plate.trim()) return;
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/sessions/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detectedPlate: plate.toUpperCase(), method: 'MANUAL', confidence: 1.0 }),
        credentials: 'include',
      });
      const data = await res.json();
      setResult(data.data?.customerFound ? `Customer found: ${data.data.customerId}` : 'Not a registered customer');
    } catch {
      setResult('Error looking up plate');
    } finally {
      setLoading(false);
      setPlate('');
    }
  };

  return (
    <div className="flex gap-3">
      <input
        value={plate}
        onChange={e => setPlate(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && lookup()}
        placeholder="Enter license plate…"
        className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
      />
      <button
        onClick={lookup}
        disabled={loading || !plate.trim()}
        className="bg-[#0D0D0D] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2D2D2D] disabled:opacity-40 transition-colors"
      >
        {loading ? '…' : 'Lookup'}
      </button>
      {result && <span className="self-center text-xs text-gray-500">{result}</span>}
    </div>
  );
}
