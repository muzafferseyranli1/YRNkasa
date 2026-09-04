import React from 'react';
import { Wallet, PlusCircle } from 'lucide-react';
import { formatCurrency, num } from '../utils/calculations';

export default function KasaDevirSection({ data, onChange }) {
  const devir = num(data?.devir);
  const kasayaParaKondu = num(data?.kasayaParaKondu);
  const toplamGiris = devir + kasayaParaKondu;

  const handleChange = (field, value) => {
    onChange({
      ...data,
      [field]: value === '' ? '' : Number(value) || 0,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Kasa Başlangıç & Girişler</h2>
            <p className="text-xs text-slate-500">Devir ve gün içi kasaya konan nakit</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-slate-400 block">Kasa Başlangıç Toplamı</span>
          <span className="text-lg font-bold text-emerald-600">{formatCurrency(toplamGiris)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Devir (Önceki Gün Kapanışı)</span>
            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Otomatik / Serbest</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={data?.devir ?? 0}
              onChange={(e) => handleChange('devir', e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
            <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 pointer-events-none font-medium">₺</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Kasaya Para Kondu (Nakit Girişi)</span>
            <span className="text-[10px] text-slate-400">Gün içi ilave</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={data?.kasayaParaKondu ?? 0}
              onChange={(e) => handleChange('kasayaParaKondu', e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
            <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 pointer-events-none font-medium">₺</span>
          </div>
        </div>
      </div>
    </div>
  );
}
