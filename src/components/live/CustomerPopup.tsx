'use client';
import { useState, useEffect } from 'react';
import { X, Star, AlertTriangle, MessageSquare, Coffee, ChevronRight, Check } from 'lucide-react';
import type { DetectionEvent } from '@/hooks/useDetectionStream';

interface Suggestion {
  name: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  menuItemId?: string;
}

interface SuggestionData {
  suggestions: Suggestion[];
  usualOrder: { items: string[]; frequency: string } | null;
  greeting: string;
}

interface Props {
  event: DetectionEvent;
  onDismiss: () => void;
  onConfirmOrder: (items: string[], sessionId?: string) => void;
}

const tierColors: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-800',
  SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-purple-100 text-purple-800',
};

export default function CustomerPopup({ event, onDismiss, onConfirmOrder }: Props) {
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { customer, detectedPlate, method, confidence, sessionId } = event;

  useEffect(() => {
    if (!customer?.id) return;
    setLoading(true);
    fetch(`/api/customers/${customer.id}/suggestions`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(r => { if (r.success) setSuggestions(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customer?.id]);

  const handleConfirm = (items: string[]) => {
    setConfirmed(true);
    onConfirmOrder(items, sessionId);
    setTimeout(onDismiss, 1500);
  };

  return (
    <div className="animate-slide-in fixed right-6 top-6 z-50 w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#0D0D0D] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-sm font-medium">
            {method === 'LPR' && `Plate: ${detectedPlate}`}
            {method === 'QR' && 'QR Code Scanned'}
            {method === 'FACE' && 'Face Recognized'}
            {method === 'MANUAL' && 'Manual Entry'}
          </span>
          <span className="text-white/40 text-xs">
            {confidence ? `${Math.round(confidence * 100)}%` : ''}
          </span>
        </div>
        <button onClick={onDismiss} className="text-white/40 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {customer ? (
          <>
            {/* Customer info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-[#F5F0EB] flex items-center justify-center text-2xl font-bold text-[#0D0D0D] shrink-0 overflow-hidden">
                {customer.photoUrl ? (
                  <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover" />
                ) : (
                  customer.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-[#0D0D0D] truncate">{customer.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColors[customer.tier] ?? ''}`}>
                    {customer.tier}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    {customer.rewardPoints.toLocaleString()} pts
                  </span>
                  <span className="text-xs text-gray-400">{customer.visitCount} visits</span>
                </div>
              </div>
            </div>

            {/* Allergies/preferences */}
            {(customer.allergies?.length || customer.preferences?.length) && (
              <div className="flex gap-2 flex-wrap">
                {customer.allergies?.map(a => (
                  <span key={a} className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> {a}
                  </span>
                ))}
                {customer.preferences?.map(p => (
                  <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{p}</span>
                ))}
              </div>
            )}

            {/* Notes */}
            {customer.notes && (
              <div className="flex gap-2 items-start bg-amber-50 rounded-lg p-3">
                <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{customer.notes}</p>
              </div>
            )}

            {/* AI Suggestions */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Coffee className="w-3 h-3" /> Suggested Orders
              </div>

              {loading && (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              )}

              {suggestions && (
                <div className="space-y-2">
                  {suggestions.usualOrder && (
                    <button
                      onClick={() => handleConfirm(suggestions.usualOrder!.items)}
                      className="w-full flex items-center justify-between bg-[#0066FF] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#0055DD] transition-colors"
                    >
                      <div className="text-left">
                        <div className="font-bold">Usual Order</div>
                        <div className="text-xs opacity-80">{suggestions.usualOrder.items.join(', ')}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs opacity-70">{suggestions.usualOrder.frequency}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  )}

                  {suggestions.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleConfirm([s.name])}
                      className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 px-4 py-3 rounded-xl text-sm transition-colors text-left border border-gray-200"
                    >
                      <div>
                        <div className="font-medium text-[#0D0D0D]">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.reason}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        s.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        s.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {s.confidence}
                      </span>
                    </button>
                  ))}

                  {suggestions.greeting && (
                    <p className="text-xs text-center text-gray-400 pt-1">{suggestions.greeting}</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🚗</div>
            <div className="font-semibold text-[#0D0D0D]">
              {detectedPlate ? `Plate: ${detectedPlate}` : 'Unknown Vehicle'}
            </div>
            <p className="text-sm text-gray-500 mt-1">Customer not in system</p>
            <a
              href="/customers"
              className="mt-3 inline-block text-sm text-[#0066FF] hover:underline"
            >
              Register new customer →
            </a>
          </div>
        )}

        {confirmed && (
          <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 rounded-xl py-3">
            <Check className="w-5 h-5" />
            <span className="font-medium text-sm">Order confirmed!</span>
          </div>
        )}
      </div>
    </div>
  );
}
