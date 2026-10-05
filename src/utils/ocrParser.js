/**
 * POS Z Raporları, DengePOS Balans Raporları, Suitable POS ve Masraf Fişleri için Akıllı OCR Ayrıştırıcı.
 * ML Kit / Tesseract çıktısındaki harf-rakam hatalarına karşı matematiksel çapraz kontroller içerir
 * (ör. Satış Toplamı = Nakit + Kredi, Ödemeler Toplamı = ödeme kalemlerinin toplamı).
 */

// ---------------------------------------------------------------------------
// Temel yardımcılar
// ---------------------------------------------------------------------------

export const cleanAmount = (text) => {
  if (text === undefined || text === null || text === '') return 0;
  let cleaned = String(text)
    .replace(/[₺TLtl*#~|=©<>[\]\s]/gi, '')
    .trim();

  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

// Bir satırdaki tüm tutar adaylarını çıkarır (12.345,67 / 12345.67 / 12 345,67)
export const extractAmountsFromLine = (rawLine) => {
  if (!rawLine) return [];

  let line = rawLine
    // "20 766,13" -> "20766,13" (binlik yerine boşluk okunmuş)
    .replace(/(\d)\s+(\d{3}[.,]\d{2})(?!\d)/g, '$1$2')
    // "4315 00" -> "4315,00" (ondalık ayracı okunamamış)
    .replace(/(\d+)\s+(\d{2})(?!\d)/g, '$1,$2');
  const matches =
    line.match(
      /(?:[~*#])?[0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|(?:[~*#])?[0-9]+(?:[.,][0-9]{2})/g
    ) || [];

  const amounts = [];
  for (const m of matches) {
    let amt = cleanAmount(m);
    if (
      amt >= 4000 &&
      amt < 5000 &&
      (rawLine.includes('~') || rawLine.includes('*') || rawLine.includes('TOPLAM') || rawLine.includes('NAK'))
    ) {
      // "~" karakteri "4" diye okunmuş olabilir
      const stripped = amt - 4000;
      if (stripped > 0 && stripped < 1000 && m.startsWith('~')) amt = stripped;
    }
    if (!isNaN(amt) && amt >= 0) amounts.push(amt);
  }
  return amounts;
};

export const normalizeTurkish = (text) => {
  if (!text) return '';
  return text
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .toUpperCase()
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9\s.,\-*:/~=©|₺%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;
const lastAmount = (line) => {
  const a = extractAmountsFromLine(line);
  return a.length ? a[a.length - 1] : 0;
};
const hasAmount = (line) => extractAmountsFromLine(line).length > 0;
const letterCount = (norm) => (norm.match(/[A-Z]/g) || []).length;

// "Kredi Kartı" etiketi; KRECLI, KRED1 gibi OCR hatalarını da kabul eder
export const isKrediKartiLabel = (norm) => {
  if (!norm) return false;
  if (norm.includes('ONLINE') || norm.includes('ONL1NE')) return false;
  return (
    norm.includes('KREDI') ||
    norm.includes('KRED1') ||
    norm.includes('KRECL') ||
    norm.includes('KREC') ||
    norm.includes('KRED') ||
    norm.includes('K.KARTI') ||
    norm.includes('K.KART') ||
    (norm.includes('KART') && !norm.includes('YEMEK') && !norm.includes('SODEX') && !norm.includes('SET') && !norm.includes('SED'))
  );
};

// Yemek kartı markası -> alan adı
const mealField = (norm) => {
  if (norm.includes('SODEX') || norm.includes('PLUXEE')) return 'sodexho';
  if (norm.includes('MULTI')) return 'multinet';
  if (norm.includes('SETCAR') || norm.includes('SEDCAR') || norm.includes('SET CAR') || norm.includes('SETCRD')) return 'setcard';
  if (norm.includes('TICKET') || norm.includes('EDENRED') || norm.includes('EDENRE')) return 'ticket';
  return null;
};

// Etiket satırında tutar yoksa, hemen sonraki satır sadece sayı ise onu al
const amountForLabel = (blockLines, i) => {
  const own = extractAmountsFromLine(blockLines[i]);
  if (own.length) return own[own.length - 1];
  const next = blockLines[i + 1];
  if (next !== undefined && letterCount(normalizeTurkish(next)) < 3) {
    const nextAmts = extractAmountsFromLine(next);
    if (nextAmts.length) return nextAmts[nextAmts.length - 1];
  }
  return 0;
};

const indexOfLine = (lines, test, from = 0) => {
  for (let i = from; i < lines.length; i++) if (test(normalizeTurkish(lines[i]), lines[i])) return i;
  return -1;
};

// ---------------------------------------------------------------------------
// Satır yeniden kurma (ML Kit / Tesseract kutularından)
// ---------------------------------------------------------------------------

/**
 * [{ text, left, top, right, bottom }] -> aynı hizadaki parçaları tek satırda birleştirilmiş metin.
 * ML Kit etiketleri ve tutarları ayrı bloklar halinde döndürebilir; y konumuna göre birleştirmek bunu çözer.
 */
export const buildRowsFromBoxes = (boxes) => {
  const items = (boxes || [])
    .filter((b) => b && b.text && String(b.text).trim())
    .map((b) => ({
      text: String(b.text).trim(),
      left: b.left ?? 0,
      cy: ((b.top ?? 0) + (b.bottom ?? 0)) / 2,
      h: Math.max(1, (b.bottom ?? 0) - (b.top ?? 0)),
    }));
  if (!items.length) return '';

  const heights = items.map((i) => i.h).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)];
  items.sort((a, b) => a.cy - b.cy);

  const rows = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(it.cy - row.cy) <= medianH * 0.6) {
      row.items.push(it);
      row.cy = row.items.reduce((s, x) => s + x.cy, 0) / row.items.length;
    } else {
      rows.push({ cy: it.cy, items: [it] });
    }
  }
  return rows
    .map((r) =>
      r.items
        .sort((a, b) => a.left - b.left)
        .map((i) => i.text)
        .join('   ')
    )
    .join('\n');
};

// ---------------------------------------------------------------------------
// Ana ayrıştırıcı
// ---------------------------------------------------------------------------

export const parseReceiptText = (rawText, targetMode = 'auto') => {
  if (!rawText) return {};

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const fullNormalized = normalizeTurkish(rawText);

  let receiptType = targetMode === 'pos' ? 'z_report' : targetMode;
  if (!['suitable', 'denge', 'z_report', 'expense'].includes(receiptType)) {
    if (
      fullNormalized.includes('SUITABLE') ||
      fullNormalized.includes('GENEL ODEME YONTEMLERI') ||
      fullNormalized.includes('TRENDYOL') ||
      fullNormalized.includes('YEMEKSEPETI')
    ) {
      receiptType = 'suitable';
    } else if (
      fullNormalized.includes('ODEME BILGILERI') ||
      fullNormalized.includes('BELGE TIPLERI') ||
      fullNormalized.includes('FIS DOKUMU')
    ) {
      receiptType = 'z_report';
    } else if (
      fullNormalized.includes('BALANS RAPORU') ||
      fullNormalized.includes('KAPATILAN CEKLER') ||
      fullNormalized.includes('SISTEM SATIS')
    ) {
      receiptType = 'denge';
    } else {
      receiptType = 'z_report';
    }
  }

  const result = {
    rawText,
    merchantName: '',
    nakit: 0,
    krediKarti: 0,
    onlineKrediKarti: 0,
    sodexho: 0,
    multinet: 0,
    ticket: 0,
    setcard: 0,
    cari: 0,
    paketSiparisSayisi: 0,
    genelToplam: 0,
    satisToplami: 0,
    yemekKartiToplam: 0,
    kdvToplam: 0,
    receiptType,
    warnings: [],
    detectedFields: [],
  };

  if (receiptType === 'suitable') return parseSuitable(lines, result);
  if (receiptType === 'denge') return parseDenge(lines, result);
  if (receiptType === 'expense') return parseExpense(lines, result);
  return parseZReport(lines, result);
};

// ---------------------------------------------------------------------------
// Suitable POS: "Genel Ödeme Yöntemleri" bloğu
// ---------------------------------------------------------------------------

function parseSuitable(lines, result) {
  // Paket sipariş sayısı: "Masa" hariç tüm kanallardaki sipariş adetleri
  let totalOrders = 0;
  for (const line of lines) {
    const m = line.match(/\(?\s*(\d+)\s*sipari/i);
    if (m && !normalizeTurkish(line).includes('MASA')) totalOrders += parseInt(m[1], 10) || 0;
  }
  result.paketSiparisSayisi = totalOrders;

  let startIndex = indexOfLine(lines, (n) => n.includes('GENEL ODEME') || n.includes('ODEME YONTEM'));
  let endIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const norm = normalizeTurkish(lines[i]);
    if (norm.includes('GENEL TOPLAM') || norm.includes('ARA TOPLAM')) {
      const a = lastAmount(lines[i]);
      if (a > 0 && (!result.genelToplam || norm.includes('ARA TOPLAM'))) result.genelToplam = a;
    }
    if (
      startIndex !== -1 &&
      i > startIndex &&
      (norm.includes('ARA TOPLAM') || norm.includes('GENEL TOPLAM') || norm.includes('TOPLAM GIDER') || norm.includes('TOPLAM IPTAL'))
    ) {
      if (endIndex === lines.length) endIndex = i;
    }
  }

  const block = startIndex !== -1 ? lines.slice(startIndex + 1, endIndex) : lines;
  let yemekGenel = 0;

  for (let i = 0; i < block.length; i++) {
    const norm = normalizeTurkish(block[i]);
    const amt = amountForLabel(block, i);
    if (!amt) continue;

    const meal = mealField(norm);
    if (norm.includes('ONLINE') || norm.includes('ONL1NE')) {
      if (!result.onlineKrediKarti) result.onlineKrediKarti = amt;
    } else if (meal) {
      if (!result[meal]) result[meal] = amt;
    } else if (norm.includes('YEMEK CEK') || norm.includes('YEMEK KART')) {
      if (!yemekGenel) yemekGenel = amt;
    } else if (norm.includes('KAPIDA') && isKrediKartiLabel(norm.replace('KAPIDA', ''))) {
      result.krediKarti = round2(result.krediKarti + amt);
    } else if (norm.includes('NAKIT') || norm.includes('NAK1T')) {
      // "Nakit" + "Kapıda Nakit" tek nakit toplamında birleşir
      result.nakit = round2(result.nakit + amt);
    } else if (isKrediKartiLabel(norm)) {
      if (!result.krediKarti) result.krediKarti = amt;
    }
  }

  const known = () =>
    round2(
      result.nakit + result.krediKarti + result.onlineKrediKarti + result.sodexho + result.multinet + result.ticket + result.setcard + yemekGenel
    );

  if (result.genelToplam > 0) {
    const diff = round2(result.genelToplam - known());
    if (!near(diff, 0)) {
      const mathKredi = round2(result.genelToplam - (known() - result.krediKarti));
      if (mathKredi > 0) {
        result.warnings.push(
          `Kredi Kartı OCR'da ${result.krediKarti.toLocaleString('tr-TR')} ₺ okundu, fiş toplamına göre ${mathKredi.toLocaleString('tr-TR')} ₺ olarak düzeltildi. Kontrol edin.`
        );
        result.krediKarti = mathKredi;
      } else {
        result.warnings.push('Ödeme kalemlerinin toplamı fiş toplamı ile tutmuyor, değerleri kontrol edin.');
      }
    }
  } else {
    result.genelToplam = known();
  }

  if (yemekGenel > 0) {
    result.warnings.push(
      `Fişte markasız "Yemek Çeki" ${yemekGenel.toLocaleString('tr-TR')} ₺ var; hangi karta ait olduğunu forma elle ekleyin.`
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// DengePOS: "ÖDEME" ile "Ödemeler Toplamı" arası
// ---------------------------------------------------------------------------

function parseDenge(lines, result) {
  const start = indexOfLine(lines, (n) => n.includes('ODEME') && !n.includes('TOPLAM') && !n.includes('GERCEK'));
  let end = lines.length;
  let odemelerToplami = 0;

  // "Ödemeler Toplamı" / "Gerçek Gelir" fişte iki kez geçer; oylama ile doğru olanı bul
  const totals = [];
  for (let i = 0; i < lines.length; i++) {
    const norm = normalizeTurkish(lines[i]);
    if (norm.includes('ODEMELER TOPLAM') || norm.includes('GERCEK GELIR')) {
      const a = amountForLabel(lines, i);
      if (a > 0) totals.push(a);
      if (end === lines.length && start !== -1 && i > start) end = i;
    }
  }
  if (totals.length) {
    const freq = new Map();
    totals.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
    odemelerToplami = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  }

  const block = start !== -1 ? lines.slice(start + 1, end) : lines;
  for (let i = 0; i < block.length; i++) {
    const norm = normalizeTurkish(block[i]);
    const amt = amountForLabel(block, i);
    if (!amt) continue;
    const meal = mealField(norm);

    if (meal) {
      if (!result[meal]) result[meal] = amt;
    } else if (norm.includes('NAKIT') || norm.includes('NAK1T')) {
      if (!result.nakit) result.nakit = amt;
    } else if (norm.includes('CARI') || norm.includes('CAR1')) {
      if (!result.cari) result.cari = amt;
    } else if (isKrediKartiLabel(norm)) {
      if (!result.krediKarti) result.krediKarti = amt;
    }
  }

  const sum = () => round2(result.nakit + result.krediKarti + result.cari + result.sodexho + result.multinet + result.ticket + result.setcard);

  if (odemelerToplami > 0 && !near(sum(), odemelerToplami)) {
    const mathKredi = round2(odemelerToplami - (sum() - result.krediKarti));
    if (mathKredi > 0) {
      result.warnings.push(
        `Kredi Kartı OCR'da ${result.krediKarti.toLocaleString('tr-TR')} ₺ okundu, "Ödemeler Toplamı"na göre ${mathKredi.toLocaleString('tr-TR')} ₺ olarak düzeltildi. Kontrol edin.`
      );
      result.krediKarti = mathKredi;
    } else {
      result.warnings.push('Ödeme kalemlerinin toplamı "Ödemeler Toplamı" ile tutmuyor, değerleri kontrol edin.');
    }
  }

  result.genelToplam = odemelerToplami > 0 ? odemelerToplami : sum();
  return result;
}

// ---------------------------------------------------------------------------
// ÖKC Z Raporu (Ödeme Bilgileri / Belge Tipleri)
// ---------------------------------------------------------------------------

function mostCommon(values) {
  const freq = new Map();
  values.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  return sorted.length ? { value: sorted[0][0], count: sorted[0][1] } : { value: 0, count: 0 };
}

function parseZReport(lines, result) {
  const odemeStart = indexOfLine(lines, (n) => n.includes('ODEME BILG') || n.includes('DEME BILGILERI'));
  const belgeStart = indexOfLine(lines, (n) => n.includes('BELGE TIP') || n.includes('ELGE TIPLERI'));

  // --- ÖDEME BİLGİLERİ: etiket satırı (adet) + "TOPLAM *tutar" satırı ---
  const odemeEnd = belgeStart > odemeStart ? belgeStart : lines.length;
  const odemeLines = odemeStart !== -1 ? lines.slice(odemeStart + 1, odemeEnd) : [];
  const o = { nakit: 0, kredi: 0, karekod: 0, yemek: 0 };
  let pending = null;
  for (const line of odemeLines) {
    const norm = normalizeTurkish(line);
    let cat = null;
    if (norm.includes('KAREKOD') || norm.includes('KARE KOD') || norm.includes('QR')) cat = 'karekod';
    else if (norm.includes('YEMEK')) cat = 'yemek';
    else if (norm.includes('NAKIT') || norm.includes('NAK1T')) cat = 'nakit';
    else if (norm.includes('KREDI') || norm.includes('KRED1') || norm.includes('KREC')) cat = 'kredi';

    if (cat) {
      pending = cat;
      if (hasAmount(line) && /TOPLA|TOPLAN/.test(norm)) {
        o[cat] = lastAmount(line);
        pending = null;
      }
    } else if ((/TOPLA|TOPLAN/.test(norm) || letterCount(norm) <= 3) && hasAmount(line) && pending) {
      o[pending] = lastAmount(line);
      pending = null;
    }
  }

  // --- BELGE TİPLERİ: "-NAKİT", "-KREDİ", "-SATIŞ TOPLAMI" (ilk bölüm = ÖKC fişleri, İPTAL'den önce) ---
  const b = { nakit: 0, kredi: 0, satis: 0, diger: 0 };
  if (belgeStart !== -1) {
    for (let i = belgeStart + 1; i < lines.length; i++) {
      const norm = normalizeTurkish(lines[i]);
      if (norm.includes('IPTAL') || norm.includes('SAYAC')) break;
      if (!hasAmount(lines[i])) continue;
      if (norm.includes('SATIS TOP') || norm.includes('ATIS TOPLAMI')) b.satis = b.satis || lastAmount(lines[i]);
      else if (norm.includes('NAKIT') || norm.includes('NAK1T')) b.nakit = b.nakit || lastAmount(lines[i]);
      else if (norm.includes('KREDI') || norm.includes('KRED1')) b.kredi = b.kredi || lastAmount(lines[i]);
      else if (norm.includes('DIGER')) b.diger = b.diger || lastAmount(lines[i]);
    }
  }

  // --- Satış toplamı: fişte 4-5 kez tekrar eder (Günlük Fiş Dökümü, KDV, Departman, Belge Tipleri) ---
  // KDV / İPTAL / miktar satırları dışındaki tüm tutarlar oy kullanır; en sık tekrar eden = satış toplamı
  const satisVotes = [];
  let inIptal = false;
  lines.forEach((l) => {
    const n = normalizeTurkish(l);
    if (n.includes('IPTAL')) inIptal = true;
    if (inIptal) return;
    if (n.includes('KDV') || n.includes('MALI') || n.includes('BELLEK') || n.includes('MIKTAR')) return;
    if (/NAKIT|KREDI|DIGER|KAREKOD|YEMEK/.test(n) && !/TOPLA/.test(n)) return;
    extractAmountsFromLine(l).forEach((a) => a > 0 && satisVotes.push(a));
  });
  const voted = mostCommon(satisVotes);
  // Tek oyla satış toplamı kabul edilmez: bozuk bir okuma diğer alanları yanlış "düzeltmesin"
  const satis = voted.count >= 2 ? voted.value : 0;
  result.satisToplami = satis;
  result.yemekKartiToplam = o.yemek;

  // --- Nakit / Kredi adayları ---
  const nakitCands = [...new Set([b.nakit, o.nakit].filter((v) => v > 0))];
  const krediCands = [...new Set([b.kredi, round2(o.kredi + o.karekod), o.kredi].filter((v) => v > 0))];

  let nakit = 0;
  let kredi = 0;

  if (satis > 0) {
    // satış toplamını tutturan çifti ara
    outer: for (const n of nakitCands.length ? nakitCands : [0]) {
      for (const k of krediCands.length ? krediCands : [0]) {
        if (near(n + k + b.diger, satis)) {
          nakit = n;
          kredi = k;
          break outer;
        }
      }
    }
    if (!nakit && !kredi) {
      if (nakitCands.length && !krediCands.length) {
        nakit = nakitCands[0];
        kredi = round2(satis - nakit);
      } else if (krediCands.length && !nakitCands.length) {
        kredi = krediCands[0];
        nakit = round2(satis - kredi);
      } else if (nakitCands.length && krediCands.length) {
        // İki değer var ama tutmuyor: OCR genelde hane düşürür (2.010,00 -> 10,00),
        // bu yüzden büyük okumayı çıpa alıp diğerini satış toplamından türet.
        const n0 = nakitCands[0];
        const k0 = Math.max(...krediCands);
        const rest = round2(satis - b.diger);
        if (k0 >= n0) {
          kredi = k0;
          nakit = round2(rest - k0);
        } else {
          nakit = n0;
          kredi = round2(rest - n0);
        }
        if (nakit < 0 || kredi < 0) {
          nakit = n0;
          kredi = k0;
        }
        result.warnings.push(
          `Nakit (${n0.toLocaleString('tr-TR')} ₺) + Kredi (${k0.toLocaleString('tr-TR')} ₺) satış toplamı (${satis.toLocaleString('tr-TR')} ₺) ile tutmuyor; biri satış toplamından düzeltildi. Fişe bakıp kontrol edin.`
        );
      }
    }
  } else {
    nakit = nakitCands[0] || 0;
    kredi = krediCands[0] || 0;
  }

  // Son çare: etiket çözülemediyse fişteki sayılardan a + b = satış çifti bul
  if (satis > 0 && !nakit && !kredi) {
    const all = [...new Set(lines.flatMap((l) => extractAmountsFromLine(l)).filter((v) => v > 0 && v < satis))];
    for (const a of all) {
      const c = round2(satis - a);
      if (all.some((x) => near(x, c))) {
        nakit = Math.min(a, c);
        kredi = Math.max(a, c);
        result.warnings.push('Nakit/Kredi etiketleri okunamadı; tutarlar satış toplamından tahmin edildi, kontrol edin.');
        break;
      }
    }
  }

  result.nakit = nakit;
  result.krediKarti = kredi;
  result.genelToplam = satis > 0 ? satis : round2(nakit + kredi);

  if (!nakit && !kredi) {
    // Bilinmeyen format: eski etiket tabanlı tarama
    for (const line of lines) {
      const norm = normalizeTurkish(line);
      const amt = lastAmount(line);
      if (!amt) continue;
      if ((norm.includes('NAKIT') || norm.includes('NAK1T')) && !norm.includes('CIKIS') && !norm.includes('AVANS')) {
        result.nakit = Math.max(result.nakit, amt);
      } else if (isKrediKartiLabel(norm) && !norm.includes('CIKIS')) {
        result.krediKarti = Math.max(result.krediKarti, amt);
      } else {
        const meal = mealField(norm);
        if (meal && !result[meal]) result[meal] = amt;
      }
    }
    result.genelToplam = round2(result.nakit + result.krediKarti);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Masraf / Gider fişi: firma adı + KDV dahil toplam
// ---------------------------------------------------------------------------

const NOT_MERCHANT = [
  'FIS NO', 'FIS TAR', 'TARIH', 'SAAT', 'VERGI', 'V.D', 'VD:', 'VKN', 'TCKN', 'TEL', 'ADRES', 'MAH', 'CAD', 'SOK', 'BULV', 'NO:',
  'KASIYER', 'KASA', 'MERSIS', 'TICARET SICIL', 'SICIL', 'WWW', 'HTTP', '.COM', 'MALI DEGERI', 'BILGI FISI', 'E-ARSIV', 'FATURA',
  'EKU', 'ETTN', 'ZNO', 'Z NO', 'ISLEM', 'ONAY', 'TERMINAL', 'POS', 'SATIS', 'MASRAF', 'FISI', 'BELGE', 'MUSTERI', 'HOSGELDINIZ', 'TESEKKUR',
];

const TOTAL_PRIORITY = [
  (n) => /GENEL TOPLAM/.test(n),
  (n) => /ODENECEK|ODENEN|TOPLAM TUTAR|TUTAR TOPLAM/.test(n),
  (n) => /(^|\s)TOPLAM(\s|$|:|\*)/.test(n) && !/KDV|ARA TOPLAM|MATRAH|INDIRIM|IPTAL|MIKTAR/.test(n),
  (n) => /(^|\s)(NAKIT|KREDI|KREDI KARTI|BANKA KARTI|VISA|MASTER)(\s|$|:|\*)/.test(n) && !/PARA USTU/.test(n),
];

function parseExpense(lines, result) {
  // --- Firma adı: fiş başlığındaki ilk anlamlı satır ---
  const head = lines.slice(0, 10);
  for (const line of head) {
    const norm = normalizeTurkish(line);
    const letters = letterCount(norm);
    const digits = (norm.match(/[0-9]/g) || []).length;
    if (letters < 4) continue;
    if (digits > letters / 2) continue;
    if (/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(line)) continue;
    if (NOT_MERCHANT.some((w) => norm.includes(w))) continue;
    if (hasAmount(line)) continue;
    result.merchantName = line
      .replace(/[^\p{L}\p{N}\s&.\-'/]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (result.merchantName) break;
  }

  // --- KDV dahil toplam ---
  let total = 0;
  for (const test of TOTAL_PRIORITY) {
    const cands = [];
    lines.forEach((line, i) => {
      const norm = normalizeTurkish(line);
      if (!test(norm)) return;
      const a = amountForLabel(lines, i);
      if (a > 0) cands.push(a);
    });
    if (cands.length) {
      // Aynı etiket birden çok yerde geçebilir (örn. TOPLAM ve ödeme satırı): en sık / en büyük olan
      total = mostCommon(cands).value;
      break;
    }
  }

  if (!total) {
    // Hiçbir etiket çözülemedi: KDV/yüzde satırları dışındaki en büyük tutar
    const all = [];
    lines.forEach((l) => {
      const n = normalizeTurkish(l);
      if (n.includes('KDV') || n.includes('%')) return;
      extractAmountsFromLine(l).forEach((a) => all.push(a));
    });
    total = all.length ? Math.max(...all) : 0;
    if (total) result.warnings.push('Toplam etiketi okunamadı; fişteki en büyük tutar alındı, kontrol edin.');
  }

  result.genelToplam = total;
  result.nakit = 0;
  if (!result.merchantName) result.warnings.push('Firma adı okunamadı, elle yazın.');
  return result;
}
