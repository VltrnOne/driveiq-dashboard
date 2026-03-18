'use client';
import { Camera, Wifi, WifiOff } from 'lucide-react';
import type { DetectionEvent } from '@/hooks/useDetectionStream';

interface Props {
  events: DetectionEvent[];
  connected: boolean;
  onSelect: (event: DetectionEvent) => void;
}

const methodColors: Record<string, string> = {
  LPR: 'bg-blue-100 text-blue-700',
  QR: 'bg-green-100 text-green-700',
  FACE: 'bg-violet-100 text-violet-700',
  MANUAL: 'bg-gray-100 text-gray-600',
};

export default function DetectionPanel({ events, connected, onSelect }: Props) {
  const detections = events.filter(e => e.type === 'detection');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-[#0D0D0D]">
          <Camera className="w-4 h-4" />
          Recent Detections
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${connected ? 'text-green-600' : 'text-red-500'}`}>
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? 'Live' : 'Reconnecting…'}
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
        {detections.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Waiting for vehicles…
          </div>
        )}

        {detections.map((e, i) => (
          <button
            key={`${e.sessionId}-${i}`}
            onClick={() => onSelect(e)}
            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center font-bold text-[#0D0D0D] shrink-0 overflow-hidden">
              {e.customer?.photoUrl ? (
                <img src={e.customer.photoUrl} className="w-full h-full object-cover" alt="" />
              ) : e.customer ? (
                e.customer.name.charAt(0)
              ) : (
                '?'
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-[#0D0D0D] truncate">
                {e.customer?.name ?? (e.detectedPlate ?? 'Unknown')}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {e.detectedPlate && <span>Plate: {e.detectedPlate} · </span>}
                {e.ts && new Date(e.ts).toLocaleTimeString()}
              </div>
            </div>

            {/* Method badge */}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${methodColors[e.method ?? 'MANUAL']}`}>
              {e.method}
            </span>

            {/* New indicator */}
            {i === 0 && (
              <span className="w-2 h-2 rounded-full bg-[#0066FF] shrink-0 animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
