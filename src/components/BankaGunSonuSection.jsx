import React from 'react';
import { Landmark, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency, num } from '../utils/calculations';
import NumberInput from './NumberInput';

/**
 * Banka sisteminden alınan gün sonu (kapanış) raporu toplamları.
 * POS cihazlarına banka atanmışsa banka bazında, atanmamışsa genel toplamda Z kredi kartı ile karşılaştırılır.
 */
export default function BankaGunSonuSection({ bankalar = [], metrics, onChange }) {
  const detay = metrics?.bankaDetay || [];
  const bankaToplam = metrics?.bankaToplam || 0;
  const fizikiZ = metrics?.fizikiKrediKarti || 0;
  const fark = metrics?.bankaFarki || 0;
  const girildi = !!metrics?.bankaGirildi;

  const setField = (id, field, value) =>
    onChange(bankalar.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  const add = () => onChange([...bankalar, { id: 'banka_' + Date.now(), name: 'Yeni Banka', tutar: '' }]);
  const remove = (id) => onChange(bankalar.filter((b) => b.id !== id));

  const diffBadge = (d) => {
    const ok = Math.abs(d) <= 0.05;
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
        {ok ? 'Tam' : `${formatCurrency(d)} ${d < 0 ? '(banka eksik)' : '(banka fazla)'}`}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Banka Gün Sonu (Kapanış) Raporları</h2>
            <p className="text-xs text-slate-500">Bankanın POS gün sonu toplamı, Z raporundaki kredi kartı ile karşılaştırılır</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Banka Toplamı</span>
            <span className="text-sm font-bold text-sky-700">{formatCurrency(bankaToplam)}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Z Kredi Kartı</span>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(fizikiZ)}</span>
          </div>
          <button
            type="button"
            onClick={add}
            className="flex items-center space-x-1 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Banka Ekle</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {bankalar.map((b) => {
          const d = detay.find((x) => x.id === b.id);
          return (
            <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between mb-2 gap-2">
                <input
                  type="text"
                  value={b.name}
                  onChange={(e) => setField(b.id, 'name', e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 outline-none px-0.5 py-0.5 flex-1 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-md"
                  title="Bankayı kaldır"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Gün Sonu Kapanış Tutarı (TL)</label>
              <NumberInput
                type="number"
                value={b.tutar ?? ''}
                onChange={(e) => setField(b.id, 'tutar', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-sky-500 outline-none"
              />
              {d && d.cihazSayisi > 0 ? (
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Z ({d.cihazSayisi} cihaz): <b className="text-slate-700">{formatCurrency(d.zToplam)}</b>
                  </span>
                  {num(b.tutar) !== 0 || d.zToplam !== 0 ? diffBadge(d.fark) : null}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-slate-400">
                  Banka bazında karşılaştırma için Z Bilgileri'nde POS cihazına bu bankayı atayın.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {girildi && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 p-3 bg-sky-50/60 border border-sky-100 rounded-xl text-xs">
          <span className="text-slate-600">
            Banka toplamı <b>{formatCurrency(bankaToplam)}</b> − Z kredi kartı <b>{formatCurrency(fizikiZ)}</b>
          </span>
          {diffBadge(fark)}
        </div>
      )}
    </div>
  );
}
