'use client';
import { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';

const SETTING_KEYS = [
  { key: 'SHOP_NAME', label: 'Shop Name', type: 'text' },
  { key: 'TAX_RATE', label: 'Tax Rate (e.g. 0.0875)', type: 'text' },
  { key: 'POINTS_PER_DOLLAR', label: 'Points Per Dollar', type: 'text' },
  { key: 'TIER_SILVER_THRESHOLD', label: 'Silver Tier Threshold (pts)', type: 'text' },
  { key: 'TIER_GOLD_THRESHOLD', label: 'Gold Tier Threshold (pts)', type: 'text' },
  { key: 'TIER_PLATINUM_THRESHOLD', label: 'Platinum Tier Threshold (pts)', type: 'text' },
  { key: 'USUAL_ORDER_THRESHOLD', label: 'Usual Order Frequency (0.0–1.0)', type: 'text' },
  { key: 'LPR_CONFIDENCE_THRESHOLD', label: 'LPR Min Confidence (0.0–1.0)', type: 'text' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(r => { if (r.success) setSettings(r.data); });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">Settings</h1>
          <p className="text-sm text-gray-500">System configuration</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-[#0D0D0D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2D2D2D] disabled:opacity-40 transition-colors">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-[#0D0D0D] flex items-center gap-2">
          <Settings className="w-4 h-4" /> Business Settings
        </h2>
        <div className="grid grid-cols-2 gap-5">
          {SETTING_KEYS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
              <input
                value={settings[key] ?? ''}
                onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#0D0D0D] mb-4">Vision Service</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">VISION_SERVICE_URL</div>
            <div className="font-mono text-[#0D0D0D]">{process.env.NEXT_PUBLIC_VISION_URL ?? 'http://localhost:8010'}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">WEBHOOK_SECRET</div>
            <div className="font-mono text-[#0D0D0D]">{'•'.repeat(16)}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Vision service credentials are configured via environment variables in <code>.env.local</code></p>
      </div>
    </div>
  );
}
