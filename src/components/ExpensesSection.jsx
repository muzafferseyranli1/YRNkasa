import React from 'react';
import { ArrowDownCircle, Plus, Trash2, CreditCard } from 'lucide-react';
import { formatCurrency, num } from '../utils/calculations';

export default function ExpensesSection({ harcamalar = [], onChange }) {
  const handleItemChange = (index, field, value) => {
    const next = [...harcamalar];
    next[index] = {
      ...next[index],
      [field]: field === 'tutar' ? (value === '' ? '' : Number(value) || 0) : value,
    };
    onChange(next);
  };

  const handleAdd = () => {
    const id = 'h_' + Date.now();
    onChange([...harcamalar, { id, title: 'Yeni Gider', tutar: 0, aciklama: '', isKK: false }]);
  };

  const handleRemove = (index) => {
    const next = harcamalar.filter((_, i) => i !== index);
    onChange(next);
  };

  const nakitGider = (harcamalar || [])
    .filter((h) => !h.isKK)
    .reduce((acc, h) => acc + num(h.tutar), 0);

  const kkGider = (harcamalar || [])
    .filter((h) => !!h.isKK)
    .reduce((acc, h) => acc + num(h.tutar), 0);

  const totalHarcama = nakitGider + kkGider;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
            <ArrowDownCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Harcamalar & Giderler</h2>
            <p className="text-xs text-slate-500">Kasadan yapılan ödemeler ve kredi kartı (KK) giderleri</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Kasa Nakit Çıkışı</span>
            <span className="text-base font-bold text-rose-600">{formatCurrency(nakitGider)}</span>
          </div>

          {kkGider > 0 && (
            <div className="text-right">
              <span className="text-[11px] font-medium text-indigo-400 block">KK Gideri (Harici)</span>
              <span className="text-sm font-bold text-indigo-600">{formatCurrency(kkGider)}</span>
            </div>
          )}

          <button
            onClick={handleAdd}
            className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Gider Ekle</span>
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {harcamalar.map((item, idx) => {
          const isKK = !!item.isKK;
          return (
            <div
              key={item.id || idx}
              className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                isKK
                  ? 'bg-indigo-50/60 border-indigo-200'
                  : 'bg-slate-50 border-slate-200/70 hover:border-rose-200'
              }`}
            >
              {/* KK Checkbox */}
              <div className="flex items-center justify-between sm:justify-start space-x-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isKK}
                    onChange={(e) => handleItemChange(idx, 'isKK', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span
                    className={`text-xs font-black tracking-wide ${
                      isKK ? 'text-indigo-700' : 'text-slate-600'
                    }`}
                  >
                    KK
                  </span>
                </label>
                {isKK && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded ml-1">
                    Kasayı Etkilemez
                  </span>
                )}
              </div>

              {/* Gider Başlığı */}
              <div className="sm:w-1/4">
                <label className="block sm:hidden text-[10px] text-slate-400 font-medium">Gider Kalemi</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                  placeholder="Örn: Yakıt Alımı"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-rose-500 outline-none"
                />
              </div>

              {/* Tutar */}
              <div className="sm:w-1/4">
                <label className="block sm:hidden text-[10px] text-slate-400 font-medium">Tutar (TL)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={item.tutar ?? 0}
                    onChange={(e) => handleItemChange(idx, 'tutar', e.target.value)}
                    placeholder="0.00"
                    className={`w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none ${
                      isKK ? 'text-indigo-700 focus:border-indigo-500' : 'text-rose-700 focus:border-rose-500'
                    }`}
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 pointer-events-none font-medium">₺</span>
                </div>
              </div>

              {/* Açıklama */}
              <div className="flex-1">
                <label className="block sm:hidden text-[10px] text-slate-400 font-medium">Açıklama / Detay</label>
                <input
                  type="text"
                  value={item.aciklama || ''}
                  onChange={(e) => handleItemChange(idx, 'aciklama', e.target.value)}
                  placeholder={isKK ? "KK ile ödendi (Kasayı etkilemez)" : "Örn: 34 fe 3454 plakalı araç yakıtı"}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:border-rose-500 outline-none"
                />
              </div>

              {/* Kaldır Butonu */}
              <button
                onClick={() => handleRemove(idx)}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white self-center transition-colors"
                title="Gideri Kaldır"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
