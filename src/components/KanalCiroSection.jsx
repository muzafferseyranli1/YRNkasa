import React from 'react';
import { LayoutGrid, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatNumber, calculateKanalMetrics } from '../utils/calculations';
import NumberInput from './NumberInput';

const cell =
  'w-full bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs font-semibold text-slate-800 text-right focus:border-orange-500 outline-none';

/**
 * Kağıt formdaki kırılımlı giriş: satırlar = kanallar (Restoran, Paket, Yemek Sepeti, Getir...),
 * sütunlar = markalar (Pide / Tandır / Kıymalı) + toplam. Solda ciro, sağda kişi/paket sayıları.
 */
export default function KanalCiroSection({ kanalCiro, toplamSatis = 0, onChange }) {
  const markalar = kanalCiro?.markalar || [];
  const satirlar = kanalCiro?.satirlar || [];
  const m = calculateKanalMetrics(kanalCiro);
  const fark = m.ciroToplam - toplamSatis;
  const farkVar = m.ciroToplam > 0 && Math.abs(fark) > 0.05;

  const update = (patch) => onChange({ ...kanalCiro, ...patch });

  const setMarkaName = (id, name) =>
    update({ markalar: markalar.map((x) => (x.id === id ? { ...x, name } : x)) });

  const setRowName = (rowId, name) =>
    update({ satirlar: satirlar.map((r) => (r.id === rowId ? { ...r, name } : r)) });

  const setValue = (rowId, kind, markaId, value) =>
    update({
      satirlar: satirlar.map((r) =>
        r.id === rowId ? { ...r, [kind]: { ...(r[kind] || {}), [markaId]: value } } : r
      ),
    });

  const addRow = () =>
    update({
      satirlar: [
        ...satirlar,
        { id: 'c_' + Date.now(), name: 'Yeni Kanal', sayiTuru: 'paket', panel: true, ciro: {}, adet: {} },
      ],
    });

  const removeRow = (rowId) => update({ satirlar: satirlar.filter((r) => r.id !== rowId) });

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Marka / Kanal Kırılımlı Ciro</h2>
            <p className="text-xs text-slate-500">Kağıt rapor: kanal bazında ciro, kişi ve paket sayıları (marka sütunları)</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Toplam Paket</span>
            <span className="text-sm font-bold text-slate-800">{formatNumber(m.paketToplam)} Adet</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Online Alacak</span>
            <span className="text-sm font-bold text-sky-700">{formatCurrency(m.onlineToplam)}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Ciro Toplam</span>
            <span className="text-base font-bold text-orange-600">{formatCurrency(m.ciroToplam)}</span>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center space-x-1 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kanal Ekle</span>
          </button>
        </div>
      </div>

      {farkVar && (
        <div className="mt-3 flex gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Kanal ciro toplamı ({formatCurrency(m.ciroToplam)}) POS satış toplamından ({formatCurrency(toplamSatis)}){' '}
            <b>{formatCurrency(Math.abs(fark))}</b> {fark > 0 ? 'fazla' : 'eksik'}. Değerler değiştirilmedi, kontrol edin.
          </span>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th rowSpan={2} className="text-left px-1 py-1.5 text-[11px] font-bold uppercase text-slate-500 align-bottom">
                Kanal
              </th>
              {markalar.map((mk) => (
                <th key={mk.id} colSpan={3} className="px-1 pt-1.5">
                  <input
                    type="text"
                    value={mk.name}
                    onChange={(e) => setMarkaName(mk.id, e.target.value)}
                    className="w-full text-center text-[11px] font-bold uppercase text-orange-800 bg-orange-50 border border-orange-200 rounded px-1 py-0.5 outline-none focus:border-orange-500"
                  />
                </th>
              ))}
              <th colSpan={3} className="px-2 pt-1.5 text-[11px] font-bold uppercase text-slate-600">
                Toplam
              </th>
              <th rowSpan={2} className="w-6" />
            </tr>
            <tr className="text-[10px] font-semibold text-slate-400">
              {[...markalar, { id: '_t' }].map((mk) => (
                <React.Fragment key={mk.id}>
                  <th className="px-1 pb-1 text-right">Ciro ₺</th>
                  <th className="px-1 pb-1 text-right text-sky-600" title="Platformun online tahsil ettiği, bize ödeyeceği tutar (alacak)">
                    Online Alacak ₺
                  </th>
                  <th className="px-1 pb-1 text-center w-14">Adet</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {satirlar.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-1 py-1 whitespace-nowrap">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => setRowName(row.id, e.target.value)}
                    className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-orange-500 outline-none py-0.5"
                  />
                  {row.sayiTuru === 'kisi' && (
                    <span className="block text-[9px] font-normal text-slate-400 leading-none">adet = kişi sayısı</span>
                  )}
                </td>
                {markalar.map((mk) => (
                  <React.Fragment key={mk.id}>
                    <td className="px-1 py-1 min-w-[84px]">
                      <NumberInput
                        type="number"
                        value={row.ciro?.[mk.id] ?? ''}
                        onChange={(e) => setValue(row.id, 'ciro', mk.id, e.target.value)}
                        className={cell}
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[84px]">
                      <NumberInput
                        type="number"
                        value={row.online?.[mk.id] ?? ''}
                        onChange={(e) => setValue(row.id, 'online', mk.id, e.target.value)}
                        className={cell + ' !border-sky-200 !bg-sky-50/40'}
                      />
                    </td>
                    <td className="px-0.5 py-1 w-14">
                      <NumberInput
                        type="number"
                        step="1"
                        value={row.adet?.[mk.id] ?? ''}
                        onChange={(e) => setValue(row.id, 'adet', mk.id, e.target.value)}
                        className={cell + ' text-center !px-0.5'}
                      />
                    </td>
                  </React.Fragment>
                ))}
                <td className="px-2 py-1 text-right font-bold text-slate-800 whitespace-nowrap">
                  {formatCurrency(m.satirToplamlari[row.id]?.ciro || 0)}
                </td>
                <td className="px-2 py-1 text-right font-bold text-sky-700 whitespace-nowrap">
                  {formatCurrency(m.satirToplamlari[row.id]?.online || 0)}
                </td>
                <td className="px-1 py-1 text-center font-bold text-slate-700">
                  {formatNumber(m.satirToplamlari[row.id]?.adet || 0)}
                </td>
                <td className="px-0.5">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="text-slate-300 hover:text-rose-500 p-1"
                    title="Kanalı kaldır"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 bg-orange-50/60">
              <td className="px-1 py-1.5 font-extrabold text-slate-900 leading-tight">
                CİRO TOPLAM
                <span className="block text-[10px] font-bold text-slate-500">TOPLAM PAKET SAYISI</span>
              </td>
              {markalar.map((mk) => (
                <React.Fragment key={mk.id}>
                  <td className="px-1 py-1.5 text-right font-bold text-orange-900 whitespace-nowrap">
                    {formatCurrency(m.markaCiro[mk.id])}
                  </td>
                  <td className="px-1 py-1.5 text-right font-bold text-sky-800 whitespace-nowrap">
                    {formatCurrency(m.markaOnline[mk.id])}
                  </td>
                  <td className="px-0.5 py-1.5 text-center font-bold text-orange-900">{formatNumber(m.markaPaket[mk.id])}</td>
                </React.Fragment>
              ))}
              <td className="px-2 py-1.5 text-right font-black text-orange-700 whitespace-nowrap">
                {formatCurrency(m.ciroToplam)}
              </td>
              <td className="px-2 py-1.5 text-right font-black text-sky-700 whitespace-nowrap">
                {formatCurrency(m.onlineToplam)}
              </td>
              <td className="px-1 py-1.5 text-center font-black text-orange-700">{formatNumber(m.paketToplam)}</td>
              <td />
            </tr>
            <tr className="bg-slate-50">
              <td className="px-1 py-1.5 font-bold text-slate-700">TOPLAM KİŞİ SAYISI</td>
              {markalar.map((mk) => (
                <React.Fragment key={mk.id}>
                  <td />
                  <td />
                  <td className="px-0.5 py-1.5 text-center font-semibold text-slate-700">{formatNumber(m.markaKisi[mk.id])}</td>
                </React.Fragment>
              ))}
              <td />
              <td />
              <td className="px-1 py-1.5 text-center font-bold text-slate-800">{formatNumber(m.kisiToplam)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
