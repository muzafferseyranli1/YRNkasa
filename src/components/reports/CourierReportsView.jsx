import React, { useState, useEffect } from 'react';
import { Bike, Calendar, Search, Download, Printer, RefreshCw, PackageCheck, Banknote, User } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/calculations';
import { apiFetch } from '../../utils/api';

export default function CourierReportsView() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [courierFilter, setCourierFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({ summary: { totalOrders: 0, totalAmount: 0, byCourier: [] }, records: [] });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (courierFilter) params.append('courier', courierFilter);

      const res = await apiFetch(`/api/reports/analytics/couriers?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json);
      }
    } catch (err) {
      console.error('Failed to fetch courier reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, courierFilter]);

  const handleQuickDate = (type) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'all') {
      setStartDate('2025-01-01');
      setEndDate(todayStr);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Kurye Paket & Hakediş Raporu</h2>
              <p className="text-xs text-slate-500">Tarih aralığı ve kurye bazlı teslimat ve ödeme analizleri</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF</span>
            </button>
          </div>
        </div>

        {/* Date Filter & Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kurye Ara</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tüm Kuryeler veya İsim..."
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <button
              onClick={() => handleQuickDate('today')}
              className="flex-1 py-2 px-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
            >
              Bugün
            </button>
            <button
              onClick={() => handleQuickDate('week')}
              className="flex-1 py-2 px-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
            >
              Son 7 Gün
            </button>
            <button
              onClick={() => handleQuickDate('month')}
              className="flex-1 py-2 px-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
            >
              Bu Ay
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Toplam Teslimat / Sipariş</span>
            <PackageCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {formatNumber(reportData.summary?.totalOrders || 0)} <span className="text-sm font-normal text-slate-500">adet</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Seçilen dönemdeki adisyon toplamı</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Toplam Ödenen Hakediş</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {formatCurrency(reportData.summary?.totalAmount || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Kasadan çıkan nakit ödeme toplamı</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Aktif Kurye Sayısı</span>
            <User className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {reportData.summary?.byCourier?.length || 0} <span className="text-sm font-normal text-slate-500">kurye</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Ödeme yapılan farklı kurye sayısı</p>
        </div>
      </div>

      {/* Kurye Dağılım Özeti */}
      {reportData.summary?.byCourier && reportData.summary.byCourier.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Kurye Bazında Toplam Dağılım</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reportData.summary.byCourier.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    {item.courierName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{item.courierName}</h4>
                    <p className="text-[11px] text-slate-500">{item.totalOrders} Sipariş ({item.count} Gün)</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-700 text-xs block">
                    {formatCurrency(item.totalAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Ort. {(item.totalAmount / (item.totalOrders || 1)).toFixed(1)} ₺/sip
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Tüm Ödeme Kayıtları ({reportData.records?.length || 0})</h3>
        {reportData.records?.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Bike className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Seçilen kriterlere uygun kurye ödeme kaydı bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                  <th className="py-2.5 px-3 font-medium">Tarih</th>
                  <th className="py-2.5 px-3 font-medium">Kurye Adı</th>
                  <th className="py-2.5 px-3 font-medium text-center">Sipariş Sayısı</th>
                  <th className="py-2.5 px-3 font-medium text-center">Birim Ücret</th>
                  <th className="py-2.5 px-3 font-medium text-right">Ödenen Tutar</th>
                  <th className="py-2.5 px-3 font-medium">Açıklama / Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3 font-medium text-slate-700">{r.date}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{r.courier_name}</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-700">{r.order_count}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{r.unit_price} ₺</td>
                    <td className="py-2 px-3 text-right font-bold text-amber-700">{formatCurrency(r.total_amount)}</td>
                    <td className="py-2 px-3 text-slate-500">{r.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
