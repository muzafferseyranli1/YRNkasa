/**
 * POS Z Raporları ve Masraf Fişleri için Akıllı Metin & Rakam Ayrıştırıcı (OCR Parser)
 * Türkiye'deki ÖKC (Beko, Hugin, Profilo, Ingenico, Vera, vb.) Z Raporu ve fiş formatlarına tam uyumlu.
 */

export const cleanAmount = (text) => {
  if (!text) return 0;
  // Remove currency symbols, asterisks, extra chars, replace comma with dot if appropriate
  let cleaned = String(text).replace(/[₺TLtl*#\s]/g, '').trim();
  
  // Format: 6.958,50 -> 6958.50 or 315,00 -> 315.00 or 6958.50 -> 6958.50
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // 6.958,50 -> 6958.50
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // 315,00 -> 315.00
    cleaned = cleaned.replace(',', '.');
  }
  
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

// Extracts all numeric amount candidates from a text string
export const extractAmountsFromLine = (line) => {
  if (!line) return [];
  // Matches patterns like *6.958,50, 6.643,50, 315,00, 2.010,00, *315,00, 315.00
  const matches = line.match(/(?:\*)?[0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|(?:\*)?[0-9]+(?:[.,][0-9]{2})/g) || [];
  return matches.map(m => cleanAmount(m)).filter(n => !isNaN(n) && n >= 0);
};

export const normalizeTurkish = (text) => {
  if (!text) return '';
  return text
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9\s.,\-*:/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const parseReceiptText = (rawText) => {
  if (!rawText) return {};

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const result = {
    rawText,
    merchantName: '',
    nakit: 0,
    krediKarti: 0,
    sodexho: 0,
    multinet: 0,
    ticket: 0,
    setcard: 0,
    genelToplam: 0,
    yemekKartiToplam: 0,
    kdvToplam: 0,
    detectedFields: [],
  };

  // 1. Merchant / Store name candidate (first non-header line)
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    const norm = normalizeTurkish(line);
    if (
      line.length > 3 &&
      !norm.includes('Z RAPOR') &&
      !norm.includes('DEPARTMAN') &&
      !norm.includes('MALI') &&
      !norm.includes('FIS') &&
      !line.match(/\d{2}[./-]\d{2}/)
    ) {
      result.merchantName = line;
      break;
    }
  }

  // 2. Scan lines with lookahead & multi-line context awareness
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const norm = normalizeTurkish(rawLine);
    const lineAmounts = extractAmountsFromLine(rawLine);
    const hasAmounts = lineAmounts.length > 0;
    const lineLastAmount = hasAmounts ? lineAmounts[lineAmounts.length - 1] : 0;

    // Check next line for amount if current line is a label or count
    let nextLineAmount = 0;
    let nextLineIsTotal = false;
    if (i + 1 < lines.length) {
      const nextNorm = normalizeTurkish(lines[i + 1]);
      const nextAmounts = extractAmountsFromLine(lines[i + 1]);
      if (nextAmounts.length > 0) {
        nextLineAmount = nextAmounts[nextAmounts.length - 1];
      }
      if (nextNorm.includes('TOPLAM') || nextNorm.includes('TUTAR') || nextAmounts.length > 0) {
        nextLineIsTotal = true;
      }
    }

    // Determine target amount: either on the same line or on next line (Ödeme Bilgileri structure)
    const effectiveAmount = (hasAmounts && (rawLine.includes('-') || rawLine.includes('*') || lineAmounts.length > 1 || lineLastAmount > 10))
      ? lineLastAmount
      : (nextLineIsTotal && nextLineAmount > 0 ? nextLineAmount : lineLastAmount);

    // --- A. NAKİT FİŞİ ---
    if (
      (norm.includes('NAKIT') || norm.includes('NAK1T') || norm.includes('-NAKIT')) &&
      !norm.includes('CIKIS') &&
      !norm.includes('AVANS')
    ) {
      const amount = (rawLine.includes('-NAKIT') && lineLastAmount > 0) ? lineLastAmount : (effectiveAmount > 0 ? effectiveAmount : lineLastAmount);
      if (amount > 0 && (!result.nakit || amount >= result.nakit)) {
        result.nakit = amount;
        result.detectedFields.push({ field: 'nakit', label: 'Nakit Fişi', value: amount, line: rawLine });
      }
    }

    // --- B. KREDİ KARTI ---
    if (
      (norm.includes('KREDI') || norm.includes('KRED1') || norm.includes('K.KARTI') || norm.includes('BANKA KARTI') || norm.includes('-KREDI')) &&
      !norm.includes('CIKIS')
    ) {
      const amount = (rawLine.includes('-KREDI') && lineLastAmount > 0) ? lineLastAmount : (effectiveAmount > 0 ? effectiveAmount : lineLastAmount);
      if (amount > 0 && (!result.krediKarti || amount >= result.krediKarti)) {
        result.krediKarti = amount;
        result.detectedFields.push({ field: 'krediKarti', label: 'Kredi Kartı', value: amount, line: rawLine });
      }
    }

    // --- C. YEMEK KARTLARI (Genel & Özel) ---
    if (norm.includes('YEMEK KARTI') || norm.includes('YEMEK CEKI') || norm.includes('YEMEK')) {
      const amount = effectiveAmount > 0 ? effectiveAmount : lineLastAmount;
      if (amount > 0) {
        result.yemekKartiToplam = amount;
        result.detectedFields.push({ field: 'yemekKartiToplam', label: 'Yemek Kartı Toplamı', value: amount, line: rawLine });
      }
    }

    if (norm.includes('SODEXO') || norm.includes('SODEXHO') || norm.includes('PLUXEE')) {
      const amount = effectiveAmount > 0 ? effectiveAmount : lineLastAmount;
      if (amount > 0) {
        result.sodexho = amount;
        result.detectedFields.push({ field: 'sodexho', label: 'Sodexo Z', value: amount, line: rawLine });
      }
    }

    if (norm.includes('MULTINET') || norm.includes('MULTİNET')) {
      const amount = effectiveAmount > 0 ? effectiveAmount : lineLastAmount;
      if (amount > 0) {
        result.multinet = amount;
        result.detectedFields.push({ field: 'multinet', label: 'Multinet Z', value: amount, line: rawLine });
      }
    }

    if (norm.includes('TICKET') || norm.includes('EDENRED')) {
      const amount = effectiveAmount > 0 ? effectiveAmount : lineLastAmount;
      if (amount > 0) {
        result.ticket = amount;
        result.detectedFields.push({ field: 'ticket', label: 'Ticket Z', value: amount, line: rawLine });
      }
    }

    if (norm.includes('SETCARD') || norm.includes('SET CARD')) {
      const amount = effectiveAmount > 0 ? effectiveAmount : lineLastAmount;
      if (amount > 0) {
        result.setcard = amount;
        result.detectedFields.push({ field: 'setcard', label: 'Setcard Z', value: amount, line: rawLine });
      }
    }

    // --- D. SATIŞ TOPLAMI / GENEL TOPLAM ---
    if (
      norm.includes('SATIS TOPLAMI') ||
      norm.includes('GENEL TOPLAM') ||
      norm.includes('TOPLAM SATIS') ||
      norm.includes('GUNLUK TOPLAM') ||
      norm.includes('KDV DAHIL')
    ) {
      const amount = lineLastAmount > 0 ? lineLastAmount : effectiveAmount;
      if (amount > 0 && (!result.genelToplam || amount > result.genelToplam)) {
        result.genelToplam = amount;
      }
    }

    // --- E. KDV TOPLAMI ---
    if (norm.includes('KDV TOPLAMI') || norm.includes('TOPLAM KDV')) {
      const amount = lineLastAmount > 0 ? lineLastAmount : effectiveAmount;
      if (amount > 0) {
        result.kdvToplam = amount;
      }
    }
  }

  // Fallback: If genelToplam was not found, sum nakit + kredi + yemek
  if (!result.genelToplam && (result.nakit > 0 || result.krediKarti > 0)) {
    result.genelToplam = result.nakit + result.krediKarti;
  }

  return result;
};
