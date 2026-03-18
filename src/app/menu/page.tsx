'use client';
import { useEffect, useState } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, Coffee } from 'lucide-react';

interface MenuItem {
  id: string; name: string; category: string; price: number;
  description?: string; available: boolean; tags?: string;
}

const categories = ['ALL', 'COFFEE', 'TEA', 'FOOD', 'COLD_DRINK', 'SPECIALTY'];
const catColors: Record<string, string> = {
  COFFEE: 'bg-amber-100 text-amber-800', TEA: 'bg-green-100 text-green-800',
  FOOD: 'bg-orange-100 text-orange-800', COLD_DRINK: 'bg-blue-100 text-blue-800',
  SPECIALTY: 'bg-purple-100 text-purple-800',
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cat, setCat] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const q = cat !== 'ALL' ? `?category=${cat}` : '';
    fetch(`/api/menu${q}`, { credentials: 'include' })
      .then(r => r.json())
      .then(r => { if (r.success) setItems(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [cat]);

  const toggleAvailable = async (id: string, current: boolean) => {
    await fetch(`/api/menu/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ available: !current }),
    });
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">Menu</h1>
          <p className="text-sm text-gray-500">{items.filter(i => i.available).length} items available</p>
        </div>
        <button className="flex items-center gap-2 bg-[#0D0D0D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2D2D2D] transition-colors">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              cat === c ? 'bg-[#0D0D0D] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {c === 'ALL' ? 'All Items' : c.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border p-5 transition-all ${item.available ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-[#0D0D0D]">{item.name}</div>
                  {item.description && <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${catColors[item.category]}`}>
                  {item.category.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="font-bold text-lg text-[#0D0D0D]">${item.price.toFixed(2)}</span>
                <div className="flex items-center gap-2">
                  <button className="text-gray-400 hover:text-[#0066FF] transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleAvailable(item.id, item.available)} className="text-gray-400 hover:text-[#0066FF] transition-colors">
                    {item.available ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
