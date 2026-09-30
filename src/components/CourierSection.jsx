import React from 'react';
import { Bike, Plus, Trash2, Calculator } from 'lucide-react';
import { num, formatCurrency } from '../utils/calculations';

export default function CourierSection({ kuryeOdemeleri = [], onChange }) {
  const handleAddRow = () => {
    const newId = `k_${Date.now()}`;
    onChange([
      ...kuryeOdemeleri,
      { id: newId, kuryeAdi: '', siparisSayisi: '', birimFiyat: 20, toplamTutar: '', aciklama: '' },
    ]);
  };

  const handleRemoveRow = (id) => {
    onChange(kuryeOdemeleri.filter((item) => item.id !== id));
  };

  const handleChangeRow = (id, field, value) => {
    const updated = kuryeOdemeleri.map((item) => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        // Auto calculate totalAmount if count or unitPrice changes
        if (field === 'siparisSayisi' || field === 'birimFiyat') {
          const count = num(field === 'siparisSayisi' ? value : item.siparisSayisi);
          const unit = num(field === 'birimFiyat' ? value : (item.birimFiyat !== undefined ? item.birimFiyat : 20));
          newItem.toplamTutar = count * unit;
        }
        return newItem;
      }
      return item;
    });
    onChange(updated);
  };

  const totalSiparis = kuryeOdemeleri.reduce((acc, item) => acc + num(item.siparisSayisi), 0);
  const totalTutar = kuryeOdemeleri.reduce((acc, item) => {
    const count = num(item.siparisSayisi);
    const unit = item.birimFiyat !== undefined && item.birimFiyat !== '' ? num(item.birimFiyat) : 20;
    const total = item.toplamTutar !== undefined && item.toplamTutar !== '' ? num(item.toplamTutar) : (count * unit);
    return acc + total;
  }, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Kurye Paket / Adisyon Ödemeleri</h3>
            <p className="text-xs text-slate-500">Sipariş başı kurye hakedişleri (Kasadan Nakit Çıkar)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-500 block">{totalSiparis} Sipariş / Paket</span>
            <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {formatCurrency(totalTutar)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kurye Ekle</span>
          </button>
        </div>
      </div>

      {kuryeOdemeleri.length === 0 ? (
        <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Bike className="w-8 h-8 mx-auto mb-1 opacity-40" />
          <p className="text-xs">Bugün için kaydedilmiş kurye adisyon ödemesi bulunmuyor.</p>
          <button
            type="button"
            onClick={handleAddRow}
            className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            + İlk Kurye Ödemesini Ekle
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="py-2 px-2 font-medium">Kurye Adı</th>
                <th className="py-2 px-2 font-medium w-24 text-center">Sipariş Sayısı</th>
                <th className="py-2 px-2 font-medium w-24 text-center">Birim Ücret (₺)</th>
                <th className="py-2 px-2 font-medium w-28 text-right">Toplam Hakediş (₺)</th>
                <th className="py-2 px-2 font-medium">Açıklama / Not</th>
                <th className="py-2 px-1 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kuryeOdemeleri.map((item) => {
                const count = num(item.siparisSayisi);
                const unit = item.birimFiyat !== undefined && item.birimFiyat !== '' ? num(item.birimFiyat) : 20;
                const calcTotal = item.toplamTutar !== undefined && item.toplamTutar !== '' ? num(item.toplamTutar) : (count * unit);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.kuryeAdi || item.courierName || ''}
                        onChange={(e) => handleChangeRow(item.id, 'kuryeAdi', e.target.value)}
                        placeholder="Örn: Yılmaz"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none text-slate-800 font-medium"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        value={item.siparisSayisi ?? ''}
                        onChange={(e) => handleChangeRow(item.id, 'siparisSayisi', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none text-center font-bold text-slate-700"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.birimFiyat ?? 20}
                        onChange={(e) => handleChangeRow(item.id, 'birimFiyat', e.target.value)}
                        placeholder="20"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none text-center text-slate-600"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="font-bold text-amber-700 text-sm">
                        {formatCurrency(calcTotal)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.aciklama || item.notes || ''}
                        onChange={(e) => handleChangeRow(item.id, 'aciklama', e.target.value)}
                        placeholder="İsteğe bağlı not..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none text-slate-600"
                      />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
