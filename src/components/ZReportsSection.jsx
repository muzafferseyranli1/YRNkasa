import React, { useState } from 'react';
import { ReceiptText, Plus, Trash2, Smartphone, CreditCard, Camera, Sparkles } from 'lucide-react';
import { formatCurrency, num } from '../utils/calculations';
import ScanReceiptModal from './ScanReceiptModal';

import NumberInput from './NumberInput';
export default function ZReportsSection({ zBilgileri = {}, bankalar = [], onChange }) {
  const [activeScanTarget, setActiveScanTarget] = useState(null); // { type: 'pos', index: 0 } or { type: 'meal' }
  const posCihazlari = zBilgileri.posCihazlari || [];

  const handleDeviceChange = (index, field, value) => {
    const nextDevices = [...posCihazlari];
    nextDevices[index] = {
      ...nextDevices[index],
      [field]: field === 'name' || field === 'bankId' ? value : value === '' ? '' : Number(value) || 0,
    };
    onChange({
      ...zBilgileri,
      posCihazlari: nextDevices,
    });
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

  const handleMealCardChange = (field, value) => {
    onChange({
      ...zBilgileri,
      [field]: value === '' ? '' : Number(value) || 0,
    });
  };

  // Apply OCR scanned results
  const handleScanApply = (parsed) => {
    if (!activeScanTarget) return;

    if (activeScanTarget.type === 'pos') {
      const idx = activeScanTarget.index;
      const nextDevices = [...posCihazlari];
      nextDevices[idx] = {
        ...nextDevices[idx],
        nakit: parsed.nakit || nextDevices[idx].nakit || 0,
        krediKarti: parsed.krediKarti || nextDevices[idx].krediKarti || 0,
      };
      onChange({
        ...zBilgileri,
        posCihazlari: nextDevices,
      });
    } else if (activeScanTarget.type === 'meal') {
      onChange({
        ...zBilgileri,
        sodexho: parsed.sodexho || zBilgileri.sodexho || 0,
        multinet: parsed.multinet || zBilgileri.multinet || 0,
        ticket: parsed.ticket || zBilgileri.ticket || 0,
        setcard: parsed.setcard || zBilgileri.setcard || 0,
      });
    }

    setActiveScanTarget(null);
  };

  const totalKesilenNakit = posCihazlari.reduce((acc, d) => acc + num(d.nakit), 0);
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
            <p className="text-xs text-slate-500">POS cihazı gün sonu fişleri ve yemek kartı fiziki Z toplamları</p>
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
          <button
            onClick={handleAddDevice}
            className="flex items-center space-x-1 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>POS Cihazı Ekle</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* POS Cihazları Listesi */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Smartphone className="w-4 h-4" />
            <span>Fiziki POS Cihazları (Nakit & Kredi Kartı Fişleri)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {posCihazlari.map((device, idx) => {
              const deviceTotal = num(device.nakit) + num(device.krediKarti);
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

                    {/* İki kutunun toplamı (Nakit + Kredi Kartı) ve OCR Kamera Butonu */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span
                        className="text-[11px] font-extrabold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap"
                        title="Bu cihazdaki Nakit Fişi + Kredi Kartı Toplamı"
                      >
                        Toplam: {formatCurrency(deviceTotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => setActiveScanTarget({ type: 'pos', index: idx })}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Bu POS için Z Raporunu Kameradan Oku"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleRemoveDevice(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors"
                        title="Cihazı Kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {bankalar.length > 0 && (
                    <div className="mb-2 flex items-center gap-2">
                      <label className="text-[10px] font-medium text-slate-500 whitespace-nowrap">Banka:</label>
                      <select
                        value={device.bankId || ''}
                        onChange={(e) => handleDeviceChange(idx, 'bankId', e.target.value)}
                        className="flex-1 min-w-0 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[11px] text-slate-700 outline-none focus:border-amber-500"
                      >
                        <option value="">Seçilmedi</option>
                        {bankalar.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Kredi Kartı (TL)</label>
                      <NumberInput
                        type="number"
                        step="any"
                        value={device.krediKarti ?? 0}
                        onChange={(e) => handleDeviceChange(idx, 'krediKarti', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Yemek Kartları Fiziki Z */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4" />
              <span>Yemek Kartları Fiziki Z</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveScanTarget({ type: 'meal' })}
              className="flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors"
              title="Yemek kartı sliplerini kameradan tara"
            >
              <Camera className="w-3 h-3" />
              <span>Slip Tara</span>
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sodexho Z Tutarı</label>
              <NumberInput
                type="number"
                step="any"
                value={zBilgileri?.sodexho ?? 0}
                onChange={(e) => handleMealCardChange('sodexho', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Multinet Z Tutarı</label>
              <NumberInput
                type="number"
                step="any"
                value={zBilgileri?.multinet ?? 0}
                onChange={(e) => handleMealCardChange('multinet', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ticket Z Tutarı</label>
              <NumberInput
                type="number"
                step="any"
                value={zBilgileri?.ticket ?? 0}
                onChange={(e) => handleMealCardChange('ticket', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Setcard Z Tutarı</label>
              <NumberInput
                type="number"
                step="any"
                value={zBilgileri?.setcard ?? 0}
                onChange={(e) => handleMealCardChange('setcard', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* OCR Z Raporu Tarayıcı Modal */}
      <ScanReceiptModal
        isOpen={!!activeScanTarget}
        onClose={() => setActiveScanTarget(null)}
        mode={activeScanTarget?.type === 'meal' ? 'meal' : 'pos'}
        title={activeScanTarget?.type === 'meal' ? 'Yemek Kartı Slipi Tara (OCR)' : 'Z Raporu / Fiş Tara (OCR)'}
        onApply={handleScanApply}
      />
    </div>
  );
}
