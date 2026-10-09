import React, { useState } from 'react';
import { ReceiptText, Plus, Trash2, Smartphone, CreditCard, CheckCircle2, Landmark } from 'lucide-react';
import { formatCurrency, num, BANKA_SAYISI, BANKA_ADLARI } from '../utils/calculations';

import NumberInput from './NumberInput';
export default function ZReportsSection({ zBilgileri = {}, onChange }) {
  const posCihazlari = zBilgileri.posCihazlari || [];

  const handleDeviceChange = (index, field, value) => {
    const nextDevices = [...posCihazlari];
    nextDevices[index] = {
      ...nextDevices[index],
      [field]: field === 'name' ? value : value === '' ? '' : Number(value) || 0,
    };
    onChange({
      ...zBilgileri,
      posCihazlari: nextDevices,
    });
  };

  // Banka gün sonu tutarı: cihaz başına BANKA_SAYISI adet (aynı POS'ta birden fazla banka çalışabilir)
  const handleBankChange = (index, slot, value) => {
    const nextDevices = [...posCihazlari];
    const banka = Array.from({ length: BANKA_SAYISI }, (_, i) => nextDevices[index].banka?.[i] ?? '');
    banka[slot] = value === '' ? '' : Number(value) || 0;
    nextDevices[index] = { ...nextDevices[index], banka };
    onChange({ ...zBilgileri, posCihazlari: nextDevices });
  };

  const handleAddDevice = () => {
    const id = 'pos_' + Date.now();
    onChange({
      ...zBilgileri,
      posCihazlari: [...posCihazlari, { id, name: 'Yeni POS Cihazı', nakit: 0, krediKarti: 0 }],
    });
  };

  const handleRemoveDevice = (index) => {
    const nextDevices = posCihazlari.filter((_, i) => i !== index);
    onChange({
      ...zBilgileri,
      posCihazlari: nextDevices,
    });
  };

  const totalKesilenNakit = posCihazlari.reduce((acc, d) => acc + num(d.nakit), 0);
  const bankaToplamlari = BANKA_ADLARI.map((_, slot) => posCihazlari.reduce((acc, d) => acc + num(d.banka?.[slot]), 0));
  const totalFizikiKK = posCihazlari.reduce((acc, d) => acc + num(d.krediKarti), 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Z Bilgileri (Fiziki Cihaz & Z Raporları)</h2>
            <p className="text-xs text-slate-500">POS cihazı gün sonu (Z) fişleri</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Z Nakit Fişi Toplamı</span>
            <span className="text-xs font-bold text-slate-800">{formatCurrency(totalKesilenNakit)}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Z Kredi Kartı Toplamı</span>
            <span className="text-xs font-bold text-amber-700">{formatCurrency(totalFizikiKK)}</span>
          </div>
          {BANKA_ADLARI.map((ad, slot) => (
            <div key={ad} className="text-right">
              <span className="text-[11px] font-medium text-slate-400 block">{ad} Toplamı</span>
              <span className="text-xs font-bold text-sky-700">{formatCurrency(bankaToplamlari[slot])}</span>
            </div>
          ))}
          <button
            onClick={handleAddDevice}
            className="flex items-center space-x-1 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>POS Cihazı Ekle</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-4">
        {/* POS Cihazları Listesi */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Smartphone className="w-4 h-4" />
            <span>Fiziki POS Cihazları (Nakit & Kredi Kartı Fişleri)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {posCihazlari.map((device, idx) => {
              const deviceTotal = num(device.nakit) + num(device.krediKarti);
              const bankaTutarlari = Array.from({ length: BANKA_SAYISI }, (_, i) => device.banka?.[i] ?? '');
              const bankaToplam = bankaTutarlari.reduce((acc, v) => acc + num(v), 0);
              const bankaGirildi = bankaTutarlari.some((v) => num(v) !== 0);
              const bankaFark = bankaToplam - num(device.krediKarti);
              const bankaEsit = bankaGirildi && Math.abs(bankaFark) <= 0.05;
              return (
                <div
                  key={device.id || idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-amber-200 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <input
                      type="text"
                      value={device.name}
                      onChange={(e) => handleDeviceChange(idx, 'name', e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 outline-none px-0.5 py-0.5 flex-1 min-w-0 truncate"
                    />

                    {/* İki kutunun toplamı (Nakit + Kredi Kartı) */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span
                        className="text-[11px] font-extrabold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap"
                        title="Bu cihazdaki Nakit Fişi + Kredi Kartı Toplamı"
                      >
                        Toplam: {formatCurrency(deviceTotal)}
                      </span>

                      <button
                        onClick={() => handleRemoveDevice(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors"
                        title="Cihazı Kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Nakit Fişi (TL)</label>
                      <NumberInput
                        type="number"
                        step="any"
                        value={device.nakit ?? 0}
                        onChange={(e) => handleDeviceChange(idx, 'nakit', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-[10px] font-medium text-slate-500 mb-0.5">
                        <span>Kredi Kartı (TL)</span>
                        {bankaEsit && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" title="Banka gün sonu toplamı kredi kartı ile eşit" />
                        )}
                      </label>
                      <NumberInput
                        type="number"
                        step="any"
                        value={device.krediKarti ?? 0}
                        onChange={(e) => handleDeviceChange(idx, 'krediKarti', e.target.value)}
                        className={`w-full bg-white border rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none ${bankaEsit ? 'border-emerald-400 focus:border-emerald-500' : 'border-slate-200 focus:border-amber-500'}`}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                        <Landmark className="w-3 h-3" />
                        Banka Gün Sonu
                      </span>
                      {bankaGirildi && !bankaEsit && (
                        <span className="text-[10px] font-bold text-rose-600">
                          {bankaFark < 0 ? 'Eksik' : 'Fazla'} {formatCurrency(Math.abs(bankaFark))}
                        </span>
                      )}
                      {bankaEsit && <span className="text-[10px] font-bold text-emerald-600">Toplam {formatCurrency(bankaToplam)}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {bankaTutarlari.map((v, slot) => (
                        <div key={slot}>
                          <label className="block text-[9px] font-medium text-slate-400 mb-0.5">{BANKA_ADLARI[slot]}</label>
                          <NumberInput
                            type="number"
                            step="any"
                            value={v}
                            onChange={(e) => handleBankChange(idx, slot, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[11px] font-semibold text-slate-800 focus:border-sky-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>
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
