import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2, Sparkles, AlertCircle, FileText, ChevronDown, ChevronUp, Store, ShoppingBag } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { parseReceiptText } from '../utils/ocrParser';
import { formatCurrency } from '../utils/calculations';
import { preprocessImageForOcr } from '../utils/imagePreprocess';

export default function ScanReceiptModal({ isOpen, onClose, onApply, mode = 'pos', title = 'Fiş / Rapor Tara' }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [selectedFields, setSelectedFields] = useState({});
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setParsedData(null);
    setIsProcessing(true);
    setProgressText('Görsel optimize ediliyor...');

    try {
      let rawRecognizedText = '';

      // Check if running on Android with Native Google ML Kit OCR
      const NativeOcr = window.Capacitor?.Plugins?.NativeOcr;
      if (NativeOcr) {
        setProgressText('Google ML Kit ile taranıyor...');
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onload = (re) => resolve(re.target.result);
          reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;
        const res = await NativeOcr.recognizeText({ base64: base64Data });
        rawRecognizedText = res.text || '';
      } else {
        // Web fallback: Preprocess image on canvas + Tesseract OCR
        const preprocessedBlob = await preprocessImageForOcr(file);
        setProgressText('Karakterler ve rakamlar taranıyor (OCR)...');
        const worker = await createWorker('tur+eng');
        const ret = await worker.recognize(preprocessedBlob);
        await worker.terminate();
        rawRecognizedText = ret.data.text || '';
      }

      setProgressText('Mali alanlar ve tutarlar ayrıştırılıyor...');
      const extracted = parseReceiptText(rawRecognizedText, mode);
      setParsedData(extracted);

      // Pre-select detected values according to mode
      const defaults = {};
      if (mode === 'denge') {
        defaults.nakit = extracted.nakit || 0;
        defaults.krediKarti = extracted.krediKarti || 0;
        defaults.cari = extracted.cari || 0;
        defaults.sodexho = extracted.sodexho || 0;
        defaults.multinet = extracted.multinet || 0;
        defaults.ticket = extracted.ticket || 0;
        defaults.setcard = extracted.setcard || 0;
      } else if (mode === 'suitable') {
        defaults.nakit = extracted.nakit || 0;
        defaults.krediKarti = extracted.krediKarti || 0;
        defaults.onlineKrediKarti = extracted.onlineKrediKarti || 0;
        defaults.sodexho = extracted.sodexho || 0;
        defaults.multinet = extracted.multinet || 0;
        defaults.ticket = extracted.ticket || 0;
        defaults.setcard = extracted.setcard || 0;
        defaults.paketSiparisSayisi = extracted.paketSiparisSayisi || 0;
      } else if (mode === 'pos') {
        if (extracted.nakit > 0) defaults.nakit = extracted.nakit;
        if (extracted.krediKarti > 0) defaults.krediKarti = extracted.krediKarti;
        if (extracted.yemekKartiToplam > 0) defaults.yemekKarti = extracted.yemekKartiToplam;
        if (extracted.sodexho > 0) defaults.sodexho = extracted.sodexho;
        if (extracted.multinet > 0) defaults.multinet = extracted.multinet;
        if (extracted.ticket > 0) defaults.ticket = extracted.ticket;
        if (extracted.setcard > 0) defaults.setcard = extracted.setcard;
      } else if (mode === 'expense') {
        defaults.title = extracted.merchantName || 'Gider Fişi';
        defaults.tutar = extracted.genelToplam || extracted.nakit || 0;
      }
      setSelectedFields(defaults);
    } catch (err) {
      console.error('OCR Error:', err);
      alert('Görsel okunurken bir hata oluştu: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(selectedFields, imagePreview);
    }
    handleClose();
  };

  const handleClose = () => {
    setImagePreview(null);
    setParsedData(null);
    setSelectedFields({});
    setShowRawText(false);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs screen-only">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${mode === 'suitable' ? 'bg-blue-100 text-blue-700' : mode === 'denge' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
              {mode === 'suitable' ? <ShoppingBag className="w-5 h-5" /> : mode === 'denge' ? <Store className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">
                {mode === 'denge' && 'Sistem Satış Balans Raporu (ÖDEME dökümü)'}
                {mode === 'suitable' && 'Suitable POS Günlük Satış Raporu (Genel Ödeme Yöntemleri)'}
                {mode === 'pos' && 'ÖKC POS Z Raporu / Gün Sonu'}
                {mode === 'expense' && 'Masraf ve Fatura Fişi'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!imagePreview ? (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Fotoğraf Çek veya Rapor Görseli Seç
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {mode === 'denge' && 'DengePOS Sistem Satış Balans fişini kameraya tutun, Ödeme kalemleri otomatik doldurulsun.'}
                    {mode === 'suitable' && 'Suitable POS Günlük Satış Raporu fişini kameraya tutun, Genel Ödeme Yöntemleri ve Sipariş Sayısı otomatik okunsun.'}
                    {mode === 'pos' && 'POS Z raporunu kameraya tutun, Nakit ve Kredi Kartı rakamları otomatik dolsun.'}
                    {mode === 'expense' && 'Masraf fişini kameraya tutun, tutar ve firma bilgisi aktarılsın.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Kamerayı Aç / Fiş Seç
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image & Status Row */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={imagePreview}
                  alt="Taranan Fiş"
                  className="h-28 w-28 object-cover rounded-lg border border-slate-300 shadow-xs"
                />
                <div className="flex-1 text-center sm:text-left">
                  {isProcessing ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center sm:justify-start space-x-2 text-blue-600 font-bold text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{progressText}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full w-2/3 animate-pulse"></div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-1.5 text-emerald-600 font-bold text-xs">
                        <Sparkles className="w-4 h-4" />
                        <span>Rapor / Fiş Başarıyla Okundu</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ayrıştırılan değerleri kontrol edip formu tek tıkla doldurabilirsiniz.
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:underline inline-block"
                      >
                        Yeniden Fotoğraf Çek
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsed Fields Preview & Confirmation */}
              {parsedData && !isProcessing && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tespit Edilen Değerler (Düzenlenebilir)
                  </h3>

                  {/* DENGE POS FIELD GRID */}
                  {mode === 'denge' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nakit</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.nakit ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, nakit: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kredi Kartı</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.krediKarti ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, krediKarti: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cari</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.cari ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, cari: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sodexho</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.sodexho ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, sodexho: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Multinet</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.multinet ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, multinet: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ticket</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.ticket ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, ticket: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Setcard</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.setcard ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, setcard: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  {/* SUITABLE POS FIELD GRID */}
                  {mode === 'suitable' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nakit</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.nakit ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, nakit: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kredi Kartı</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.krediKarti ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, krediKarti: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-200">
                        <label className="block text-[11px] font-bold text-blue-800 mb-1">Online Kredi Kartı</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.onlineKrediKarti ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, onlineKrediKarti: Number(e.target.value) || 0 })}
                          className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-bold text-blue-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sodexho</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.sodexho ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, sodexho: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Multinet</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.multinet ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, multinet: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ticket</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.ticket ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, ticket: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Setcard</label>
                        <input
                          type="number"
                          step="any"
                          value={selectedFields.setcard ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, setcard: Number(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-200">
                        <label className="block text-[11px] font-bold text-amber-800 mb-1">Paket Sipariş Sayısı</label>
                        <input
                          type="number"
                          step="1"
                          value={selectedFields.paketSiparisSayisi ?? 0}
                          onChange={(e) => setSelectedFields({ ...selectedFields, paketSiparisSayisi: Number(e.target.value) || 0 })}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* POS Z FIELD GRID */}
                  {mode === 'pos' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">Nakit Fişi</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="number"
                            step="any"
                            value={selectedFields.nakit ?? 0}
                            onChange={(e) =>
                              setSelectedFields({ ...selectedFields, nakit: Number(e.target.value) || 0 })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                          />
                          <span className="text-xs text-slate-400 font-medium">₺</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">Kredi Kartı Z</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="number"
                            step="any"
                            value={selectedFields.krediKarti ?? 0}
                            onChange={(e) =>
                              setSelectedFields({ ...selectedFields, krediKarti: Number(e.target.value) || 0 })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                          />
                          <span className="text-xs text-slate-400 font-medium">₺</span>
                        </div>
                      </div>

                      {(parsedData.yemekKartiToplam > 0 || parsedData.sodexho > 0 || parsedData.multinet > 0) && (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col justify-between col-span-1 sm:col-span-2">
                          <span className="text-[11px] font-semibold text-amber-700">Yemek Kartı / Diğer Z</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <input
                              type="number"
                              step="any"
                              value={selectedFields.yemekKarti ?? parsedData.yemekKartiToplam ?? 0}
                              onChange={(e) =>
                                setSelectedFields({ ...selectedFields, yemekKarti: Number(e.target.value) || 0 })
                              }
                              className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                            />
                            <span className="text-xs text-amber-600 font-medium">₺</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EXPENSE FIELD GRID */}
                  {mode === 'expense' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Gider / Firma Adı
                        </label>
                        <input
                          type="text"
                          value={selectedFields.title || ''}
                          onChange={(e) =>
                            setSelectedFields({ ...selectedFields, title: e.target.value })
                          }
                          placeholder="Örn: Petrol Ofisi, Market vb."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Toplam Fiş Tutarı
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            value={selectedFields.tutar ?? 0}
                            onChange={(e) =>
                              setSelectedFields({ ...selectedFields, tutar: Number(e.target.value) || 0 })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-rose-700 focus:bg-white outline-none"
                          />
                          <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">₺</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Okunan Ham OCR Metni */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRawText(!showRawText)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{showRawText ? 'Ham OCR Metnini Gizle' : 'Taranan Metni İncele'}</span>
                      {showRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showRawText && (
                      <pre className="mt-2 p-2.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto border border-slate-200">
                        {parsedData.rawText}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleApply}
            disabled={!parsedData || isProcessing}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-200"
          >
            <Check className="w-4 h-4" />
            <span>Bilgileri Forma Aktar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
