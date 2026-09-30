import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import KasaDevirSection from './components/KasaDevirSection';
import PosSalesSection from './components/PosSalesSection';
import ZReportsSection from './components/ZReportsSection';
import ExpensesSection from './components/ExpensesSection';
import FizikiKasaSection from './components/FizikiKasaSection';
import SummaryCards from './components/SummaryCards';
import ThermalReceipt from './components/ThermalReceipt';
import HistoryModal from './components/HistoryModal';
import { calculateReportMetrics, getDefaultReportData } from './utils/calculations';

export default function App() {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [data, setData] = useState(null);
  const [reportExists, setReportExists] = useState(false);
  const [suggestedDevir, setSuggestedDevir] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Fetch report for selected date
  const loadReport = useCallback(async (dateToLoad) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/${dateToLoad}`);
      const json = await res.json();
      if (json.success) {
        setData(json.report.data);
        setReportExists(json.exists);
        setSuggestedDevir(json.suggestedDevir || 0);
        setHasUnsavedChanges(false);

        if (!json.exists && json.suggestedDevir > 0) {
          toast.success(
            `Önceki günden devir (${json.suggestedDevir.toLocaleString('tr-TR')} ₺) aktarıldı.`,
            { id: 'devir-toast', icon: 'ℹ️' }
          );
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      toast.error('Rapor yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate, loadReport]);

  // Realtime calculated metrics
  const metrics = useMemo(() => {
    if (!data) return null;
    return calculateReportMetrics(data);
  }, [data]);

  // Save report
  const handleSave = async () => {
    if (!data || !metrics) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/reports/${selectedDate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          metrics: {
            toplamSatis: metrics.toplamSatis,
            hesaplananNakit: metrics.hesaplananNakit,
            kasaFarki: metrics.kasaFarki,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setHasUnsavedChanges(false);
        setReportExists(true);
        toast.success(`${selectedDate} tarihli rapor kaydedildi.`);
      } else {
        toast.error('Kaydetme başarısız: ' + json.error);
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Bağlantı hatası, kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generic data mutator with dirty flag
  const updateData = (updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Toaster position="top-right" />

      {/* Screen View */}
      <Header
        selectedDate={selectedDate}
        onDateChange={(newDate) => {
          if (hasUnsavedChanges) {
            if (window.confirm('Kaydedilmemiş değişiklikler var. Tarihi değiştirmek istiyor musunuz?')) {
              setSelectedDate(newDate);
            }
          } else {
            setSelectedDate(newDate);
          }
        }}
        onSave={handleSave}
        onPrint={handlePrint}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        reportExists={reportExists}
        suggestedDevir={suggestedDevir}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 screen-only">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-semibold text-slate-500">Rapor verileri yükleniyor...</p>
            </div>
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-500">Veri bulunamadı.</div>
        ) : (
          <div className="space-y-6">
            {/* 1. Özet & Mutabakat Kartları */}
            <SummaryCards metrics={metrics} />

            {/* 2. Kasa Devir & Girişler */}
            <KasaDevirSection
              data={data.kasaGiris}
              onChange={(newGiris) => updateData({ kasaGiris: newGiris })}
            />

            {/* 3. POS Satışları (DengePOS & Suitable POS) */}
            <PosSalesSection
              dengePos={data.dengePos}
              suitablePos={data.suitablePos}
              onChangeDenge={(newDenge) => updateData({ dengePos: newDenge })}
              onChangeSuitable={(newSuitable) => updateData({ suitablePos: newSuitable })}
            />

            {/* 4. Z Bilgileri (POS Cihazları & Yemek Kartları) */}
            <ZReportsSection
              zBilgileri={data.zBilgileri}
              onChange={(newZ) => updateData({ zBilgileri: newZ })}
            />

            {/* 5. Harcamalar & Kasa Çıkışları */}
            <ExpensesSection
              harcamalar={data.harcamalar}
              onChange={(newHarcamalar) => updateData({ harcamalar: newHarcamalar })}
            />

            {/* 6. Gün Sonu Fiziki Kasa Sayımı & Devir Uyarısı */}
            <FizikiKasaSection
              fizikiKasa={data.fizikiKasa}
              hesaplananNakit={metrics?.hesaplananNakit || 0}
              onChange={(newVal) => updateData({ fizikiKasa: newVal })}
            />
          </div>
        )}
      </main>

      {/* 80mm Termal Adisyon Yazıcı Çıktısı (Yalnızca Print anında yazdırılır) */}
      {data && metrics && (
        <ThermalReceipt date={selectedDate} data={data} metrics={metrics} />
      )}

      {/* Geçmiş Raporlar Modalı */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectDate={(dt) => setSelectedDate(dt)}
        currentDate={selectedDate}
      />
    </div>
  );
}
