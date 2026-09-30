import React, { useState } from 'react';
import { Store, ShoppingBag, CreditCard, Banknote, Utensils, Camera, Sparkles } from 'lucide-react';
import { formatCurrency, num } from '../utils/calculations';
import ScanReceiptModal from './ScanReceiptModal';

export default function PosSalesSection({ dengePos, suitablePos, onChangeDenge, onChangeSuitable }) {
  const [activeScanModal, setActiveScanModal] = useState(null); // 'denge' | 'suitable' | null

  const handleDengeChange = (field, value) => {
    onChangeDenge({
      ...dengePos,
      [field]: value === '' ? '' : Number(value) || 0,
    });
  };

  const handleSuitableChange = (field, value) => {
    onChangeSuitable({
      ...suitablePos,
      [field]: value === '' ? '' : Number(value) || 0,
    });
  };

  const handleApplyDengeScan = (fields) => {
    onChangeDenge({
      ...dengePos,
      nakit: fields.nakit !== undefined ? fields.nakit : dengePos?.nakit,
      krediKarti: fields.krediKarti !== undefined ? fields.krediKarti : dengePos?.krediKarti,
      cari: fields.cari !== undefined ? fields.cari : dengePos?.cari,
      sodexho: fields.sodexho !== undefined ? fields.sodexho : dengePos?.sodexho,
      multinet: fields.multinet !== undefined ? fields.multinet : dengePos?.multinet,
      ticket: fields.ticket !== undefined ? fields.ticket : dengePos?.ticket,
      setcard: fields.setcard !== undefined ? fields.setcard : dengePos?.setcard,
    });
  };

  const handleApplySuitableScan = (fields) => {
    onChangeSuitable({
      ...suitablePos,
      nakit: fields.nakit !== undefined ? fields.nakit : suitablePos?.nakit,
      krediKarti: fields.krediKarti !== undefined ? fields.krediKarti : suitablePos?.krediKarti,
      onlineKrediKarti: fields.onlineKrediKarti !== undefined ? fields.onlineKrediKarti : suitablePos?.onlineKrediKarti,
      sodexho: fields.sodexho !== undefined ? fields.sodexho : suitablePos?.sodexho,
      multinet: fields.multinet !== undefined ? fields.multinet : suitablePos?.multinet,
      ticket: fields.ticket !== undefined ? fields.ticket : suitablePos?.ticket,
      setcard: fields.setcard !== undefined ? fields.setcard : suitablePos?.setcard,
      paketSiparisSayisi: fields.paketSiparisSayisi !== undefined ? fields.paketSiparisSayisi : suitablePos?.paketSiparisSayisi,
    });
  };

  const dengeTotal =
    num(dengePos?.nakit) +
    num(dengePos?.krediKarti) +
    num(dengePos?.sodexho) +
    num(dengePos?.multinet) +
    num(dengePos?.ticket) +
    num(dengePos?.setcard) +
    num(dengePos?.cari);

  const suitableTotal =
    num(suitablePos?.nakit) +
    num(suitablePos?.krediKarti) +
    num(suitablePos?.onlineKrediKarti) +
    num(suitablePos?.sodexho) +
    num(suitablePos?.multinet) +
    num(suitablePos?.ticket) +
    num(suitablePos?.setcard);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* DengePOS Kartı */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">DengePOS Satışları</h2>
                <p className="text-xs text-slate-500">Şube / Masa Satışları</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setActiveScanModal('denge')}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors shadow-xs"
                title="Sistem Satış Balans Fişini Kameradan Oku"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>📸 Fiş Tara</span>
              </button>

              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-400 block">DengePOS Toplamı</span>
                <span className="text-base font-bold text-indigo-600">{formatCurrency(dengeTotal)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nakit</label>
              <input
                type="number"
                step="any"
                value={dengePos?.nakit ?? 0}
                onChange={(e) => handleDengeChange('nakit', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kredi Kartı</label>
              <input
                type="number"
                step="any"
                value={dengePos?.krediKarti ?? 0}
                onChange={(e) => handleDengeChange('krediKarti', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cari</label>
              <input
                type="number"
                step="any"
                value={dengePos?.cari ?? 0}
                onChange={(e) => handleDengeChange('cari', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sodexho</label>
              <input
                type="number"
                step="any"
                value={dengePos?.sodexho ?? 0}
                onChange={(e) => handleDengeChange('sodexho', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Multinet</label>
              <input
                type="number"
                step="any"
                value={dengePos?.multinet ?? 0}
                onChange={(e) => handleDengeChange('multinet', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ticket</label>
              <input
                type="number"
                step="any"
                value={dengePos?.ticket ?? 0}
                onChange={(e) => handleDengeChange('ticket', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Setcard</label>
              <input
                type="number"
                step="any"
                value={dengePos?.setcard ?? 0}
                onChange={(e) => handleDengeChange('setcard', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Suitable POS Kartı */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Suitable POS Satışları</h2>
                <p className="text-xs text-slate-500">Paket & Online Satış Kırılımları</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setActiveScanModal('suitable')}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors shadow-xs"
                title="Suitable POS Günlük Satış Raporunu Kameradan Oku"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>📸 Fiş Tara</span>
              </button>

              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-400 block">Suitable Toplamı</span>
                <span className="text-base font-bold text-blue-600">{formatCurrency(suitableTotal)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nakit</label>
              <input
                type="number"
                step="any"
                value={suitablePos?.nakit ?? 0}
                onChange={(e) => handleSuitableChange('nakit', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kredi Kartı</label>
              <input
                type="number"
                step="any"
                value={suitablePos?.krediKarti ?? 0}
                onChange={(e) => handleSuitableChange('krediKarti', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 text-blue-700 font-semibold">
                Online Kredi Kartı
              </label>
              <input
                type="number"
                step="any"
                value={suitablePos?.onlineKrediKarti ?? 0}
                onChange={(e) => handleSuitableChange('onlineKrediKarti', e.target.value)}
                className="w-full bg-blue-50/50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sodexho</label>
              <input
                type="number"
                step="any"
                value={suitablePos?.sodexho ?? 0}
                onChange={(e) => handleSuitableChange('sodexho', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Multinet</label>
              <input
                type="number"
                step="any"
                value={suitablePos?.multinet ?? 0}
                onChange={(e) => handleSuitableChange('multinet', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ticket</label>
              <input
                type="number"
                step="any"
                value={suitablePos?.ticket ?? 0}
                onChange={(e) => handleSuitableChange('ticket', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Setcard</label>
              <input
                type="number"
                step="any"
                value={suitablePos?.setcard ?? 0}
                onChange={(e) => handleSuitableChange('setcard', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-amber-700 font-semibold mb-1">
                Paket Sipariş Sayısı
              </label>
              <input
                type="number"
                step="1"
                value={suitablePos?.paketSiparisSayisi ?? 0}
                onChange={(e) => handleSuitableChange('paketSiparisSayisi', e.target.value)}
                className="w-full bg-amber-50/50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-900 focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* DengePOS Scan Modal */}
      <ScanReceiptModal
        isOpen={activeScanModal === 'denge'}
        onClose={() => setActiveScanModal(null)}
        onApply={handleApplyDengeScan}
        mode="denge"
        title="DengePOS Balans Fişi Tara"
      />

      {/* Suitable POS Scan Modal */}
      <ScanReceiptModal
        isOpen={activeScanModal === 'suitable'}
        onClose={() => setActiveScanModal(null)}
        onApply={handleApplySuitableScan}
        mode="suitable"
        title="Suitable POS Satış Raporu Tara"
      />
    </div>
  );
}
