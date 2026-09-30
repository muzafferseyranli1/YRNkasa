import { parseReceiptText } from '../src/utils/ocrParser.js';

const sample = `<a... ÖDEME BİLGİLERİ <<...
| NAKİT
= TOPLAM ~ 4315 00
© KREDİ 5
© TOPLAM *6.643,50
© YEMEK KARTİ i]
TOPLAM *2.010,00`;

console.log('--- TEST RESULTS ---');
const result = parseReceiptText(sample);
console.log(JSON.stringify(result, null, 2));
