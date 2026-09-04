import React from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatNumber, num } from '../utils/calculations';

export default function PanelsSection({ paneller = [], onChange }) {
  const handleItemChange = (index, field, value) => {
    const next = [...paneller];
    next[index] = {
      ...next[index],
      [field]: field === 'name' ? value : value === '' ? '' : Number(value) || 0,
    };
    onChange(next);
  };

  const handleAdd = () => {
    const id = 'p_' + Date.now();
    onChange([...paneller, { id, name: 'Yeni Panel', satis: 0, siparisSayisi: 0 }]);
  };

  const handleRemove = (index) => {
    const next = paneller.filter((_, i) => i !== index);
    onChange(next);
  };

  const totalSatis = (paneller || []).reduce((acc, p) => acc + num(p.satis), 0);
  const totalSiparis = (paneller || []).reduce((acc, p) => acc + num(p.siparisSayisi), 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Panel Bilgileri</h2>
            <p className="text-xs text-slate-500">Yemek platformları ciro ve sipariş adetleri</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Toplam Sipariş</span>
            <span className="text-sm font-bold text-slate-800">{formatNumber(totalSiparis)} Adet</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Toplam Panel Ciro</span>
            <span className="text-base font-bold text-purple-600">{formatCurrency(totalSatis)}</span>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center space-x-1 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Platform Ekle</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
        {paneller.map((panel, idx) => (
          <div
            key={panel.id || idx}
            className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-purple-200 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={panel.name}
                onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 outline-none px-0.5 py-0.5"
              />
              <button
                onClick={() => handleRemove(idx)}
                className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors"
                title="Kaldır"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Satış (TL)</label>
                <input
                  type="number"
                  step="any"
                  value={panel.satis ?? 0}
                  onChange={(e) => handleItemChange(idx, 'satis', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Sipariş Sayısı</label>
                <input
                  type="number"
                  step="1"
                  value={panel.siparisSayisi ?? 0}
                  onChange={(e) => handleItemChange(idx, 'siparisSayisi', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
