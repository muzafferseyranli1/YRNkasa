/**
 * POS Z Raporları, DengePOS Balans Raporları, Suitable POS ve Masraf Fişleri için Akıllı OCR Ayrıştırıcı
 * Google ML Kit & Tesseract OCR ile tam uyumlu Türkçe fiş çözümleme motoru.
 */

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

// Extracts all numeric amount candidates from a text string
export const extractAmountsFromLine = (rawLine) => {
  if (!rawLine) return [];

  let line = rawLine.replace(/(\d+)\s+(\d{2})(?!\d)/g, '$1,$2');
  const matches = line.match(/(?:[~*#])?[0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|(?:[~*#])?[0-9]+(?:[.,][0-9]{2})/g) || [];

  const amounts = [];
  for (let m of matches) {
    let amt = cleanAmount(m);
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
    .replace(/[^A-Z0-9\s.,\-*:/~=©|₺]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const parseReceiptText = (rawText, targetMode = 'auto') => {
  if (!rawText) return {};

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const fullNormalized = normalizeTurkish(rawText);

  const isSuitablePos =
    targetMode === 'suitable' ||
    fullNormalized.includes('SUITABLE') ||
    fullNormalized.includes('GENEL ODEME YONTEMLERI') ||
    fullNormalized.includes('TRENDYOL') ||
    fullNormalized.includes('YEMEKSEPETI');

  const isDengePos =
    targetMode === 'denge' ||
    fullNormalized.includes('BALANS RAPORU') ||
    fullNormalized.includes('KAPATILAN CEKLER') ||
    fullNormalized.includes('SISTEM SATIS');

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
    receiptType: isSuitablePos ? 'suitable' : (isDengePos ? 'denge' : 'z_report'),
    detectedFields: [],
  };

  // ==========================================
  // 1. SUITABLE POS PARSING
  // ==========================================
  if (isSuitablePos) {
    let totalOrders = 0;
    const orderMatches = rawText.matchAll(/(\d+)\s*sipari[sş]/gi);
    for (const match of orderMatches) {
      const count = parseInt(match[1], 10);
      if (!isNaN(count)) totalOrders += count;
    }
    result.paketSiparisSayisi = totalOrders;

    let inGenelOdeme = false;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const norm = normalizeTurkish(rawLine);
      const lineAmounts = extractAmountsFromLine(rawLine);
      const lineLastAmount = lineAmounts.length > 0 ? lineAmounts[lineAmounts.length - 1] : 0;

      if (norm.includes('GENEL ODEME') || norm.includes('ODEME YONTEMLERI')) {
        inGenelOdeme = true;
        continue;
      }

      if (inGenelOdeme && (norm.includes('ARA TOPLAM') || norm.includes('GENEL TOPLAM') || norm.includes('TOPLAM GIDER') || norm.includes('TOPLAM IPTAL'))) {
        inGenelOdeme = false;
      }

      // Next line amount lookup if line has label but no amount
      let amt = lineLastAmount;
      if (amt === 0 && i + 1 < lines.length) {
        const nextAmounts = extractAmountsFromLine(lines[i + 1]);
        if (nextAmounts.length > 0) amt = nextAmounts[nextAmounts.length - 1];
      }

      // Inside Genel Ödeme block (or prioritized fallback)
      if (inGenelOdeme || (!result.onlineKrediKarti && !result.krediKarti && !result.nakit)) {
        if (norm.includes('ONLINE') || norm.includes('ONL1NE')) {
          if (amt > 0) {
            result.onlineKrediKarti = amt;
            result.detectedFields.push({ field: 'onlineKrediKarti', label: 'Online Kredi Kartı', value: amt, line: rawLine });
          }
        } else if ((norm.includes('KREDI') || norm.includes('KRED1') || norm.includes('K.KARTI')) && !norm.includes('ONLINE')) {
          if (amt > 0) {
            result.krediKarti = amt;
            result.detectedFields.push({ field: 'krediKarti', label: 'Kredi Kartı', value: amt, line: rawLine });
          }
        } else if (norm.includes('NAKIT') || norm.includes('NAK1T')) {
          result.nakit = amt;
          result.detectedFields.push({ field: 'nakit', label: 'Nakit', value: amt, line: rawLine });
        } else if (norm.includes('SODEX') || norm.includes('PLUXEE')) {
          if (amt > 0) result.sodexho = amt;
        } else if (norm.includes('MULTI')) {
          if (amt > 0) result.multinet = amt;
        } else if (norm.includes('TICKET') || norm.includes('EDENRED')) {
          if (amt > 0) result.ticket = amt;
        } else if (norm.includes('SETCARD') || norm.includes('SET CARD')) {
          if (amt > 0) result.setcard = amt;
        }
      }

      if (norm.includes('GENEL TOPLAM') || norm.includes('ARA TOPLAM')) {
        if (lineLastAmount > 0) result.genelToplam = lineLastAmount;
      }
    }

    if (!result.genelToplam) {
      result.genelToplam = parseFloat(
        (result.nakit + result.krediKarti + result.onlineKrediKarti + result.sodexho + result.multinet + result.ticket + result.setcard).toFixed(2)
      );
    }

    return result;
  }

  // ==========================================
  // 2. DENGE POS ("Sistem Satış Balans Raporu") PARSING
  // ==========================================
  if (isDengePos) {
    let inOdemeSection = false;

    // Collect all positive amounts in the text
    const foundAmounts = [];
    lines.forEach((l) => {
      extractAmountsFromLine(l).forEach((a) => {
        foundAmounts.push(a);
      });
    });

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const norm = normalizeTurkish(rawLine);
      const lineAmounts = extractAmountsFromLine(rawLine);
      const lineLastAmount = lineAmounts.length > 0 ? lineAmounts[lineAmounts.length - 1] : 0;

      if (norm === 'ODEME' || norm.startsWith('ODEME ') || norm.endsWith(' ODEME')) {
        inOdemeSection = true;
      }

      // Next line amount lookup
      let nextAmt = 0;
      if (i + 1 < lines.length) {
        const nextAmts = extractAmountsFromLine(lines[i + 1]);
        if (nextAmts.length > 0) nextAmt = nextAmts[nextAmts.length - 1];
      }

      const effectiveAmt = lineAmounts.length > 0 ? lineLastAmount : nextAmt;

      if (norm.includes('KREDI') || norm.includes('KRED1') || norm.includes('K.KARTI')) {
        if (effectiveAmt > 0) {
          result.krediKarti = effectiveAmt;
          result.detectedFields.push({ field: 'krediKarti', label: 'Kredi Kartı', value: effectiveAmt, line: rawLine });
        }
      } else if (norm.includes('NAKIT') || norm.includes('NAK1T')) {
        // If line contains 0,00 or next line is 0,00 or general Nakit line
        if (lineAmounts.length > 0) {
          result.nakit = lineLastAmount;
        } else {
          result.nakit = 0;
        }
        result.detectedFields.push({ field: 'nakit', label: 'Nakit', value: result.nakit, line: rawLine });
      } else if (norm.includes('CARI') || norm.includes('CAR1')) {
        if (effectiveAmt > 0) result.cari = effectiveAmt;
      } else if (norm.includes('SODEX') || norm.includes('PLUXEE')) {
        if (effectiveAmt > 0) result.sodexho = effectiveAmt;
      } else if (norm.includes('MULTI')) {
        if (effectiveAmt > 0) result.multinet = effectiveAmt;
      } else if (norm.includes('TICKET') || norm.includes('EDENRED')) {
        if (effectiveAmt > 0) result.ticket = effectiveAmt;
      } else if (norm.includes('SETCARD') || norm.includes('SET CARD')) {
        if (effectiveAmt > 0) result.setcard = effectiveAmt;
      } else if (norm.includes('ODEMELER TOPLAMI') || norm.includes('GERCEK GELIR') || norm.includes('NET SATIS')) {
        if (effectiveAmt > 0 && !result.genelToplam) {
          result.genelToplam = effectiveAmt;
        }
      }
    }

    // Fallback: If Kredi Karti is still 0 but we found amounts in receipt
    if (result.krediKarti === 0 && foundAmounts.length > 0) {
      const topPositive = foundAmounts.find((a) => a > 100);
      if (topPositive) {
        result.krediKarti = topPositive;
      }
    }

    if (!result.genelToplam) {
      result.genelToplam = parseFloat(
        (result.nakit + result.krediKarti + result.cari + result.sodexho + result.multinet + result.ticket + result.setcard).toFixed(2)
      );
    }

    return result;
  }

  // ==========================================
  // 3. GENERAL ÖKC Z RAPORU & MASRAF FİŞİ PARSING
  // ==========================================
  let inDepartmanSection = false;

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

    const effectiveAmount =
      hasAmounts && (rawLine.includes('-') || rawLine.includes('*') || rawLine.includes('~') || lineAmounts.length > 1 || lineLastAmount > 10)
        ? lineLastAmount
        : nextLineIsTotal && nextLineAmount > 0
        ? nextLineAmount
        : lineLastAmount;

    // A. DEPARTMAN TOPLAMI / SATIŞ TOPLAMI
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

    // B. NAKİT FİŞİ
    if (
      (norm.includes('NAKIT') || norm.includes('NAK1T') || norm.includes('-NAKIT') || norm.includes('| NAKIT')) &&
      !norm.includes('CIKIS') &&
      !norm.includes('AVANS')
    ) {
      let amount = rawLine.includes('-NAKIT') && lineLastAmount > 0 ? lineLastAmount : effectiveAmount > 0 ? effectiveAmount : lineLastAmount;
      if (amount >= 4000 && amount < 5000) {
        amount = amount - 4000;
      }
      if (amount >= 0 && (!result.nakit || amount >= result.nakit)) {
        result.nakit = amount;
        result.detectedFields.push({ field: 'nakit', label: 'Nakit Fişi', value: amount, line: rawLine });
      }
    }

    // C. KREDİ KARTI
    if (
      (norm.includes('KREDI') || norm.includes('KRED1') || norm.includes('K.KARTI') || norm.includes('BANKA KARTI') || norm.includes('-KREDI')) &&
      !norm.includes('CIKIS')
    ) {
      let amount = rawLine.includes('-KREDI') && lineLastAmount > 0 ? lineLastAmount : effectiveAmount > 0 ? effectiveAmount : lineLastAmount;
      if (amount > 0 && (!result.krediKarti || amount >= result.krediKarti)) {
        result.krediKarti = amount;
        result.detectedFields.push({ field: 'krediKarti', label: 'Kredi Kartı', value: amount, line: rawLine });
      }
    }

    // D. YEMEK KARTLARI
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

    // E. KDV TOPLAMI
    if (norm.includes('KDV TOPLAMI') || norm.includes('TOPLAM KDV')) {
      const amount = lineLastAmount > 0 ? lineLastAmount : effectiveAmount;
      if (amount > 0) {
        result.kdvToplam = amount;
      }
    }
  }

  // Matematiksel Mutabakat ve Sağlama (ÖKC Z)
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
