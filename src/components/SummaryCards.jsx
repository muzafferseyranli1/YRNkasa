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
    bankaGirildi = false,
    bankaToplam = 0,
    bankaFarki = 0,
    kanalGirildi = false,
    kanalOnlineToplam = 0,
    onlineKontrolVar = false,
    kanalOnlineFarki = 0,
    kanalCiroFarki = 0,
    kanal = null,
  } = metrics;

  const salonCiro = kanal?.satirToplamlari?.restoran?.ciro || 0;
  const salonFis = kanal?.salonFisToplam || 0;
  const paketCiro = (kanal?.ciroToplam || 0) - salonCiro;
  const paketFis = kanal?.paketToplam || 0;
  const kirilim = [
    { ad: 'Toplam', satis: salonCiro + paketCiro, fis: salonFis + paketFis, bold: true },
    { ad: 'Salon', satis: salonCiro, fis: salonFis },
    { ad: 'Paket', satis: paketCiro, fis: paketFis },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Ana Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Toplam Ciro + Salon / Paket kırılımı (2 kart genişliğinde) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Toplam Satış (Ciro)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-end gap-x-6 gap-y-2">
            <div className="shrink-0">
              <span className="text-xl font-black text-slate-900">{formatCurrency(toplamSatis)}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">DengePOS + Suitable POS</p>
            </div>
            <table className="flex-1 text-xs">
              <thead>
                <tr className="text-[10px] font-semibold text-slate-400">
                  <th className="text-left font-semibold" />
                  <th className="text-right font-semibold px-2">Satış</th>
                  <th className="text-right font-semibold px-2">Fiş Sayısı</th>
                  <th className="text-right font-semibold pl-2">Ortalama</th>
                </tr>
              </thead>
              <tbody>
                {kirilim.map((r) => (
                  <tr key={r.ad} className="border-t border-slate-100">
                    <td className={`py-0.5 ${r.bold ? 'font-extrabold text-slate-900' : 'font-bold text-slate-700'}`}>{r.ad}</td>
                    <td className="py-0.5 px-2 text-right font-bold text-slate-800 whitespace-nowrap">{formatCurrency(r.satis)}</td>
                    <td className="py-0.5 px-2 text-right font-bold text-slate-800">{formatNumber(r.fis)}</td>
                    <td className="py-0.5 pl-2 text-right font-bold text-slate-800 whitespace-nowrap">
                      {formatCurrency(r.fis > 0 ? r.satis / r.fis : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              {bankaGirildi && (
                <div className={`flex justify-between py-1 px-2 rounded-lg font-bold mt-1 ${Math.abs(bankaFarki) <= 0.05 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  <span>Banka Gün Sonu ({formatCurrency(bankaToplam)}) − Z:</span>
                  <span>{Math.abs(bankaFarki) <= 0.05 ? '✓ Tam' : formatCurrency(bankaFarki)}</span>
                </div>
              )}
              {onlineKontrolVar && (
                <div className={`flex justify-between py-1 px-2 rounded-lg font-bold mt-1 ${Math.abs(kanalOnlineFarki) <= 0.05 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                  <span>Online Alacak ({formatCurrency(kanalOnlineToplam)}) − Suitable Online KK:</span>
                  <span>{Math.abs(kanalOnlineFarki) <= 0.05 ? '✓ Tam' : formatCurrency(kanalOnlineFarki)}</span>
                </div>
              )}
              {kanalGirildi && (
                <div className={`flex justify-between py-1 px-2 rounded-lg font-bold mt-1 ${Math.abs(kanalCiroFarki) <= 0.05 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                  <span>Kanal Ciro ({formatCurrency(kanal?.ciroToplam || 0)}) − POS:</span>
                  <span>{Math.abs(kanalCiroFarki) <= 0.05 ? '✓ Tam' : formatCurrency(kanalCiroFarki)}</span>
                </div>
              )}
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
