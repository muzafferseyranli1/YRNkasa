import db from '../server/db.js';
import { calculateReportMetrics } from '../src/utils/calculations.js';

// Seed data matching kasa.xlsx exactly
const excelSampleData = {
  kasaGiris: {
    devir: 10000,
    kasayaParaKondu: 5000,
  },
  dengePos: {
    nakit: 1745,
    krediKarti: 36701,
    sodexho: 1072.5,
    multinet: 3100,
    ticket: 1000,
    setcard: 1000,
    cari: 1000,
  },
  suitablePos: {
    nakit: 3000,
    krediKarti: 4000,
    onlineKrediKarti: 15000,
    sodexho: 2500,
    multinet: 3500,
    ticket: 4000,
    setcard: 2000,
    paketSiparisSayisi: 140,
  },
  paneller: [
    { id: 'yemeksepeti', name: 'Yemeksepeti', satis: 10000, siparisSayisi: 20 },
    { id: 'trendyol', name: 'Trendyol', satis: 10000, siparisSayisi: 20 },
    { id: 'getir', name: 'Getir', satis: 10000, siparisSayisi: 20 },
    { id: 'migros', name: 'Migros', satis: 10000, siparisSayisi: 20 },
    { id: 'fuudy', name: 'Fuudy', satis: 10000, siparisSayisi: 20 },
    { id: 'suitable', name: 'Suitable', satis: 10000, siparisSayisi: 20 },
    { id: 'tiklagelsin', name: 'Tıklagelsin', satis: 10000, siparisSayisi: 20 },
  ],
  zBilgileri: {
    posCihazlari: [
      { id: 'pos_1', name: '2C 56552419', nakit: 3000, krediKarti: 4000 },
      { id: 'pos_2', name: '2C 56553624', nakit: 3000, krediKarti: 4000 },
      { id: 'pos_3', name: '2D 10027701', nakit: 3000, krediKarti: 4000 },
      { id: 'pos_4', name: 'JH 20088220', nakit: 3000, krediKarti: 4000 },
    ],
    sodexho: 3000,
    multinet: 4000,
    ticket: 2000,
    setcard: 1000,
  },
  harcamalar: [
    { id: 'h_1', title: 'Nakit Çıkışı', tutar: 10000, aciklama: 'bankaya yatırıldı' },
    { id: 'h_2', title: 'Yakıt Alımı', tutar: 250, aciklama: '34 fe 3454' },
    { id: 'h_3', title: 'Market Alışverişi', tutar: 300, aciklama: 'bulgur alındı' },
    { id: 'h_4', title: 'Hammadde Alımı', tutar: 500, aciklama: 'su alındı' },
  ],
  fizikiKasa: 8600,
  notlar: 'Excel dosyasından aktarılan ilk mutabakat kaydı.',
};

const d = new Date();
const todayStr = d.toISOString().split('T')[0];

const metrics = calculateReportMetrics(excelSampleData);

const stmt = db.prepare(`
  INSERT INTO daily_reports (date, data, devir, fiziki_kasa, toplam_satis, hesaplanan_nakit, kasa_farki, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(date) DO UPDATE SET
    data = excluded.data,
    devir = excluded.devir,
    fiziki_kasa = excluded.fiziki_kasa,
    toplam_satis = excluded.toplam_satis,
    hesaplanan_nakit = excluded.hesaplanan_nakit,
    kasa_farki = excluded.kasa_farki,
    updated_at = CURRENT_TIMESTAMP
`);

stmt.run(
  todayStr,
  JSON.stringify(excelSampleData),
  excelSampleData.kasaGiris.devir,
  excelSampleData.fizikiKasa,
  metrics.toplamSatis,
  metrics.hesaplananNakit,
  metrics.kasaFarki
);

console.log(`[SEED] kasa.xlsx sample data successfully seeded for ${todayStr}`);
console.log('Metrics:');
console.log(`- Toplam Satış: ${metrics.toplamSatis} TL (Beklenen: 79618.5)`);
console.log(`- Hesaplanan Nakit: ${metrics.hesaplananNakit} TL (Beklenen: 8695)`);
console.log(`- Fiziki Kasa: ${metrics.fizikiSayim} TL (Beklenen: 8600)`);
console.log(`- Kasa Farkı: ${metrics.kasaFarki} TL (Beklenen: -95)`);
