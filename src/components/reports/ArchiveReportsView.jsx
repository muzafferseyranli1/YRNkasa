import React, { useState, useEffect } from 'react';
import { Calendar, Search, RefreshCw, Eye, Printer, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

export default function ArchiveReportsView({ onSelectDate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const json = await res.json();
      if (json.success) {
        setReports(json.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch archive reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, []);

  const filteredReports = reports.filter((r) =>
    r.date?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Geçmiş Günlük Kasa Arşivi</h2>
              <p className="text-xs text-slate-500">Kayıtlı tüm günlerin ciro, devir, hesaplanan kasa ve fark özetleri</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchArchive}
              disabled={loading}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Tarihe göre ara (Örn: 2026-09)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
            <p className="text-xs">Kayıtlar yükleniyor...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Henüz kaydedilmiş geçmiş kasa raporu bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                  <th className="py-2.5 px-3 font-medium">Tarih</th>
                  <th className="py-2.5 px-3 font-medium text-right">Devir (₺)</th>
                  <th className="py-2.5 px-3 font-medium text-right">Toplam Satış (₺)</th>
                  <th className="py-2.5 px-3 font-medium text-right">Hesaplanan Kasa (₺)</th>
                  <th className="py-2.5 px-3 font-medium text-right">Fiziki Kasa (₺)</th>
                  <th className="py-2.5 px-3 font-medium text-center">Kasa Farkı</th>
                  <th className="py-2.5 px-3 font-medium text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((r) => {
                  const fark = Number(r.kasa_farki) || 0;
                  const isBalanced = Math.abs(fark) < 0.01;
                  const isPositive = fark > 0;

                  return (
                    <tr key={r.date} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{r.date}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(r.devir)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{formatCurrency(r.toplam_satis)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(r.hesaplanan_nakit)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(r.fiziki_kasa)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {isBalanced ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Dengede
                          </span>
                        ) : isPositive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            +{formatCurrency(fark)} Fazla
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            {formatCurrency(fark)} Açık
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onSelectDate && onSelectDate(r.date)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                          title="Görüntüle / Düzenle"
                        >
                          <span>Aç</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
