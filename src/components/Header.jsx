import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Printer, History, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Header({
  selectedDate,
  onDateChange,
  onSave,
  onPrint,
  onOpenA4,
  onOpenHistory,
  isSaving,
  hasUnsavedChanges,
  lastSavedTime,
  reportExists,
  suggestedDevir,
}) {
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onDateChange(today);
  };

  const formatDateDisplay = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm screen-only">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Logo & Başlık */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-200">
              YRN
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                Kasa & Gün Sonu Mutabakatı
              </h1>
              <p className="text-xs text-slate-500">
                {formatDateDisplay(selectedDate)}
              </p>
            </div>
          </div>

          {/* Tarih Navigasyonu */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              onClick={handlePrevDay}
              title="Önceki Gün"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-xs">
              <Calendar className="w-4 h-4 text-blue-600 mr-2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-sm font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              title="Sonraki Gün"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 bg-white border border-blue-200 rounded-lg transition-colors"
            >
              Bugün
            </button>
          </div>

          {/* Eylem Butonları */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenHistory}
              className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Geçmiş Raporlar"
            >
              <History className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Geçmiş</span>
            </button>

            <button
              onClick={onOpenA4}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-xl transition-colors shadow-xs"
              title="A4 tek sayfa gün sonu raporu (grafikli)"
            >
              <Printer className="w-4 h-4 text-indigo-800" />
              <span>A4 Rapor</span>
            </button>

            <button
              onClick={onPrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-slate-800 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl transition-colors shadow-xs"
              title="80mm Termal Adisyon Yazıcısına Gönder"
            >
              <Printer className="w-4 h-4 text-amber-800" />
              <span>Adisyon Yazdır (80mm)</span>
            </button>

            <button
              onClick={onSave}
              disabled={isSaving}
              className={`flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl transition-all shadow-md ${
                hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kaydedildi</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Kayıt durumu ve Devir Bilgilendirme Çubuğu */}
        {!reportExists && suggestedDevir > 0 && (
          <div className="mb-2 py-1.5 px-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-between">
            <span className="flex items-center">
              <span className="font-semibold mr-1">ℹ Otomatik Devir:</span> 
              Önceki günün kapanış fiziki kasa sayımı ({suggestedDevir.toLocaleString('tr-TR')} ₺) bugünün açılış devrine otomatik aktarıldı.
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
