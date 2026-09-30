import React from 'react';
import {
  TrendingUp,
  Banknote,
  Receipt,
  CreditCard,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/calculations';

export default function SummaryCards({ metrics }) {
  if (!metrics) return null;

  const {
    toplamSatis = 0,
    hesaplananNakit = 0,
    fizikiSayim = 0,
    kasaFarki = 0,
    kesilmesiGerekenNakitFisi = 0,
    kesilenNakitFisi = 0,
    nakitFisFarki = 0,
    hesaplananKrediKarti = 0,
    fizikiKrediKarti = 0,
    krediKartiFarki = 0,
    yemekKartlari = {},
  } = metrics;

  return (
    <div className="space-y-4">
      {/* 4 Ana Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Toplam Ciro */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Toplam Satış (Ciro)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-slate-900">{formatCurrency(toplamSatis)}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">DengePOS + Suitable POS</p>
          </div>
        </div>

        {/* 2. Kasa Nakit Durumu */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Hesaplanan Kasa</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-emerald-700">{formatCurrency(hesaplananNakit)}</span>
            <p className={`text-[11px] font-semibold mt-0.5 ${kasaFarki === 0 ? 'text-emerald-600' : kasaFarki < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
              {kasaFarki === 0
                ? '✓ Kasa tam'
                : kasaFarki < 0
                ? `${formatCurrency(Math.abs(kasaFarki))} Açık`
                : `${formatCurrency(kasaFarki)} Fazla`}
            </p>
          </div>
        </div>

        {/* 3. Nakit Fişi Durumu */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Kesilen Nakit Fişi</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-amber-900">{formatCurrency(kesilenNakitFisi)}</span>
            <p className={`text-[11px] font-semibold mt-0.5 ${nakitFisFarki === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {nakitFisFarki === 0
                ? '✓ Fişler tam'
                : `${formatCurrency(Math.abs(nakitFisFarki))} ${nakitFisFarki < 0 ? 'Eksik Fiş' : 'Fazla Fiş'}`}
            </p>
          </div>
        </div>

        {/* 4. POS Kredi Kartı Durumu */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Fiziki POS Kredi Kartı</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-indigo-900">{formatCurrency(fizikiKrediKarti)}</span>
            <p className={`text-[11px] font-semibold mt-0.5 ${krediKartiFarki === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {krediKartiFarki === 0
                ? '✓ POS Z tam'
                : `${formatCurrency(Math.abs(krediKartiFarki))} ${krediKartiFarki < 0 ? 'Eksik Çekim' : 'Fazla Çekim'}`}
            </p>
          </div>
        </div>
      </div>

      {/* 2 Detaylı Mutabakat Paneli */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Fiş & Kredi Kartı Mutabakatı */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
            <Receipt className="w-4 h-4 text-slate-600" />
            <span>Mali Fiş & POS Z Mutabakatı</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Kesilmesi Gereken Nakit Fişi:</span>
              <span className="font-bold text-slate-800">{formatCurrency(kesilmesiGerekenNakitFisi)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Kesilen Z Nakit Fişi Toplamı:</span>
              <span className="font-bold text-slate-800">{formatCurrency(kesilenNakitFisi)}</span>
            </div>
            <div className={`flex justify-between py-1 px-2 rounded-lg font-bold ${nakitFisFarki === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <span>Nakit Fiş Farkı:</span>
              <span>{formatCurrency(nakitFisFarki)} {nakitFisFarki < 0 ? '(Eksik Kesim)' : ''}</span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Hesaplanan Kredi Kartı:</span>
                <span className="font-bold text-slate-800">{formatCurrency(hesaplananKrediKarti)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Fiziki POS Kredi Kartı Z:</span>
                <span className="font-bold text-slate-800">{formatCurrency(fizikiKrediKarti)}</span>
              </div>
              <div className={`flex justify-between py-1 px-2 rounded-lg font-bold mt-1 ${krediKartiFarki === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <span>Kredi Kartı Farkı:</span>
                <span>{formatCurrency(krediKartiFarki)} {krediKartiFarki < 0 ? '(Eksik Z)' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Yemek Kartları Mutabakatı */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
            <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
            <span>Yemek Kartları Mutabakatı</span>
          </h3>
          <div className="space-y-1.5 text-xs">
            {Object.entries(yemekKartlari).map(([key, item]) => {
              const name = key.charAt(0).toUpperCase() + key.slice(1);
              const isOk = item.fark === 0;
              return (
                <div key={key} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">{name}</span>
                    <span className="text-[10px] text-slate-400">
                      Sistem: {formatCurrency(item.hesaplanan)} | Fiziki Z: {formatCurrency(item.fiziki)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {isOk ? '✓ Tam' : `${formatCurrency(item.fark)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
