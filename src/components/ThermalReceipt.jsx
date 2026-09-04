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
    <div className="thermal-receipt-container text-black bg-white">
      {/* Başlık */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        <h1 className="text-sm font-black uppercase tracking-wider">YRN RESTORAN</h1>
        <h2 className="text-xs font-bold uppercase mt-0.5">GÜN SONU KASA RAPORU</h2>
        <p className="text-[10px] mt-1">TARİH: {formatDateDisplay(date)}</p>
        <p className="text-[9px] text-gray-700">Baskı Zamanı: {new Date().toLocaleTimeString('tr-TR')}</p>
      </div>

      {/* 1. KASA NAKİT VE DEVİR DURUMU */}
      <div className="py-2 border-b border-dashed border-black">
        <div className="font-bold text-[10px] uppercase text-center mb-1">--- KASA NAKİT AKIŞI ---</div>
        <div className="flex justify-between text-[10px]">
          <span>Önceki Günden Devir:</span>
          <span className="font-bold">{formatCurrency(kasaGiris.devir)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Kasaya Konan Nakit:</span>
          <span>{formatCurrency(kasaGiris.kasayaParaKondu)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>DengePOS Nakit Satış:</span>
          <span>{formatCurrency(dengePos.nakit)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Suitable POS Nakit Satış:</span>
          <span>{formatCurrency(suitablePos.nakit)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Toplam Harcamalar (Gider):</span>
          <span>-{formatCurrency(metrics.toplamHarcamalar)}</span>
        </div>
        <div className="border-t border-dotted border-black my-1"></div>
        <div className="flex justify-between text-[11px] font-bold">
          <span>HESAPLANAN KASA:</span>
          <span>{formatCurrency(metrics.hesaplananNakit)}</span>
        </div>
        <div className="flex justify-between text-[11px] font-black">
          <span>FİZİKİ KASA SAYIMI:</span>
          <span>{formatCurrency(metrics.fizikiSayim)}</span>
        </div>
        <div className="flex justify-between text-[11px] font-black mt-0.5">
          <span>KASA FARKI:</span>
          <span>
            {metrics.kasaFarki === 0
              ? '0,00 ₺ (TAM)'
              : metrics.kasaFarki < 0
              ? `${formatCurrency(Math.abs(metrics.kasaFarki))} (EKSİK)`
              : `${formatCurrency(metrics.kasaFarki)} (FAZLA)`}
          </span>
        </div>
      </div>

      {/* 2. SATIŞ VE CİRO ÖZETİ */}
      <div className="py-2 border-b border-dashed border-black">
        <div className="font-bold text-[10px] uppercase text-center mb-1">--- SATIŞ VE CİRO ---</div>
        <div className="flex justify-between text-[10px]">
          <span>DengePOS Satış:</span>
          <span>{formatCurrency(metrics.dengePosToplam)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Suitable POS Satış:</span>
          <span>{formatCurrency(metrics.suitablePosToplam)}</span>
        </div>
        <div className="border-t border-dotted border-black my-1"></div>
        <div className="flex justify-between text-[12px] font-black">
          <span>TOPLAM SATIŞ (CİRO):</span>
          <span>{formatCurrency(metrics.toplamSatis)}</span>
        </div>
      </div>

      {/* 3. Z RAPORU & FİŞ MUTABAKATI */}
      <div className="py-2 border-b border-dashed border-black">
        <div className="font-bold text-[10px] uppercase text-center mb-1">--- MALİ FİŞ & Z MUTABAKAT ---</div>
        <div className="flex justify-between text-[10px]">
          <span>Gereken Nakit Fişi:</span>
          <span>{formatCurrency(metrics.kesilmesiGerekenNakitFisi)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Kesilen Z Nakit Fişi:</span>
          <span className="font-bold">{formatCurrency(metrics.kesilenNakitFisi)}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold">
          <span>Nakit Fiş Farkı:</span>
          <span>{formatCurrency(metrics.nakitFisFarki)}</span>
        </div>

        <div className="border-t border-dotted border-black my-1"></div>
        <div className="flex justify-between text-[10px]">
          <span>Hesaplanan Kredi Kartı:</span>
          <span>{formatCurrency(metrics.hesaplananKrediKarti)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Fiziki POS Kredi Kartı Z:</span>
          <span className="font-bold">{formatCurrency(metrics.fizikiKrediKarti)}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold">
          <span>Kredi Kartı Farkı:</span>
          <span>{formatCurrency(metrics.krediKartiFarki)}</span>
        </div>
      </div>

      {/* 4. YEMEK KARTLARI */}
      <div className="py-2 border-b border-dashed border-black">
        <div className="font-bold text-[10px] uppercase text-center mb-1">--- YEMEK KARTLARI ---</div>
        {Object.entries(metrics.yemekKartlari || {}).map(([key, item]) => {
          const name = key.charAt(0).toUpperCase() + key.slice(1);
          return (
            <div key={key} className="flex justify-between text-[10px] py-0.5">
              <span>{name} (Fiziki/Sistem):</span>
              <span>
                {formatCurrency(item.fiziki)} / {formatCurrency(item.hesaplanan)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 5. HARCAMA DETAYLARI */}
      {harcamalar && harcamalar.length > 0 && (
        <div className="py-2 border-b border-dashed border-black">
          <div className="font-bold text-[10px] uppercase text-center mb-1">--- KASA GİDERLERİ ---</div>
          {harcamalar.map((h, i) => (
            <div key={i} className="flex justify-between text-[9px] py-0.5">
              <span>
                {h.title} {h.aciklama ? `(${h.aciklama})` : ''}:
              </span>
              <span className="font-bold">{formatCurrency(h.tutar)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[10px] font-bold mt-1">
            <span>Toplam Gider:</span>
            <span>{formatCurrency(metrics.toplamHarcamalar)}</span>
          </div>
        </div>
      )}

      {/* 6. İMZA ALANI */}
      <div className="pt-4 pb-2 text-center text-[10px]">
        <div className="flex justify-between mt-4">
          <div className="w-1/2 text-center">
            <p className="font-bold">Teslim Eden</p>
            <p className="text-[9px] text-gray-500">(Kasiyer)</p>
            <div className="h-8 border-b border-black mx-2 mt-4"></div>
          </div>
          <div className="w-1/2 text-center">
            <p className="font-bold">Teslim Alan</p>
            <p className="text-[9px] text-gray-500">(Yönetici / Yetkili)</p>
            <div className="h-8 border-b border-black mx-2 mt-4"></div>
          </div>
        </div>
        <p className="mt-4 text-[8px] text-gray-600">*** GÜN SONU KASA KİLİDİ ***</p>
      </div>
    </div>
  );
}
