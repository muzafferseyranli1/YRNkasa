import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import NumberInput from './NumberInput';

/**
 * Yemek kartı firmalarının gün sonu (kapanış) toplamları; sistemdeki satışlarla karşılaştırılır.
 * (Banka gün sonu artık Z Bilgileri'nde her POS cihazının içinde girilir.)
 */
export default function BankaGunSonuSection({ zBilgileri = {}, metrics, onChangeZ }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Yemek Kartı Gün Sonu</h2>
          <p className="text-xs text-slate-500">Yemek kartı firmalarının gün sonu toplamları sistemdeki satışlarla karşılaştırılır</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['sodexho', 'Sodexho'],
          ['multinet', 'Multinet'],
          ['ticket', 'Ticket'],
          ['setcard', 'Setcard'],
        ].map(([key, label]) => {
          const info = metrics?.yemekKartlari?.[key];
          const fark = info?.fark || 0;
          const ok = Math.abs(fark) <= 0.05;
          const gosterFark = info && (info.hesaplanan !== 0 || info.fiziki !== 0);
          return (
            <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <label className="block text-xs font-medium text-slate-600 mb-1">{label} Gün Sonu Tutarı</label>
              <NumberInput
                type="number"
                value={zBilgileri?.[key] ?? 0}
                onChange={(e) => onChangeZ({ ...zBilgileri, [key]: e.target.value === '' ? '' : Number(e.target.value) || 0 })}
                className={`w-full bg-white border rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none ${gosterFark && ok ? 'border-emerald-400 focus:border-emerald-500' : 'border-slate-200 focus:border-emerald-500'}`}
              />
              {gosterFark && (
                <div className={`mt-1 text-[10px] leading-tight ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ok ? `✓ Sistemle tutuyor (${formatCurrency(info.hesaplanan)})` : `Sistem: ${formatCurrency(info.hesaplanan)} · fark ${formatCurrency(fark)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
