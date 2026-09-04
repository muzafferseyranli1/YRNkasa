import React from 'react';
import { DollarSign, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { formatCurrency, num } from '../utils/calculations';

export default function FizikiKasaSection({ fizikiKasa, hesaplananNakit, onChange }) {
  const sayim = num(fizikiKasa);
  const hesaplanan = num(hesaplananNakit);
  const fark = sayim - hesaplanan;

  const handleChange = (value) => {
    onChange(value === '' ? '' : Number(value) || 0);
  };

  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let statusText = 'Kasa tam, fark yoktur.';
  let icon = <CheckCircle className="w-5 h-5 text-emerald-600" />;

  if (fark < 0) {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    statusText = `Kasada ${formatCurrency(Math.abs(fark))} NAKİT EKSİKTİR (Kasa Açığı)`;
    icon = <AlertTriangle className="w-5 h-5 text-rose-600" />;
  } else if (fark > 0) {
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
    statusText = `Kasada ${formatCurrency(fark)} NAKİT FAZLADIR (Kasa Fazlası)`;
    icon = <CheckCircle className="w-5 h-5 text-blue-600" />;
  }

  return (
    <div className="bg-white rounded-2xl p-5 border-2 border-blue-200 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gün Sonu Fiziki Kasa Sayımı</h2>
            <p className="text-xs text-slate-500 flex items-center">
              <span>Kasada fiziki olarak sayılan gerçek nakit mevcudu</span>
              <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[11px]">
                <ArrowRight className="w-3 h-3 mr-1" /> 1 Gün Sonraya Devir Eder
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 block">Hesaplanan Kasa Nakdi</span>
            <span className="text-base font-bold text-slate-700">{formatCurrency(hesaplanan)}</span>
          </div>

          <div className="w-48">
            <div className="relative">
              <input
                type="number"
                step="any"
                value={fizikiKasa ?? 0}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-blue-50 border-2 border-blue-400 rounded-xl px-4 py-2 text-slate-900 font-black text-lg focus:bg-white focus:border-blue-600 outline-none transition-all text-right pr-8"
              />
              <span className="absolute right-3 top-2.5 text-base text-slate-500 font-bold pointer-events-none">₺</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between ${badgeColor}`}>
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-bold">{statusText}</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium opacity-80">Mutabakat Farkı: </span>
          <span className="text-sm font-black">{formatCurrency(fark)}</span>
        </div>
      </div>
    </div>
  );
}
