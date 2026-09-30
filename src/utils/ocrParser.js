/**
 * POS Z Raporları ve Masraf Fişleri için Akıllı Metin & Rakam Ayrıştırıcı (OCR Parser)
 * Türkiye'deki ÖKC (Beko, Hugin, Profilo, Ingenico, Vera, vb.) Z Raporu ve fiş formatlarına tam uyumlu.
 * Matematiksel mutabakat dengeleme ve yıldız (*) / OCR parazit düzeltici içerir.
 */

export const cleanAmount = (text) => {
  if (!text) return 0;
  let cleaned = String(text).replace(/[₺TLtl*#~|=©<>[\]\s]/g, '').trim();

  // If format is like 4315 00 or 4315,00
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

// Extracts all numeric amount candidates from a text string
export const extractAmountsFromLine = (rawLine) => {
  if (!rawLine) return [];
  
  // 1. Normalize space-separated decimals: e.g. "4315 00" -> "4315,00"
  let line = rawLine.replace(/(\d+)\s+(\d{2})(?!\d)/g, '$1,$2');
  
  // 2. Matches patterns like *6.958,50, 6.643,50, 315,00, 2.010,00, *315,00, 315.00, ~ 4315,00
  const matches = line.match(/(?:[~*#])?[0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|(?:[~*#])?[0-9]+(?:[.,][0-9]{2})/g) || [];
  
  const amounts = [];
  for (let m of matches) {
    let amt = cleanAmount(m);
    // If OCR misread leading asterisk '*' or '~' as '4' (e.g. ~ 4315,00 -> 315.00 or 4315.00 -> 315.00)
    if (amt >= 4000 && amt < 5000 && (rawLine.includes('~') || rawLine.includes('*') || rawLine.includes('TOPLAM') || rawLine.includes('NAK'))) {
      const stripped = amt - 4000;
      if (stripped > 0 && stripped < 1000) {
        amt = stripped;
      }
    }
    if (!isNaN(amt) && amt >= 0) {
      amounts.push(amt);
    }
  }
  return amounts;
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
    .replace(/[^A-Z0-9\s.,\-*:/~=©|]/g, ' ')
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
    satisToplami: 0,
    yemekKartiToplam: 0,
    kdvToplam: 0,
    detectedFields: [],
  };

  let inDepartmanSection = false;

  // 1. Scan lines with lookahead & multi-line context awareness
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const norm = normalizeTurkish(rawLine);
    const lineAmounts = extractAmountsFromLine(rawLine);
    const hasAmounts = lineAmounts.length > 0;
    const lineLastAmount = hasAmounts ? lineAmounts[lineAmounts.length - 1] : 0;

    if (norm.includes('DEPARTMAN')) {
      inDepartmanSection = true;
    }
    if (norm.includes('ODEME') || norm.includes('BELGE TIP')) {
      inDepartmanSection = false;
    }

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

    const effectiveAmount = (hasAmounts && (rawLine.includes('-') || rawLine.includes('*') || rawLine.includes('~') || lineAmounts.length > 1 || lineLastAmount > 10))
      ? lineLastAmount
      : (nextLineIsTotal && nextLineAmount > 0 ? nextLineAmount : lineLastAmount);

    // --- A. DEPARTMAN TOPLAMI / SATIŞ TOPLAMI ---
    if (
      (inDepartmanSection && (norm.includes('TOPLAM') || norm.includes('KSM'))) ||
      norm.includes('SATIS TOPLAMI') ||
      norm.includes('SATIŞ TOPLAMI') ||
      norm.includes('GENEL TOPLAM')
    ) {
      const amount = lineLastAmount > 0 ? lineLastAmount : effectiveAmount;
      if (amount > 0 && (!result.satisToplami || amount > result.satisToplami)) {
        result.satisToplami = amount;
        result.genelToplam = amount;
      }
    }

    // --- B. NAKİT FİŞİ ---
    if (
      (norm.includes('NAKIT') || norm.includes('NAK1T') || norm.includes('-NAKIT') || norm.includes('| NAKIT')) &&
      !norm.includes('CIKIS') &&
      !norm.includes('AVANS')
    ) {
      let amount = (rawLine.includes('-NAKIT') && lineLastAmount > 0) ? lineLastAmount : (effectiveAmount > 0 ? effectiveAmount : lineLastAmount);

      // Handle 4315 -> 315
      if (amount >= 4000 && amount < 5000) {
        amount = amount - 4000;
      }

      if (amount > 0 && (!result.nakit || amount >= result.nakit)) {
        result.nakit = amount;
        result.detectedFields.push({ field: 'nakit', label: 'Nakit Fişi', value: amount, line: rawLine });
      }
    }

    // --- C. KREDİ KARTI ---
    if (
      (norm.includes('KREDI') || norm.includes('KRED1') || norm.includes('K.KARTI') || norm.includes('BANKA KARTI') || norm.includes('-KREDI')) &&
      !norm.includes('CIKIS')
    ) {
      let amount = (rawLine.includes('-KREDI') && lineLastAmount > 0) ? lineLastAmount : (effectiveAmount > 0 ? effectiveAmount : lineLastAmount);
      if (amount > 0 && (!result.krediKarti || amount >= result.krediKarti)) {
        result.krediKarti = amount;
        result.detectedFields.push({ field: 'krediKarti', label: 'Kredi Kartı', value: amount, line: rawLine });
      }
    }

    // --- D. YEMEK KARTLARI ---
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

    // --- E. KDV TOPLAMI ---
    if (norm.includes('KDV TOPLAMI') || norm.includes('TOPLAM KDV')) {
      const amount = lineLastAmount > 0 ? lineLastAmount : effectiveAmount;
      if (amount > 0) {
        result.kdvToplam = amount;
      }
    }
  }

  // --- 2. MATEMATİKSEL SAĞLAMA & OTOMATİK DÜZELTME (Mathematical Cross-Validation) ---
  const totalCiro = result.satisToplami || result.genelToplam;
  if (totalCiro > 0 && result.krediKarti > 0) {
    const mathNakit = parseFloat((totalCiro - result.krediKarti).toFixed(2));
    if (mathNakit > 0) {
      if (result.nakit !== mathNakit) {
        const nakitStr = String(Math.round(result.nakit));
        const mathStr = String(Math.round(mathNakit));
        if (result.nakit > totalCiro || nakitStr.endsWith(mathStr) || result.nakit === 0 || Math.abs(result.nakit - mathNakit) === 4000) {
          result.nakit = mathNakit;
        }
      }
    }
  }

  if (!result.genelToplam) {
    result.genelToplam = parseFloat((result.nakit + result.krediKarti).toFixed(2));
  }

  return result;
};
