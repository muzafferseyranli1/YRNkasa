import React from 'react';
import { formatCurrency, formatNumber, num } from '../utils/calculations';

export default function ThermalReceipt({ date, data, metrics }) {
  if (!data || !metrics) return null;

  const {
    kasaGiris = {},
    dengePos = {},
    suitablePos = {},
    paneller = [],
    zBilgileri = {},
    harcamalar = [],
  } = data;

  const formatDateDisplay = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        weekday: 'long',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="thermal-receipt-container text-black bg-white select-none">
      {/* 1. BAŞLIK */}
      <div className="text-center pb-2 border-b-2 border-black">
        <h1 className="text-xl font-black tracking-wide uppercase leading-tight">YRN RESTORAN</h1>
        <h2 className="text-sm font-black uppercase mt-0.5 tracking-wide">GÜN SONU KASA RAPORU</h2>
        <div className="text-xs font-bold mt-0.5 text-black">
          <span>TARİH: {formatDateDisplay(date)}</span>
        </div>
        <div className="text-[11px] font-semibold text-black">
          <span>Baskı: {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* 2. KASA NAKİT VE DEVİR DURUMU */}
      <div className="py-1.5 border-b-2 border-black">
        <div className="font-black text-xs uppercase text-center pb-0.5 mb-1 border-b border-black">
          --- KASA NAKİT AKIŞI ---
        </div>
        
        <div className="space-y-0.5 text-xs font-bold">
          <div className="flex justify-between">
            <span>Önceki Günden Devir:</span>
            <span className="font-black text-sm">{formatCurrency(kasaGiris.devir)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasaya Konan Nakit:</span>
            <span>{formatCurrency(kasaGiris.kasayaParaKondu)}</span>
          </div>
          <div className="flex justify-between">
            <span>DengePOS Nakit Satış:</span>
            <span>{formatCurrency(dengePos.nakit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Suitable POS Nakit Satış:</span>
            <span>{formatCurrency(suitablePos.nakit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Toplam Gider (Çıkış):</span>
            <span>-{formatCurrency(metrics.toplamHarcamalar)}</span>
          </div>
        </div>

        <div className="border-t border-black my-1"></div>

        <div className="space-y-0.5">
          <div className="flex justify-between text-xs font-black">
            <span>HESAPLANAN KASA:</span>
            <span className="text-sm font-black">{formatCurrency(metrics.hesaplananNakit)}</span>
          </div>
          <div className="flex justify-between text-xs font-black">
            <span>FİZİKİ KASA SAYIMI:</span>
            <span className="text-sm font-black">{formatCurrency(metrics.fizikiSayim)}</span>
          </div>
          <div className="flex justify-between text-xs font-black pt-0.5 border-t border-black">
            <span>KASA FARKI:</span>
            <span className="text-sm font-black">
              {metrics.kasaFarki === 0
                ? '0,00 ₺ (TAM)'
                : metrics.kasaFarki < 0
                ? `${formatCurrency(Math.abs(metrics.kasaFarki))} (EKSİK)`
                : `${formatCurrency(metrics.kasaFarki)} (FAZLA)`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SATIŞ VE CİRO ÖZETİ */}
      <div className="py-1.5 border-b-2 border-black">
        <div className="font-black text-xs uppercase text-center pb-0.5 mb-1 border-b border-black">
          --- SATIŞ VE CİRO ÖZETİ ---
        </div>
        <div className="space-y-0.5 text-xs font-bold">
          <div className="flex justify-between">
            <span>DengePOS Satış:</span>
            <span>{formatCurrency(metrics.dengePosToplam)}</span>
          </div>
          <div className="flex justify-between">
            <span>Suitable POS Satış:</span>
            <span>{formatCurrency(metrics.suitablePosToplam)}</span>
          </div>
        </div>
        <div className="border-t-2 border-black my-1"></div>
        <div className="flex justify-between text-sm font-black">
          <span>TOPLAM SATIŞ (CİRO):</span>
          <span className="text-base font-black">{formatCurrency(metrics.toplamSatis)}</span>
        </div>
      </div>

      {/* 4. Z RAPORU & FİŞ MUTABAKATI */}
      <div className="py-1.5 border-b-2 border-black">
        <div className="font-black text-xs uppercase text-center pb-0.5 mb-1 border-b border-black">
          --- MALİ FİŞ & Z MUTABAKAT ---
        </div>
        <div className="space-y-0.5 text-xs font-bold">
          <div className="flex justify-between">
            <span>Gereken Nakit Fişi:</span>
            <span>{formatCurrency(metrics.kesilmesiGerekenNakitFisi)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kesilen Z Nakit Fişi:</span>
            <span className="font-black">{formatCurrency(metrics.kesilenNakitFisi)}</span>
          </div>
          <div className="flex justify-between font-black">
            <span>Nakit Fiş Farkı:</span>
            <span>{formatCurrency(metrics.nakitFisFarki)}</span>
          </div>

          <div className="border-t border-black my-1"></div>

          <div className="flex justify-between">
            <span>Hesaplanan Kredi Kartı:</span>
            <span>{formatCurrency(metrics.hesaplananKrediKarti)}</span>
          </div>
          <div className="flex justify-between">
            <span>Fiziki POS Kredi Kartı Z:</span>
            <span className="font-black">{formatCurrency(metrics.fizikiKrediKarti)}</span>
          </div>
          <div className="flex justify-between font-black">
            <span>Kredi Kartı Farkı:</span>
            <span>{formatCurrency(metrics.krediKartiFarki)}</span>
          </div>
        </div>
      </div>

      {/* 5. YEMEK KARTLARI */}
      <div className="py-1.5 border-b-2 border-black">
        <div className="font-black text-xs uppercase text-center pb-0.5 mb-1 border-b border-black">
          --- YEMEK KARTLARI (FİZİKİ / SİSTEM) ---
        </div>
        <div className="space-y-0.5 text-xs font-bold">
          {Object.entries(metrics.yemekKartlari || {}).map(([key, item]) => {
            const name = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} className="flex justify-between">
                <span>{name}:</span>
                <span className="font-black">
                  {formatCurrency(item.fiziki)} / {formatCurrency(item.hesaplanan)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. HARCAMA DETAYLARI */}
      {harcamalar && harcamalar.length > 0 && (
        <div className="py-1.5 border-b-2 border-black">
          <div className="font-black text-xs uppercase text-center pb-0.5 mb-1 border-b border-black">
            --- KASA GİDER DETAYLARI ---
          </div>
          <div className="space-y-0.5 text-xs font-bold">
            {harcamalar.map((h, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate max-w-[190px]">
                  {h.title} {h.aciklama ? `(${h.aciklama})` : ''}:
                </span>
                <span className="font-black">{formatCurrency(h.tutar)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-black my-1"></div>
          <div className="flex justify-between text-xs font-black">
            <span>TOPLAM GİDER:</span>
            <span className="text-sm font-black">{formatCurrency(metrics.toplamHarcamalar)}</span>
          </div>
        </div>
      )}

      {/* 7. İMZA ALANI */}
      <div className="pt-2.5 pb-1 text-center text-xs font-bold">
        <div className="flex justify-between mt-1">
          <div className="w-1/2 text-center">
            <p className="font-black text-xs">Teslim Eden</p>
            <p className="text-[10px] text-black">(Kasiyer)</p>
            <div className="h-7 border-b-2 border-black mx-3 mt-1"></div>
          </div>
          <div className="w-1/2 text-center">
            <p className="font-black text-xs">Teslim Alan</p>
            <p className="text-[10px] text-black">(Yetkili / Yönetici)</p>
            <div className="h-7 border-b-2 border-black mx-3 mt-1"></div>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest">*** GÜN SONU KASA RAPORU ***</p>
      </div>
    </div>
  );
}
