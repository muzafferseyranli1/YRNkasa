# Geliştirme Notları (devam edilecek makine için)

Son oturum: 2026-10-09. Bu dosya, başka makinede kaldığın yerden devam etmek için yapılanları ve dikkat edilecekleri özetler.

## Kurulum / çalıştırma
```bash
git pull
npm install
npm run dev:all   # arayüz :5173, API :3000   (ya da: npm run build && npm start -> :3000)
```
- `data/` (SQLite) ve `.env` repoda yok; yeni makinede boş veritabanı oluşur. Gerçek kayıtlar gerekiyorsa `data/kasa.sqlite` ayrıca taşınmalı.
- `AUTH_PASSWORD` tanımlı değilse giriş kapalı çalışır.

## Bu oturumda yapılanlar

### 1. POS tablosu birleştirildi (DengePOS + Suitable)
- `src/components/PosSalesSection.jsx` tamamen yeniden yazıldı: tek "Ödeme Tipleri Dökümü" tablosu.
- Satırlar: Nakit, Kredi Kartı, Online Kredi Kartı, Cari, Sodexho, Multinet, Ticket, Setcard. Her satır hem Denge hem Suitable için girilebilir.
- Sütunlar: Pide / Tandır / Kıymalı (her biri Denge + Suitable) + Toplam bloğu (Denge | Suitable | Toplam).
- Veri modeli: marka kırılımı `data.posMarka = { [markaId]: { denge:{...}, suitable:{...} } }`. Hesaplarda kullanılan `dengePos` / `suitablePos` toplamları her değişiklikte `posMarka`'dan yeniden üretilir, bu yüzden `calculations.js`, fiş vb. değişmeden çalışır.
- Eski kayıtlarda `posMarka` yoksa mevcut toplamlar ilk markaya (Pide) taşınarak gösterilir.
- Denge online KK ve Suitable cari hesaplara eklendi (`calculations.js`): toplam satışa dahil; Denge online KK nakit fişi gerekene ve kanal online sağlamasına dahil.
- "Paket Sipariş Sayısı" alanı kaldırıldı.

### 2. Satış Kanalları Dökümü (eski "Marka / Kanal Kırılımlı Ciro")
- Aynı çerçevede POS tablosunun altında; iki tablonun sütunları aynı `colgroup` ile hizalı (etiket + her marka + toplam eşit genişlik). Yatay kaydırma tek kapsayıcıda (`App.jsx`, min 1100px).
- "Restoran Ciro" -> "Salon" (eski kayıtlar da otomatik, `migrateKanalCiro`).
- Sütun başlığı "Online Alacak ₺" -> "Online ₺". Silme ikonu ayrı sütun değil, satır üstüne gelince görünür.

### 3. Sayı giriş alanları (`src/components/NumberInput.jsx`)
- Tüm tutar alanları sola dayalı, odakta değilken `1.000,00` (tr-TR). `step="1"` olanlar (adet) ondalıksız `1.000`. Kayıtlı veri değişmedi, sadece gösterim.
- Kanal tablosundaki Adet sütunları da sola dayalı.

### 4. Üst özet kartları (`SummaryCards.jsx`)
- "Hesaplanan Kasa" kartı kaldırıldı. "Toplam Satış" kartı 2 kart genişliğinde; içinde Toplam / Salon / Paket için Satış, Fiş Sayısı, Ortalama tablosu (kanal tablosundan; Salon fiş = kişi sayısı).

### 5. Kamera / OCR özellikleri kaldırıldı
- Silindi: `ScanReceiptModal.jsx`, `src/utils/ocrParser.js`, `imagePreprocess.js`, `scripts/testOcr.js`, `tesseract.js` bağımlılığı. POS, Harcamalar ve Z raporu bölümlerindeki "Fiş Tara" butonları gitti.
- Bilerek kalan: Harcamalardaki "Fiş Ekle" (fotoğraf yükleme, `/api/upload`). Mobil (Capacitor) daha önce kaldırılmıştı.

### 6. A4 tek sayfa gün sonu raporu (YENİ)
- `src/components/A4Report.jsx` + Header'da "A4 Rapor" butonu. Önizleme penceresinde "Yazdır / PDF".
- İçerik: KPI'lar, geçen haftanın aynı günüyle karşılaştırma (`/api/reports/:date-7`), son 14 gün seyri (`/api/reports` listesi), marka pastası, kanal dağılımı, ödeme tipi pastası, masraflar, kasa akışı ve mutabakat kutuları. Grafikler saf SVG.
- Yazdırma: `body.printing-a4` sınıfı + `@media print` kuralları `src/index.css` içinde; `@page A4` yazdırma anında enjekte edilir. Adisyon (80mm) çıktısının siyah-beyaz zorlaması artık sadece `.thermal-receipt-container` içinde.
- Henüz gerçek yazıcı/PDF çıktısı denenmedi; yazdırma önizlemesinde "Arka plan grafikleri" açık olmalı. Çok fazla gider kalemi girilirse sayfa dolabilir (altta ~80px pay var).

### 7. Banka gün sonu artık POS kartının içinde
- `ZReportsSection.jsx`: her POS cihazında 3 banka alanı (`device.banka = [b1,b2,b3]`). Banka toplamı o cihazın kredi kartı tutarına eşitse Kredi Kartı yanında yeşil check; değilse "Eksik/Fazla" uyarısı. Banka dropdown'u (`bankId`) kaldırıldı.
- `calculations.js`: `bankaDetay` / `bankaToplam` / `bankaFarki` cihaz bazlı hesaplanır (yalnızca banka girilen cihazlar). `data.bankaGunSonu` artık boş dizi; eski genel banka tutarları kayıt yüklenirken cihazlara taşınır (`migrateBankalar`) — gerçek eski kayıtla denenmedi.
- `BankaGunSonuSection.jsx`: sadece "Yemek Kartı Gün Sonu" (4 kart tek yatay satır, sistemle tutuyorsa yeşil).

## Açık / sonraki olası işler
- A4 raporu gerçek yazıcıda/PDF'te doğrula; gerekirse gider listesi çok uzadığında kırp.
- "Fiş Sayısı" için Salon'da kişi sayısı kullanılıyor; ayrı fiş sayısı alanı istenirse eklenmeli.
- Eski kayıtlardaki banka taşıma (`migrateBankalar`) ve `posMarka` taşıması için eski bir günü açıp kontrol et.
- Harcamalardaki "Fiş Ekle" (fotoğraf yükleme) kaldırılacaksa `/api/upload` da temizlenmeli.
