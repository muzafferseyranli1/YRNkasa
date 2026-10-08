import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import NavigationBar from './components/NavigationBar';
import KasaDevirSection from './components/KasaDevirSection';
import PosSalesSection from './components/PosSalesSection';
import ZReportsSection from './components/ZReportsSection';
import ExpensesSection from './components/ExpensesSection';
import CourierSection from './components/CourierSection';
import TipSection from './components/TipSection';
import FizikiKasaSection from './components/FizikiKasaSection';
import SummaryCards from './components/SummaryCards';
import KanalCiroSection from './components/KanalCiroSection';
import BankaGunSonuSection from './components/BankaGunSonuSection';
import ThermalReceipt from './components/ThermalReceipt';
import HistoryModal from './components/HistoryModal';
import CourierReportsView from './components/reports/CourierReportsView';
import TipReportsView from './components/reports/TipReportsView';
import ArchiveReportsView from './components/reports/ArchiveReportsView';
import { calculateReportMetrics, getDefaultReportData, normalizeReportData } from './utils/calculations';
import { apiFetch } from './utils/api';

export default function App() {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [activeTab, setActiveTab] = useState('entry'); // 'entry' | 'courier_report' | 'tip_report' | 'archive'
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
      const res = await apiFetch(`/api/reports/${dateToLoad}`);
      const json = await res.json();
      if (json.success) {
        setData(normalizeReportData(json.report.data));
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
      const res = await apiFetch(`/api/reports/${selectedDate}`, {
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
    <div className="min-h-screen bg-slate-100 flex flex-col pb-16 md:pb-6">
      <Toaster position="top-right" />

      {/* Screen Header */}
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

      {/* Top / Bottom Navigation Bar */}
      <NavigationBar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 screen-only">
        {/* Tab 1: Kasa Girişi */}
        {activeTab === 'entry' && (
          isLoading ? (
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

              {/* 3b. Marka / Kanal Kırılımlı Ciro (kağıt form) */}
              <KanalCiroSection
                kanalCiro={data.kanalCiro}
                toplamSatis={metrics?.toplamSatis || 0}
                onChange={(newKanal) => updateData({ kanalCiro: newKanal })}
              />

              {/* 4. Z Bilgileri (POS Cihazları & Yemek Kartları) */}
              <ZReportsSection
                zBilgileri={data.zBilgileri}
                bankalar={data.bankaGunSonu || []}
                onChange={(newZ) => updateData({ zBilgileri: newZ })}
              />

              {/* 4b. Banka Gün Sonu Raporları (Z kredi kartı ile karşılaştırma) */}
              <BankaGunSonuSection
                bankalar={data.bankaGunSonu || []}
                metrics={metrics}
                onChange={(newBankalar) => updateData({ bankaGunSonu: newBankalar })}
              />

              {/* 5. Harcamalar & Kasa Çıkışları */}
              <ExpensesSection
                harcamalar={data.harcamalar}
                onChange={(newHarcamalar) => updateData({ harcamalar: newHarcamalar })}
              />

              {/* 6. Kurye Paket / Adisyon Ödemeleri */}
              <CourierSection
                kuryeOdemeleri={data.kuryeOdemeleri || []}
                onChange={(newKurye) => updateData({ kuryeOdemeleri: newKurye })}
              />

              {/* 7. Kredi Kartı Bahşiş (Tip) & Nakit Ödeme */}
              <TipSection
                tipOdemeleri={data.tipOdemeleri || []}
                onChange={(newTips) => updateData({ tipOdemeleri: newTips })}
              />

              {/* 8. Gün Sonu Fiziki Kasa Sayımı & Devir Uyarısı */}
              <FizikiKasaSection
                fizikiKasa={data.fizikiKasa}
                hesaplananNakit={metrics?.hesaplananNakit || 0}
                onChange={(newVal) => updateData({ fizikiKasa: newVal })}
              />
            </div>
          )
        )}

        {/* Tab 2: Kurye Raporları */}
        {activeTab === 'courier_report' && <CourierReportsView />}

        {/* Tab 3: Bahşiş / Tip Raporları */}
        {activeTab === 'tip_report' && <TipReportsView />}

        {/* Tab 4: Geçmiş Kasa Arşivi */}
        {activeTab === 'archive' && (
          <ArchiveReportsView
            onSelectDate={(dt) => {
              setSelectedDate(dt);
              setActiveTab('entry');
            }}
          />
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

