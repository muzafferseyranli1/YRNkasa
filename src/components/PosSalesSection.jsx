import React from 'react';
import { Store } from 'lucide-react';
import { formatCurrency, num, resolvePosMarka } from '../utils/calculations';
import NumberInput from './NumberInput';

// Satırlar: key, etiket, hangi POS'ta var (d: DengePOS, s: Suitable)
const ROWS = [
  { key: 'nakit', label: 'Nakit', d: true, s: true },
  { key: 'krediKarti', label: 'Kredi Kartı', d: true, s: true },
  { key: 'onlineKrediKarti', label: 'Online Kredi Kartı', d: true, s: true },
  { key: 'cari', label: 'Cari', d: true, s: true },
  { key: 'sodexho', label: 'Sodexho', d: true, s: true },
  { key: 'multinet', label: 'Multinet', d: true, s: true },
  { key: 'ticket', label: 'Ticket', d: true, s: true },
  { key: 'setcard', label: 'Setcard', d: true, s: true },
];
const D_KEYS = ROWS.filter((r) => r.d).map((r) => r.key);
const S_KEYS = ROWS.filter((r) => r.s).map((r) => r.key);

const cellCls =
  'w-full bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-xs font-semibold text-slate-800 text-right outline-none';

const sumKeys = (obj, keys) => keys.reduce((t, k) => t + num(obj?.[k]), 0);

export default function PosSalesSection({
  markalar = [],
  posMarka,
  dengePos,
  suitablePos,
  kanalOnlineToplam = 0,
  onChange,
}) {
  const pm = resolvePosMarka(posMarka, markalar, dengePos, suitablePos);

  const brandTotal = (type, key) => markalar.reduce((t, mk) => t + num(pm[mk.id]?.[type]?.[key]), 0);

  // Marka hücreleri değişince dengePos / suitablePos (hesapların kullandığı toplamlar) yeniden üretilir
  const commit = (nextPm, suitableExtra = {}) => {
    const total = (type, keys) =>
      keys.reduce((o, k) => ({ ...o, [k]: markalar.reduce((t, mk) => t + num(nextPm[mk.id]?.[type]?.[k]), 0) }), {});
    onChange({
      posMarka: nextPm,
      dengePos: { ...dengePos, ...total('denge', D_KEYS) },
      suitablePos: { ...suitablePos, ...total('suitable', S_KEYS), ...suitableExtra },
    });
  };

  const setCell = (markaId, type, key, value) => {
    const cur = pm[markaId] || {};
    commit({
      ...pm,
      [markaId]: { ...cur, [type]: { ...(cur[type] || {}), [key]: value === '' ? '' : Number(value) || 0 } },
    });
  };

  const dengeTotal = sumKeys(dengePos, D_KEYS);
  const suitableTotal = sumKeys(suitablePos, S_KEYS);
  const brandSum = (mk, type, keys) => sumKeys(pm[mk.id]?.[type], keys);

  const posOnline = num(dengePos?.onlineKrediKarti) + num(suitablePos?.onlineKrediKarti);
  const fark = kanalOnlineToplam - posOnline;
  const tamam = Math.abs(fark) <= 0.05;
  const onlineHint = kanalOnlineToplam > 0 || posOnline > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Ödeme Tipleri Dökümü</h2>
            <p className="text-xs text-slate-500">DengePOS (şube/masa) ve Suitable POS (paket/online) — marka bazlı</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">DengePOS Toplamı</span>
            <span className="text-base font-bold text-indigo-600">{formatCurrency(dengeTotal)}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Suitable Toplamı</span>
            <span className="text-base font-bold text-blue-600">{formatCurrency(suitableTotal)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <table className="w-full text-xs table-fixed">
          <colgroup>
            {Array.from({ length: 6 * (markalar.length + 2) }, (_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} colSpan={6} className="text-left px-1 py-1.5 text-[11px] font-bold uppercase text-slate-500 align-bottom">
                Ödeme
              </th>
              {markalar.map((mk) => (
                <th key={mk.id} colSpan={6} className="px-1 pt-1.5">
                  <div className="text-center text-[11px] font-bold uppercase text-orange-800 bg-orange-50 border border-orange-200 rounded px-1 py-0.5">
                    {mk.name}
                  </div>
                </th>
              ))}
              <th colSpan={6} className="px-1 pt-1.5 text-[11px] font-bold uppercase text-slate-600">
                Toplam
              </th>
            </tr>
            <tr className="text-[10px] font-semibold">
              {markalar.map((mk) => (
                <React.Fragment key={mk.id}>
                  <th colSpan={3} className="px-1 pb-1 text-right text-indigo-600 whitespace-nowrap">Denge</th>
                  <th colSpan={3} className="px-1 pb-1 text-right text-blue-600 whitespace-nowrap">Suitable</th>
                </React.Fragment>
              ))}
              <th colSpan={2} className="px-1 pb-1 text-right text-indigo-600">Denge</th>
              <th colSpan={2} className="px-1 pb-1 text-right text-blue-600">Suitable</th>
              <th colSpan={2} className="px-1 pb-1 text-right text-slate-700">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-slate-100">
                <td colSpan={6} className={`px-1 py-1 whitespace-nowrap font-bold ${row.key === 'onlineKrediKarti' ? 'text-blue-700' : 'text-slate-800'}`}>
                  {row.label}
                </td>
                {markalar.map((mk) => (
                  <React.Fragment key={mk.id}>
                    {[
                      ['denge', row.d],
                      ['suitable', row.s],
                    ].map(([type, on]) => (
                      <td key={type} colSpan={3} className="px-1 py-1">
                        {on ? (
                          <NumberInput
                            type="number"
                            step="any"
                            value={pm[mk.id]?.[type]?.[row.key] ?? 0}
                            onChange={(e) => setCell(mk.id, type, row.key, e.target.value)}
                            className={`${cellCls} focus:bg-white ${type === 'denge' ? 'focus:border-indigo-500' : 'focus:border-blue-500'}`}
                          />
                        ) : (
                          <div className="text-center text-slate-300">—</div>
                        )}
                      </td>
                    ))}
                  </React.Fragment>
                ))}
                <td colSpan={2} className="px-2 py-1 text-right font-bold text-slate-800 whitespace-nowrap">
                  {row.d ? formatCurrency(brandTotal('denge', row.key)) : <span className="text-slate-300">—</span>}
                </td>
                <td colSpan={2} className="px-2 py-1 text-right font-bold text-slate-800 whitespace-nowrap">
                  {row.s ? formatCurrency(brandTotal('suitable', row.key)) : <span className="text-slate-300">—</span>}
                </td>
                <td colSpan={2} className="px-2 py-1 text-right font-black text-slate-900 whitespace-nowrap">
                  {formatCurrency(brandTotal('denge', row.key) * (row.d ? 1 : 0) + brandTotal('suitable', row.key) * (row.s ? 1 : 0))}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={6} className="px-1 py-2 font-bold uppercase text-[11px] text-slate-600">POS Toplam</td>
              {markalar.map((mk) => (
                <React.Fragment key={mk.id}>
                  <td colSpan={3} className="px-2 py-2 text-right font-bold text-indigo-700 whitespace-nowrap">
                    {formatCurrency(brandSum(mk, 'denge', D_KEYS))}
                  </td>
                  <td colSpan={3} className="px-2 py-2 text-right font-bold text-blue-700 whitespace-nowrap">
                    {formatCurrency(brandSum(mk, 'suitable', S_KEYS))}
                  </td>
                </React.Fragment>
              ))}
              <td colSpan={2} className="px-2 py-2 text-right font-bold text-indigo-700 whitespace-nowrap">{formatCurrency(dengeTotal)}</td>
              <td colSpan={2} className="px-2 py-2 text-right font-bold text-blue-700 whitespace-nowrap">{formatCurrency(suitableTotal)}</td>
              <td colSpan={2} className="px-2 py-2 text-right font-black text-slate-900 whitespace-nowrap">{formatCurrency(dengeTotal + suitableTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        {onlineHint && (
          <div className={`text-[11px] leading-tight ${tamam ? 'text-emerald-600' : 'text-rose-600'}`}>
            {tamam ? (
              <span>✓ Kanal tablosu online alacak toplamı ile tutuyor</span>
            ) : (
              <span>
                Kanal tablosu online alacak toplamı: <b>{formatCurrency(kanalOnlineToplam)}</b> (fark {formatCurrency(fark)}){' '}
                {kanalOnlineToplam > 0 && markalar[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      // Fark ilk markanın Suitable online KK'sına eklenir; toplam kanal toplamına eşitlenir
                      const id = markalar[0].id;
                      setCell(id, 'suitable', 'onlineKrediKarti', num(pm[id]?.suitable?.onlineKrediKarti) + fark);
                    }}
                    className="underline font-bold text-blue-700 hover:text-blue-900"
                  >
                    Toplamı uygula
                  </button>
                )}
              </span>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
