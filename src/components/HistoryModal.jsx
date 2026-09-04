import React, { useState, useEffect } from 'react';
import { X, Calendar, Search, ArrowRight, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function HistoryModal({ isOpen, onClose, onSelectDate, currentDate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = reports.filter((r) => r.date.includes(searchTerm));

  const formatDateDisplay = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('tr-TR', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs screen-only">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Geçmiş Kasa Raporları</h2>
              <p className="text-xs text-slate-500">Tüm kayıtlı gün sonu mutabakatları</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Arama */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Tarih ara (Örn: 2026-09 veya 2026)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Raporlar yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Kayıtlı rapor bulunamadı.</div>
          ) : (
            filtered.map((r) => {
              const isSelected = r.date === currentDate;
              const isOk = (r.kasa_farki || 0) === 0;
              return (
                <div
                  key={r.date}
                  onClick={() => {
                    onSelectDate(r.date);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-900 block">{r.date}</span>
                      <span className="text-xs text-slate-500">{formatDateDisplay(r.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Toplam Satış</span>
                      <span className="text-xs font-bold text-slate-800">{formatCurrency(r.toplam_satis || 0)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Fiziki Kasa</span>
                      <span className="text-xs font-bold text-emerald-700">{formatCurrency(r.fiziki_kasa || 0)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Kasa Durumu</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-block ${
                          isOk
                            ? 'bg-emerald-100 text-emerald-800'
                            : (r.kasa_farki || 0) < 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isOk ? '✓ Tam' : formatCurrency(r.kasa_farki || 0)}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
