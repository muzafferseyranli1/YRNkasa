import React from 'react';
import { Coins, Plus, Trash2, Percent } from 'lucide-react';
import { num, formatCurrency } from '../utils/calculations';

import NumberInput from './NumberInput';
import NameInput from './NameInput';
export default function TipSection({ tipOdemeleri = [], onChange }) {
  const handleAddRow = () => {
    const newId = `t_${Date.now()}`;
    onChange([
      ...tipOdemeleri,
      {
        id: newId,
        personelAdi: '',
        cekilenTip: '',
        kesintiOrani: 20,
        kesintiTutari: '',
        netNakitTip: '',
        aciklama: '',
      },
    ]);
  };

  const handleRemoveRow = (id) => {
    onChange(tipOdemeleri.filter((item) => item.id !== id));
  };

  const handleChangeRow = (id, field, value) => {
    const updated = tipOdemeleri.map((item) => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        // Auto calculate deduction and netCash if cekilenTip or kesintiOrani changes
        if (field === 'cekilenTip' || field === 'kesintiOrani') {
          const cardTip = num(field === 'cekilenTip' ? value : item.cekilenTip);
          const rate = num(field === 'kesintiOrani' ? value : (item.kesintiOrani !== undefined ? item.kesintiOrani : 20));
          const deduction = cardTip * (rate / 100);
          newItem.kesintiTutari = deduction;
          newItem.netNakitTip = cardTip - deduction;
        }
        return newItem;
      }
      return item;
    });
    onChange(updated);
  };

  const totalCardTip = tipOdemeleri.reduce((acc, item) => acc + num(item.cekilenTip), 0);
  const totalNetCash = tipOdemeleri.reduce((acc, item) => {
    if (item.netNakitTip !== undefined && item.netNakitTip !== '') return acc + num(item.netNakitTip);
    const cardTip = num(item.cekilenTip);
    const rate = item.kesintiOrani !== undefined && item.kesintiOrani !== '' ? num(item.kesintiOrani) : 20;
    return acc + (cardTip - (cardTip * (rate / 100)));
  }, 0);
  const totalDeduction = totalCardTip - totalNetCash;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Kredi Kartı Bahşiş (Tip) & Nakit Ödeme</h3>
            <p className="text-xs text-slate-500">Müşteriden kartla çekilen tip tutarı ve personele %20 kesintili nakit ödemesi</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-500 block">
              Kart: {formatCurrency(totalCardTip)} | Kesinti: {formatCurrency(totalDeduction)}
            </span>
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Net Nakit: {formatCurrency(totalNetCash)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Bahşiş Ekle</span>
          </button>
        </div>
      </div>

      {tipOdemeleri.length === 0 ? (
        <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Coins className="w-8 h-8 mx-auto mb-1 opacity-40" />
          <p className="text-xs">Bugün için kaydedilmiş kart bahşiş / nakit tip ödemesi bulunmuyor.</p>
          <button
            type="button"
            onClick={handleAddRow}
            className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            + İlk Bahşiş Kaydını Ekle
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="py-2 px-2 font-medium">Personel Adı</th>
                <th className="py-2 px-2 font-medium w-28 text-right">Karttan Çekilen (₺)</th>
                <th className="py-2 px-2 font-medium w-20 text-center">Kesinti (%)</th>
                <th className="py-2 px-2 font-medium w-24 text-right">Kesinti (₺)</th>
                <th className="py-2 px-2 font-medium w-28 text-right">Ödenen Nakit (₺)</th>
                <th className="py-2 px-2 font-medium">Açıklama / Masa No</th>
                <th className="py-2 px-1 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tipOdemeleri.map((item) => {
                const cardTip = num(item.cekilenTip);
                const rate = item.kesintiOrani !== undefined && item.kesintiOrani !== '' ? num(item.kesintiOrani) : 20;
                const calcDeduction = item.kesintiTutari !== undefined && item.kesintiTutari !== '' ? num(item.kesintiTutari) : (cardTip * (rate / 100));
                const calcNetCash = item.netNakitTip !== undefined && item.netNakitTip !== '' ? num(item.netNakitTip) : (cardTip - calcDeduction);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2 px-2">
                      <NameInput
                        kind="staff"
                        extraNames={tipOdemeleri.map((t) => t.personelAdi || t.staffName)}
                        value={item.personelAdi || item.staffName || ''}
                        onChange={(e) => handleChangeRow(item.id, 'personelAdi', e.target.value)}
                        placeholder="Örn: Garson Ali"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 font-medium"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <NumberInput
                        type="number"
                        min="0"
                        step="1"
                        value={item.cekilenTip ?? ''}
                        onChange={(e) => handleChangeRow(item.id, 'cekilenTip', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-right font-bold text-slate-700"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center">
                        <NumberInput
                          type="number"
                          min="0"
                          max="100"
                          wrapperClassName="w-12"
                          value={item.kesintiOrani ?? 20}
                          onChange={(e) => handleChangeRow(item.id, 'kesintiOrani', e.target.value)}
                          placeholder="20"
                          className="w-12 px-1 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-center text-slate-600"
                        />
                        <span className="ml-1 text-slate-400">%</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-slate-500 text-xs">
                        -{formatCurrency(calcDeduction)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="font-bold text-emerald-700 text-sm">
                        {formatCurrency(calcNetCash)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.aciklama || item.notes || ''}
                        onChange={(e) => handleChangeRow(item.id, 'aciklama', e.target.value)}
                        placeholder="Masa 4 vb..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-600"
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
