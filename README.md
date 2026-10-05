# YRN Kasa - Günlük Kasa Kapanış & Mutabakat Web Uygulaması

`kasa.xlsx` Excel dosyasındaki tüm iş kurallarını, formülleri ve mutabakat mantığını web tabanlı modern bir sisteme dönüştüren tam kapsamlı kasa yönetim uygulaması.

---

## ✨ Özellikler

1. **Otomatik Kasa Devri:**
   - Her günün kapanışında girilen **Fiziki Kasa Sayımı**, bir sonraki günün raporu açıldığında otomatik olarak **Açılış Devri** olarak atanır.
2. **Gelişmiş Form Yapısı (`kasa.xlsx` Birebir Uyumlu):**
   - **Kasa Başlangıç & Giriş:** Devir ve gün içi kasaya konan nakit.
   - **DengePOS Satışları:** Nakit, Kredi Kartı, Sodexho, Multinet, Ticket, Setcard, Cari.
   - **Suitable POS (Paket/Online):** Nakit, Kredi Kartı, Online Kredi Kartı, Sodexho, Multinet, Ticket, Setcard ve Paket Sipariş Sayısı.
   - **Panel Bilgileri:** Yemeksepeti, Trendyol, Getir, Migros, Fuudy, Suitable, Tıklagelsin ciro ve sipariş adetleri (+ Dinamik platform ekleme).
   - **Z Raporu / Fiziki Çekimler:** POS cihazları (Nakit & KK fişleri, dinamik cihaz ekleme) ve Yemek Kartları fiziki Z toplamları.
   - **Harcamalar / Kasa Çıkışları:** Bankaya yatırılan, yakıt, market, hammadde alımları ve dinamik gider satırları.
   - **Gün Sonu Fiziki Kasa Sayımı:** Kasada gerçek sayılan nakit mevcudu.
3. **Anlık Mutabakat & Raporlama:**
   - Toplam Ciro / Satış Tutarı
   - Hesaplanan Kasa Nakit Tutarı
   - Kasa Farkı (Açık / Fazla rozeti ve TL farkı)
   - Nakit Fişi Mutabakatı (Gereken vs Kesilen Z)
   - Kredi Kartı Mutabakatı (Hesaplanan vs Fiziki POS Z)
   - Panel vs POS Ciro ve Sipariş Adet Karşılaştırması
   - Yemek Kartları Mutabakatı (Sodexho, Multinet, Ticket, Setcard)
4. **80mm (8cm) Termal Adisyon Yazıcı Çıktısı:**
   - Tek tıkla adisyon yazıcısına özel monospaced, yüksek kontrastlı, düzenli ve imzalı gün sonu mutabakat fişi basımı.
5. **Tarih Navigasyonu & Geçmiş:**
   - Takvimden geçmiş günleri seçebilme, önceki/sonraki gün butonları, geçmiş raporlar arşivi ve arama.

---

## 🚀 Coolify & VPS Kurulumu

Bu proje Coolify üzerinde tamamen bağımsız bir proje olarak çalışacak şekilde tasarlanmıştır.

### Coolify Adımları:
1. Coolify kontrol panelinde **New Project** -> **Application** oluşturun.
2. Kaynak olarak **Public/Private GitHub Repository** seçin:
   - **Repository:** `https://github.com/muzafferseyranli1/YRNkasa`
   - **Branch:** `main` (veya `master`)
   - **Build Pack:** `Dockerfile`
3. Port ayarı:
   - **Port:** `3000`
4. Persistent Storage (Kalıcı Depolama):
   - Veritabanının konteyner yeniden başlasa bile silinmemesi için Volume ekleyin:
   - **Mount Path:** `/app/data`
5. **Ortam değişkeni (parola):** Coolify'da `AUTH_PASSWORD` değişkenini tanımlayın. Tanımlı değilse giriş ekranı/doğrulama KAPALI çalışır. (İsteğe bağlı: `AUTH_SECRET` ile token imza anahtarı.)
6. **Deploy** butonuna basarak yayına alın!

---

## 💻 Yerel Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat (Frontend + API)
npm run dev:all

# Yalnızca Frontend (Port 5173)
npm run dev

# Yalnızca Backend (Port 3000)
npm run server

# Prodüksiyon derlemesi
npm run build
npm start
```
