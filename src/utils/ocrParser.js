/**
 * POS Z Raporları, DengePOS Balans Raporları, Suitable POS ve Masraf Fişleri için Akıllı OCR Ayrıştırıcı
 * Google ML Kit & Tesseract OCR ile tam uyumlu Türkçe fiş çözümleme motoru.
 * OCR harf/yazım hatalarını (örn. KRECLİ -> KREDİ KARTI) ve matematiksel mutabakatı içerir.
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
    .replace(/[^A-Z0-9\s.,\-*:/~=©|₺%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Check if string matches "Kredi Kartı" even with OCR typos like "KRECLI", "KRECL", "KRED1", "KRED"
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
    (norm.includes('KART') && !norm.includes('YEMEK') && !norm.includes('SODEX') && !norm.includes('SET'))
  );
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
    fullNormalized.includes('SISTEM SATIS') ||
    fullNormalized.includes('ODEME');

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

  // =========================================================================
  // 1. SUITABLE POS: "Genel Ödeme Yöntemleri" ile "Ara Toplam" arasını al
  // =========================================================================
  if (isSuitablePos) {
    let totalOrders = 0;
    const orderMatches = rawText.matchAll(/(\d+)\s*sipari[sş]/gi);
    for (const match of orderMatches) {
      const count = parseInt(match[1], 10);
      if (!isNaN(count)) totalOrders += count;
    }
    result.paketSiparisSayisi = totalOrders;

    let startIndex = -1;
    let endIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const norm = normalizeTurkish(lines[i]);
      if (norm.includes('GENEL ODEME') || norm.includes('ODEME YONTEMLERI')) {
        startIndex = i;
      }
      if (startIndex !== -1 && i > startIndex && (norm.includes('ARA TOPLAM') || norm.includes('GENEL TOPLAM') || norm.includes('TOPLAM GIDER') || norm.includes('TOPLAM IPTAL') || norm.includes('SUITABLE POS'))) {
        endIndex = i;
        break;
      }
      // Genel toplam tespiti
      if (norm.includes('GENEL TOPLAM') || norm.includes('ARA TOPLAM')) {
        const amts = extractAmountsFromLine(lines[i]);
        if (amts.length > 0) result.genelToplam = amts[amts.length - 1];
      }
    }

    const blockLines = startIndex !== -1 ? lines.slice(startIndex, endIndex) : lines;

    for (let i = 0; i < blockLines.length; i++) {
      const rawLine = blockLines[i];
      const norm = normalizeTurkish(rawLine);
      const lineAmounts = extractAmountsFromLine(rawLine);
      let amt = lineAmounts.length > 0 ? lineAmounts[lineAmounts.length - 1] : 0;

      if (amt === 0 && i + 1 < blockLines.length) {
        const nextAmounts = extractAmountsFromLine(blockLines[i + 1]);
        if (nextAmounts.length > 0) amt = nextAmounts[nextAmounts.length - 1];
      }

      if (norm.includes('ONLINE') || norm.includes('ONL1NE')) {
        if (amt > 0 && !result.onlineKrediKarti) result.onlineKrediKarti = amt;
      } else if (isKrediKartiLabel(norm)) {
        if (amt > 0 && !result.krediKarti) result.krediKarti = amt;
      } else if (norm.includes('NAKIT') || norm.includes('NAK1T')) {
        result.nakit = amt;
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

    // Matematiksel Sağlama: Genel Toplam varsa Kredi Kartı = Genel Toplam - Online - Nakit
    if (result.genelToplam > 0 && result.onlineKrediKarti > 0) {
      const mathKredi = parseFloat((result.genelToplam - result.onlineKrediKarti - result.nakit - result.sodexho - result.multinet - result.ticket - result.setcard).toFixed(2));
      if (mathKredi > 0) {
        // Eğer OCR okumamışsa veya OCR rakamında ufak bir okuma farkı varsa (örn 4846 yerine 4646), matematiksel kesin rakamı ata
        if (!result.krediKarti || Math.abs(result.krediKarti - mathKredi) > 0.05) {
          result.krediKarti = mathKredi;
        }
      }
    }

    if (!result.genelToplam) {
      result.genelToplam = parseFloat(
        (result.nakit + result.krediKarti + result.onlineKrediKarti + result.sodexho + result.multinet + result.ticket + result.setcard).toFixed(2)
      );
    }

    return result;
  }

  // =========================================================================
  // 2. DENGE POS: Kesinlikle "ÖDEME" ile "Ödemeler Toplamı / Gerçek Gelir" arasını al!
  // =========================================================================
  if (isDengePos) {
    let odemeStartIndex = -1;
    let odemeEndIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const norm = normalizeTurkish(lines[i]);
      if (norm === 'ODEME' || norm.startsWith('ODEME ') || norm.endsWith(' ODEME') || norm.includes('ODEME')) {
        if (!norm.includes('TOPLAM') && !norm.includes('GERCEK')) {
          odemeStartIndex = i;
          break;
        }
      }
    }

    if (odemeStartIndex !== -1) {
      for (let i = odemeStartIndex + 1; i < lines.length; i++) {
        const norm = normalizeTurkish(lines[i]);
        if (norm.includes('ODEMELER TOPLAMI') || norm.includes('GERCEK GELIR') || norm.includes('ACIK CEKLER') || norm.includes('DIGER')) {
          odemeEndIndex = i;
          break;
        }
      }
    }

    const odemeBlock = odemeStartIndex !== -1 ? lines.slice(odemeStartIndex, odemeEndIndex + 1) : lines;

    const blockAmounts = [];
    odemeBlock.forEach((l) => {
      extractAmountsFromLine(l).forEach((a) => blockAmounts.push(a));
    });

    for (let i = 0; i < odemeBlock.length; i++) {
      const rawLine = odemeBlock[i];
      const norm = normalizeTurkish(rawLine);
      const lineAmounts = extractAmountsFromLine(rawLine);
      let amt = lineAmounts.length > 0 ? lineAmounts[lineAmounts.length - 1] : 0;

      if (amt === 0) {
        if (i + 1 < odemeBlock.length) {
          const nextAmts = extractAmountsFromLine(odemeBlock[i + 1]);
          if (nextAmts.length > 0) amt = nextAmts[nextAmts.length - 1];
        }
        if (amt === 0 && i > 0) {
          const prevAmts = extractAmountsFromLine(odemeBlock[i - 1]);
          if (prevAmts.length > 0) amt = prevAmts[prevAmts.length - 1];
        }
      }

      if (isKrediKartiLabel(norm)) {
        if (amt > 0 && !result.krediKarti) {
          result.krediKarti = amt;
          result.detectedFields.push({ field: 'krediKarti', label: 'Kredi Kartı', value: amt, line: rawLine });
        }
      } else if (norm.includes('NAKIT') || norm.includes('NAK1T')) {
        result.nakit = amt;
        result.detectedFields.push({ field: 'nakit', label: 'Nakit', value: amt, line: rawLine });
      } else if (norm.includes('CARI') || norm.includes('CAR1')) {
        if (amt > 0) result.cari = amt;
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

    if (result.krediKarti === 0 && blockAmounts.length > 0) {
      const posAmt = blockAmounts.find((a) => a > 0);
      if (posAmt) result.krediKarti = posAmt;
    }

    result.genelToplam = parseFloat(
      (result.nakit + result.krediKarti + result.cari + result.sodexho + result.multinet + result.ticket + result.setcard).toFixed(2)
    );

    return result;
  }

  // =========================================================================
  // 3. GENEL ÖKC Z RAPORU & MASRAF
  // =========================================================================
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const norm = normalizeTurkish(rawLine);
    const lineAmounts = extractAmountsFromLine(rawLine);
    const amt = lineAmounts.length > 0 ? lineAmounts[lineAmounts.length - 1] : 0;

    if ((norm.includes('NAKIT') || norm.includes('NAK1T')) && !norm.includes('CIKIS') && !norm.includes('AVANS')) {
      if (amt >= 0 && (!result.nakit || amt >= result.nakit)) {
        result.nakit = amt;
      }
    } else if (isKrediKartiLabel(norm) && !norm.includes('CIKIS')) {
      if (amt > 0 && (!result.krediKarti || amt >= result.krediKarti)) {
        result.krediKarti = amt;
      }
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

  result.genelToplam = parseFloat((result.nakit + result.krediKarti).toFixed(2));
  return result;
};
