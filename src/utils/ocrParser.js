/**
 * POS Z Raporları ve Masraf Fişleri için Akıllı Metin & Rakam Ayrıştırıcı (OCR Parser)
 */

export const cleanAmount = (text) => {
  if (!text) return 0;
  // Remove currency symbols, extra chars, replace comma with dot if appropriate
  let cleaned = text.replace(/[₺TLtl*#\s]/g, '').trim();
  // Turkish formatting: 1.250,50 -> 1250.50 or 250,50 -> 250.50
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
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
    date: null,
    detectedFields: [],
  };

  // 1. Merchant / Store name candidate (usually one of the first non-empty lines)
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (line.length > 3 && !line.match(/\d{2}[./-]\d{2}/) && !line.toLowerCase().includes('fiş') && !line.toLowerCase().includes('rapor')) {
      result.merchantName = line;
      break;
    }
  }

  // Regex helpers for matching amounts in a line: e.g. "NAKİT: 1.745,00" or "K.KARTI *36.701,00"
  const amountRegex = /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2}))/g;

  lines.forEach((line) => {
    const upper = line.toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');
    const amounts = line.match(amountRegex) || [];
    const lastAmount = amounts.length > 0 ? cleanAmount(amounts[amounts.length - 1]) : 0;

    if (lastAmount > 0) {
      // Nakit Fişi
      if (
        (upper.includes('NAKIT') || upper.includes('NAKİT')) &&
        !upper.includes('CIKIS') &&
        !upper.includes('ÇIKIŞ')
      ) {
        if (!result.nakit || lastAmount > result.nakit) {
          result.nakit = lastAmount;
          result.detectedFields.push({ field: 'nakit', label: 'Nakit Fişi', value: lastAmount, line });
        }
      }

      // Kredi Kartı
      if (
        upper.includes('KREDI') ||
        upper.includes('K.KARTI') ||
        upper.includes('BANKA KARTI') ||
        upper.includes('SATIS TOPLAM') ||
        upper.includes('GUN SONU')
      ) {
        if (!result.krediKarti || lastAmount > result.krediKarti) {
          result.krediKarti = lastAmount;
          result.detectedFields.push({ field: 'krediKarti', label: 'Kredi Kartı', value: lastAmount, line });
        }
      }

      // Sodexo / Pluxee
      if (upper.includes('SODEXO') || upper.includes('SODEXHO') || upper.includes('PLUXEE')) {
        result.sodexho = lastAmount;
        result.detectedFields.push({ field: 'sodexho', label: 'Sodexo Z', value: lastAmount, line });
      }

      // Multinet
      if (upper.includes('MULTINET') || upper.includes('MULTİNET')) {
        result.multinet = lastAmount;
        result.detectedFields.push({ field: 'multinet', label: 'Multinet Z', value: lastAmount, line });
      }

      // Ticket / Edenred
      if (upper.includes('TICKET') || upper.includes('EDENRED')) {
        result.ticket = lastAmount;
        result.detectedFields.push({ field: 'ticket', label: 'Ticket Z', value: lastAmount, line });
      }

      // Setcard
      if (upper.includes('SETCARD') || upper.includes('SET CARD')) {
        result.setcard = lastAmount;
        result.detectedFields.push({ field: 'setcard', label: 'Setcard Z', value: lastAmount, line });
      }

      // Genel Yemek Kartı / Yemek Çeki
      if (upper.includes('YEMEK') || upper.includes('YEMEK KARTI') || upper.includes('YEMEK CEKI')) {
        result.yemekKartiToplam = lastAmount;
        result.detectedFields.push({ field: 'yemekKartiToplam', label: 'Mali Yemek Kartı', value: lastAmount, line });
      }

      // Genel Toplam / Masraf Toplamı
      if (
        upper.includes('TOPLAM') ||
        upper.includes('GENEL TOPLAM') ||
        upper.includes('KDV DAHIL') ||
        upper.includes('ODENECEK')
      ) {
        if (!result.genelToplam || lastAmount > result.genelToplam) {
          result.genelToplam = lastAmount;
        }
      }
    }
  });

  return result;
};
