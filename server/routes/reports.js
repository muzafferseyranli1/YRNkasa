import express from 'express';
import db from '../db.js';

const router = express.Router();

// Default empty template matching kasa.xlsx structure
export const getDefaultReportData = (devir = 0) => ({
  kasaGiris: {
    devir: Number(devir) || 0,
    kasayaParaKondu: 0,
  },
  dengePos: {
    nakit: 0,
    krediKarti: 0,
    sodexho: 0,
    multinet: 0,
    ticket: 0,
    setcard: 0,
    cari: 0,
  },
  suitablePos: {
    nakit: 0,
    krediKarti: 0,
    onlineKrediKarti: 0,
    sodexho: 0,
    multinet: 0,
    ticket: 0,
    setcard: 0,
    paketSiparisSayisi: 0,
  },
  paneller: [
    { id: 'yemeksepeti', name: 'Yemeksepeti', satis: 0, siparisSayisi: 0 },
    { id: 'trendyol', name: 'Trendyol', satis: 0, siparisSayisi: 0 },
    { id: 'getir', name: 'Getir', satis: 0, siparisSayisi: 0 },
    { id: 'migros', name: 'Migros', satis: 0, siparisSayisi: 0 },
    { id: 'fuudy', name: 'Fuudy', satis: 0, siparisSayisi: 0 },
    { id: 'suitable', name: 'Suitable', satis: 0, siparisSayisi: 0 },
    { id: 'tiklagelsin', name: 'Tıklagelsin', satis: 0, siparisSayisi: 0 },
  ],
  zBilgileri: {
    posCihazlari: [
      { id: 'pos_1', name: '2C 56552419', nakit: 0, krediKarti: 0 },
      { id: 'pos_2', name: '2C 56553624', nakit: 0, krediKarti: 0 },
      { id: 'pos_3', name: '2D 10027701', nakit: 0, krediKarti: 0 },
      { id: 'pos_4', name: 'JH 20088220', nakit: 0, krediKarti: 0 },
    ],
    sodexho: 0,
    multinet: 0,
    ticket: 0,
    setcard: 0,
  },
  harcamalar: [
    { id: 'h_1', title: 'Nakit Çıkışı', tutar: 0, aciklama: 'bankaya yatırıldı' },
    { id: 'h_2', title: 'Yakıt Alımı', tutar: 0, aciklama: '' },
    { id: 'h_3', title: 'Market Alışverişi', tutar: 0, aciklama: '' },
    { id: 'h_4', title: 'Hammadde Alımı', tutar: 0, aciklama: '' },
  ],
  fizikiKasa: 0,
  notlar: '',
});

// List all reports
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT date, devir, fiziki_kasa, toplam_satis, hesaplanan_nakit, kasa_farki, updated_at 
      FROM daily_reports 
      ORDER BY date DESC
    `);
    const reports = stmt.all();
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get previous day's physical count to rollover
router.get('/:date/previous-balance', (req, res) => {
  try {
    const { date } = req.params;
    const stmt = db.prepare(`
      SELECT date, fiziki_kasa 
      FROM daily_reports 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT 1
    `);
    const prev = stmt.get(date);
    res.json({
      success: true,
      hasPrevious: !!prev,
      previousDate: prev?.date || null,
      previousFizikiKasa: prev?.fiziki_kasa ?? 0,
    });
  } catch (error) {
    console.error('Error getting previous balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get report by date
router.get('/:date', (req, res) => {
  try {
    const { date } = req.params;
    const stmt = db.prepare('SELECT * FROM daily_reports WHERE date = ?');
    const report = stmt.get(date);

    if (report) {
      let parsedData;
      try {
        parsedData = JSON.parse(report.data);
      } catch (e) {
        parsedData = getDefaultReportData(report.devir);
      }
      return res.json({
        success: true,
        exists: true,
        report: {
          date: report.date,
          data: parsedData,
          devir: report.devir,
          fiziki_kasa: report.fiziki_kasa,
          toplam_satis: report.toplam_satis,
          hesaplanan_nakit: report.hesaplanan_nakit,
          kasa_farki: report.kasa_farki,
          updated_at: report.updated_at,
        },
      });
    }

    // If report does not exist for this date, find previous day's physical cash count as default devir
    const prevStmt = db.prepare(`
      SELECT date, fiziki_kasa 
      FROM daily_reports 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT 1
    `);
    const prev = prevStmt.get(date);
    const suggestedDevir = prev ? prev.fiziki_kasa : 0;

    return res.json({
      success: true,
      exists: false,
      suggestedDevir,
      previousDate: prev?.date || null,
      report: {
        date,
        data: getDefaultReportData(suggestedDevir),
        devir: suggestedDevir,
        fiziki_kasa: 0,
        toplam_satis: 0,
        hesaplanan_nakit: 0,
        kasa_farki: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save or update report for a date
router.post('/:date', (req, res) => {
  try {
    const { date } = req.params;
    const { data, metrics } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: 'Data payload is required' });
    }

    const devir = Number(data.kasaGiris?.devir) || 0;
    const fiziki_kasa = Number(data.fizikiKasa) || 0;
    const toplam_satis = Number(metrics?.toplamSatis) || 0;
    const hesaplanan_nakit = Number(metrics?.hesaplananNakit) || 0;
    const kasa_farki = Number(metrics?.kasaFarki) || 0;

    const dataJson = JSON.stringify(data);

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

    stmt.run(date, dataJson, devir, fiziki_kasa, toplam_satis, hesaplanan_nakit, kasa_farki);

    res.json({
      success: true,
      message: 'Rapor başarıyla kaydedildi.',
      date,
    });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete report
router.delete('/:date', (req, res) => {
  try {
    const { date } = req.params;
    const stmt = db.prepare('DELETE FROM daily_reports WHERE date = ?');
    const result = stmt.run(date);
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
