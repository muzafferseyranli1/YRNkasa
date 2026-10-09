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
    { id: 'h_1', title: 'Nakit Çıkışı', tutar: 0, aciklama: 'bankaya yatırıldı', isKK: false, imageUrl: null },
    { id: 'h_2', title: 'Yakıt Alımı', tutar: 0, aciklama: '', isKK: false, imageUrl: null },
    { id: 'h_3', title: 'Market Alışverişi', tutar: 0, aciklama: '', isKK: false, imageUrl: null },
    { id: 'h_4', title: 'Hammadde Alımı', tutar: 0, aciklama: '', isKK: false, imageUrl: null },
  ],
  kuryeOdemeleri: [
    { id: 'k_1', kuryeAdi: 'Yılmaz', siparisSayisi: 0, birimFiyat: 20, toplamTutar: 0, aciklama: '' },
  ],
  tipOdemeleri: [
    { id: 't_1', personelAdi: '', cekilenTip: 0, kesintiOrani: 20, kesintiTutari: 0, netNakitTip: 0, aciklama: '' },
  ],
  fizikiKasa: 0,
  notlar: '',
});

// List all reports summary
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

// Autocomplete: distinct courier / staff names used before
router.get('/names/:kind', (req, res) => {
  try {
    const { kind } = req.params;
    const sql =
      kind === 'courier'
        ? 'SELECT courier_name AS name, COUNT(*) AS n FROM courier_payments GROUP BY courier_name ORDER BY n DESC, name'
        : kind === 'staff'
          ? 'SELECT staff_name AS name, COUNT(*) AS n FROM tip_payments GROUP BY staff_name ORDER BY n DESC, name'
          : null;
    if (!sql) return res.status(400).json({ success: false, error: 'Geçersiz tür' });
    const names = db.prepare(sql).all().map((r) => r.name).filter(Boolean);
    res.json({ success: true, names });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics: Courier Payments Report
router.get('/analytics/couriers', (req, res) => {
  try {
    const { startDate, endDate, courier } = req.query;
    let query = 'SELECT * FROM courier_payments WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    if (courier && courier.trim()) {
      query += ' AND courier_name LIKE ?';
      params.push(`%${courier.trim()}%`);
    }

    query += ' ORDER BY date DESC, id DESC';
    const records = db.prepare(query).all(...params);

    // Summary calculation
    const totalOrders = records.reduce((acc, r) => acc + (r.order_count || 0), 0);
    const totalAmount = records.reduce((acc, r) => acc + (r.total_amount || 0), 0);

    // Group by courier
    const byCourier = {};
    for (const r of records) {
      const name = r.courier_name || 'Bilinmeyen';
      if (!byCourier[name]) {
        byCourier[name] = { courierName: name, totalOrders: 0, totalAmount: 0, count: 0 };
      }
      byCourier[name].totalOrders += Number(r.order_count) || 0;
      byCourier[name].totalAmount += Number(r.total_amount) || 0;
      byCourier[name].count += 1;
    }

    res.json({
      success: true,
      summary: {
        totalOrders,
        totalAmount,
        recordCount: records.length,
        byCourier: Object.values(byCourier),
      },
      records,
    });
  } catch (error) {
    console.error('Error fetching courier analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics: Tip Payments Report
router.get('/analytics/tips', (req, res) => {
  try {
    const { startDate, endDate, staff } = req.query;
    let query = 'SELECT * FROM tip_payments WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    if (staff && staff.trim()) {
      query += ' AND staff_name LIKE ?';
      params.push(`%${staff.trim()}%`);
    }

    query += ' ORDER BY date DESC, id DESC';
    const records = db.prepare(query).all(...params);

    const totalCardTip = records.reduce((acc, r) => acc + (r.card_tip_amount || 0), 0);
    const totalDeduction = records.reduce((acc, r) => acc + (r.deduction_amount || 0), 0);
    const totalNetCash = records.reduce((acc, r) => acc + (r.net_cash_amount || 0), 0);

    // Group by staff
    const byStaff = {};
    for (const r of records) {
      const name = r.staff_name || 'Bilinmeyen';
      if (!byStaff[name]) {
        byStaff[name] = { staffName: name, totalCardTip: 0, totalDeduction: 0, totalNetCash: 0, count: 0 };
      }
      byStaff[name].totalCardTip += Number(r.card_tip_amount) || 0;
      byStaff[name].totalDeduction += Number(r.deduction_amount) || 0;
      byStaff[name].totalNetCash += Number(r.net_cash_amount) || 0;
      byStaff[name].count += 1;
    }

    res.json({
      success: true,
      summary: {
        totalCardTip,
        totalDeduction,
        totalNetCash,
        recordCount: records.length,
        byStaff: Object.values(byStaff),
      },
      records,
    });
  } catch (error) {
    console.error('Error fetching tip analytics:', error);
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
      // Önceki günün fiziki sayımı: kayıtlı günün devri bayatlamışsa istemci uyarır / günceller
      const prevOfExisting = db
        .prepare('SELECT date, fiziki_kasa FROM daily_reports WHERE date < ? ORDER BY date DESC LIMIT 1')
        .get(date);
      return res.json({
        success: true,
        exists: true,
        suggestedDevir: prevOfExisting ? prevOfExisting.fiziki_kasa : 0,
        previousDate: prevOfExisting?.date || null,
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

    // Save daily report
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

    // Sync Courier Payments
    const delCouriers = db.prepare('DELETE FROM courier_payments WHERE date = ?');
    delCouriers.run(date);

    const insertCourier = db.prepare(`
      INSERT INTO courier_payments (date, courier_name, order_count, unit_price, total_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const courierList = data.kuryeOdemeleri || [];
    for (const c of courierList) {
      if (c.courierName || c.kuryeAdi) {
        const name = (c.courierName || c.kuryeAdi || '').trim();
        const count = Number(c.orderCount ?? c.siparisSayisi) || 0;
        const unit = c.unitPrice !== undefined ? Number(c.unitPrice) : (c.birimFiyat !== undefined ? Number(c.birimFiyat) : 20);
        const total = c.totalAmount !== undefined && c.totalAmount !== '' ? Number(c.totalAmount) : (c.toplamTutar !== undefined && c.toplamTutar !== '' ? Number(c.toplamTutar) : (count * unit));
        const notes = c.notes || c.aciklama || '';
        if (name && (count > 0 || total > 0)) {
          insertCourier.run(date, name, count, unit, total, notes);
        }
      }
    }

    // Sync Tip Payments
    const delTips = db.prepare('DELETE FROM tip_payments WHERE date = ?');
    delTips.run(date);

    const insertTip = db.prepare(`
      INSERT INTO tip_payments (date, staff_name, card_tip_amount, commission_rate, deduction_amount, net_cash_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const tipList = data.tipOdemeleri || [];
    for (const t of tipList) {
      const name = (t.staffName || t.personelAdi || '').trim();
      const cardTip = Number(t.cardTipAmount ?? t.cekilenTip) || 0;
      const rate = t.commissionRate !== undefined ? Number(t.commissionRate) : (t.kesintiOrani !== undefined ? Number(t.kesintiOrani) : 20);
      const deduction = t.deductionAmount !== undefined && t.deductionAmount !== '' ? Number(t.deductionAmount) : (t.kesintiTutari !== undefined && t.kesintiTutari !== '' ? Number(t.kesintiTutari) : (cardTip * (rate / 100)));
      const netCash = t.netCashAmount !== undefined && t.netCashAmount !== '' ? Number(t.netCashAmount) : (t.netNakitTip !== undefined && t.netNakitTip !== '' ? Number(t.netNakitTip) : (cardTip - deduction));
      const notes = t.notes || t.aciklama || '';

      if (name && (cardTip > 0 || netCash > 0)) {
        insertTip.run(date, name, cardTip, rate, deduction, netCash, notes);
      }
    }

    res.json({
      success: true,
      message: 'Rapor ve ödeme kayıtları başarıyla kaydedildi.',
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
    db.prepare('DELETE FROM daily_reports WHERE date = ?').run(date);
    db.prepare('DELETE FROM courier_payments WHERE date = ?').run(date);
    db.prepare('DELETE FROM tip_payments WHERE date = ?').run(date);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
