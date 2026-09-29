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
        weekday: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="thermal-receipt-container text-black bg-white select-none">
      {/* 1. BAŞLIK */}
      <div className="text-center pb-2 border-b-2 border-black">
        <h1 className="text-2xl font-black tracking-wide uppercase leading-tight">YRN RESTORAN</h1>
        <h2 className="text-base font-black uppercase mt-0.5 tracking-wide">GÜN SONU KASA RAPORU</h2>
        <div className="flex justify-center items-center space-x-3 text-sm font-bold mt-1 text-black">
          <span>{formatDateDisplay(date)}</span>
          <span>•</span>
          <span>{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* 2. KASA NAKİT VE DEVİR DURUMU */}
      <div className="py-2 border-b-2 border-black">
        <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
          --- KASA NAKİT AKIŞI ---
        </div>
        
        <div className="space-y-1 text-sm font-bold">
          <div className="flex justify-between">
            <span>Önceki Günden Devir:</span>
            <span className="font-black text-base">{formatCurrency(kasaGiris.devir)}</span>
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

        <div className="border-t-2 border-black my-1.5"></div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm font-black">
            <span>HESAPLANAN KASA:</span>
            <span className="text-base font-black">{formatCurrency(metrics.hesaplananNakit)}</span>
          </div>
          <div className="flex justify-between text-sm font-black">
            <span>FİZİKİ KASA SAYIMI:</span>
            <span className="text-base font-black">{formatCurrency(metrics.fizikiSayim)}</span>
          </div>
          <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
            <span>KASA FARKI:</span>
            <span className="text-base font-black">
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
      <div className="py-2 border-b-2 border-black">
        <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
          --- SATIŞ VE CİRO ÖZETİ ---
        </div>
        <div className="space-y-1 text-sm font-bold">
          <div className="flex justify-between">
            <span>DengePOS Satış:</span>
            <span>{formatCurrency(metrics.dengePosToplam)}</span>
          </div>
          <div className="flex justify-between">
            <span>Suitable POS Satış:</span>
            <span>{formatCurrency(metrics.suitablePosToplam)}</span>
          </div>
        </div>
        <div className="border-t-2 border-black my-1.5"></div>
        <div className="flex justify-between text-base font-black">
          <span>TOPLAM SATIŞ (CİRO):</span>
          <span className="text-lg font-black">{formatCurrency(metrics.toplamSatis)}</span>
        </div>
      </div>

      {/* 4. Z RAPORU & FİŞ MUTABAKATI */}
      <div className="py-2 border-b-2 border-black">
        <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
          --- MALİ FİŞ & Z MUTABAKAT ---
        </div>
        <div className="space-y-1 text-sm font-bold">
          <div className="flex justify-between">
            <span>Gereken Nakit Fişi:</span>
            <span>{formatCurrency(metrics.kesilmesiGerekenNakitFisi)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kesilen Z Nakit Fişi:</span>
            <span className="font-black">{formatCurrency(metrics.kesilenNakitFisi)}</span>
          </div>
          <div className="flex justify-between font-black pt-0.5">
            <span>Nakit Fiş Farkı:</span>
            <span>{formatCurrency(metrics.nakitFisFarki)}</span>
          </div>

          <div className="border-t border-black my-1.5"></div>

          <div className="flex justify-between">
            <span>Hesaplanan Kredi Kartı:</span>
            <span>{formatCurrency(metrics.hesaplananKrediKarti)}</span>
          </div>
          <div className="flex justify-between">
            <span>Fiziki POS Kredi Kartı Z:</span>
            <span className="font-black">{formatCurrency(metrics.fizikiKrediKarti)}</span>
          </div>
          <div className="flex justify-between font-black pt-0.5">
            <span>Kredi Kartı Farkı:</span>
            <span>{formatCurrency(metrics.krediKartiFarki)}</span>
          </div>
        </div>
      </div>

      {/* 5. YEMEK KARTLARI */}
      <div className="py-2 border-b-2 border-black">
        <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
          --- YEMEK KARTLARI (FİZİKİ / SİSTEM) ---
        </div>
        <div className="space-y-1 text-sm font-bold">
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
        <div className="py-2 border-b-2 border-black">
          <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
            --- KASA GİDER DETAYLARI ---
          </div>
          <div className="space-y-1 text-sm font-bold">
            {harcamalar.map((h, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate max-w-[200px]">
                  {h.title} {h.aciklama ? `(${h.aciklama})` : ''}:
                </span>
                <span className="font-black">{formatCurrency(h.tutar)}</span>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-black my-1.5"></div>
          <div className="flex justify-between text-sm font-black">
            <span>TOPLAM GİDER:</span>
            <span className="text-base font-black">{formatCurrency(metrics.toplamHarcamalar)}</span>
          </div>
        </div>
      )}

      {/* 7. İMZA ALANI */}
      <div className="pt-2 pb-1 text-center text-sm font-bold">
        <div className="flex justify-between mt-1">
          <div className="w-1/2 text-center">
            <p className="font-black text-sm">Teslim Eden</p>
            <p className="text-xs text-black">(Kasiyer)</p>
            <div className="h-6 border-b-2 border-black mx-3 mt-1"></div>
          </div>
          <div className="w-1/2 text-center">
            <p className="font-black text-sm">Teslim Alan</p>
            <p className="text-xs text-black">(Yetkili / Yönetici)</p>
            <div className="h-6 border-b-2 border-black mx-3 mt-1"></div>
          </div>
        </div>
        <p className="mt-2 text-xs font-black uppercase tracking-widest">*** GÜN SONU KASA RAPORU ***</p>
      </div>
    </div>
  );
}
