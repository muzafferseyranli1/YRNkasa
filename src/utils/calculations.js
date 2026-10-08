/**
 * kasa.xlsx iş kurallarına ve formüllerine göre mutabakat ve toplam hesaplamaları
 */

export const num = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

export const formatCurrency = (amount) => {
  const n = num(amount);
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' ₺';
};

export const formatNumber = (val) => {
  const n = num(val);
  return new Intl.NumberFormat('tr-TR').format(n);
};

const DEFAULT_KANAL_SATIRLARI = () => [
  { id: 'restoran', name: 'Restoran Ciro', sayiTuru: 'kisi', panel: false, ciro: {}, adet: {} },
  { id: 'restoranPaket', name: 'Restoran Paket', sayiTuru: 'paket', panel: false, ciro: {}, adet: {} },
  { id: 'yemeksepeti', name: 'Yemek Sepeti', sayiTuru: 'paket', panel: true, ciro: {}, adet: {} },
  { id: 'getir', name: 'Getir', sayiTuru: 'paket', panel: true, ciro: {}, adet: {} },
  { id: 'trendyol', name: 'Trendyol', sayiTuru: 'paket', panel: true, ciro: {}, adet: {} },
  { id: 'migros', name: 'Migros', sayiTuru: 'paket', panel: true, ciro: {}, adet: {} },
  { id: 'fuudy', name: 'Fuudy', sayiTuru: 'paket', panel: true, ciro: {}, adet: {} },
  { id: 'suitable', name: 'Suitable', sayiTuru: 'paket', panel: true, ciro: {}, adet: {} },
  { id: 'tiklagelsin', name: 'Tıkla Gelsin', sayiTuru: 'paket', panel: true, ciro: {}, adet: {} },
];
const KANAL_VERSION = 2;

// sayiTuru: 'kisi' (restoran) veya 'paket'; panel: true ise platform (Yemek Sepeti, Getir...) sayılır
export const getDefaultKanalCiro = () => ({
  v: KANAL_VERSION,
  markalar: [
    { id: 'pide', name: 'Pide' },
    { id: 'tandir', name: 'Tandır' },
    { id: 'kiymali', name: 'Kıymalı' },
  ],
  satirlar: DEFAULT_KANAL_SATIRLARI(),
});

// v2: Suitable ve Tıkla Gelsin eklendi; eski kayıtlarda eksik varsayılan satırlar sona eklenir
const migrateKanalCiro = (kanal) => {
  if (!kanal || !kanal.satirlar) return getDefaultKanalCiro();
  if ((kanal.v || 1) >= KANAL_VERSION) return kanal;
  const mevcut = new Set(kanal.satirlar.map((r) => r.id));
  const eksik = DEFAULT_KANAL_SATIRLARI().filter((r) => !mevcut.has(r.id));
  return { ...kanal, v: KANAL_VERSION, satirlar: [...kanal.satirlar, ...eksik] };
};

export const getDefaultBankalar = () => [
  { id: 'banka_1', name: 'Banka 1', tutar: '' },
  { id: 'banka_2', name: 'Banka 2', tutar: '' },
];

// Eski kayıtlarda olmayan alanları varsayılanla tamamlar
export const normalizeReportData = (data) => {
  if (!data) return data;
  return {
    ...data,
    kanalCiro: migrateKanalCiro(data.kanalCiro),
    bankaGunSonu: Array.isArray(data.bankaGunSonu) ? data.bankaGunSonu : getDefaultBankalar(),
  };
};

export const calculateKanalMetrics = (kanal) => {
  const markalar = kanal?.markalar || [];
  const satirlar = kanal?.satirlar || [];
  const markaCiro = {};
  const markaOnline = {};
  const markaPaket = {};
  const markaKisi = {};
  markalar.forEach((m) => {
    markaCiro[m.id] = 0;
    markaOnline[m.id] = 0;
    markaPaket[m.id] = 0;
    markaKisi[m.id] = 0;
  });

  let ciroToplam = 0;
  let onlineToplam = 0;
  let paketToplam = 0;
  let kisiToplam = 0;
  let panelCiro = 0;
  let panelPaket = 0;
  const satirToplamlari = {};

  satirlar.forEach((row) => {
    let rowCiro = 0;
    let rowOnline = 0;
    let rowAdet = 0;
    markalar.forEach((m) => {
      const c = num(row.ciro?.[m.id]);
      const o = num(row.online?.[m.id]);
      const a = num(row.adet?.[m.id]);
      rowCiro += c;
      rowOnline += o;
      rowAdet += a;
      markaCiro[m.id] += c;
      markaOnline[m.id] += o;
      if (row.sayiTuru === 'kisi') markaKisi[m.id] += a;
      else markaPaket[m.id] += a;
    });
    satirToplamlari[row.id] = { ciro: rowCiro, online: rowOnline, adet: rowAdet };
    ciroToplam += rowCiro;
    onlineToplam += rowOnline;
    if (row.sayiTuru === 'kisi') kisiToplam += rowAdet;
    else paketToplam += rowAdet;
    if (row.panel) {
      panelCiro += rowCiro;
      panelPaket += rowAdet;
    }
  });

  return { markaCiro, markaOnline, markaPaket, markaKisi, ciroToplam, onlineToplam, paketToplam, kisiToplam, panelCiro, panelPaket, satirToplamlari };
};

export const calculateReportMetrics = (data) => {
  if (!data) return {};

  const {
    kasaGiris = {},
    dengePos = {},
    suitablePos = {},
    paneller = [],
    zBilgileri = {},
    harcamalar = [],
    fizikiKasa = 0,
    kanalCiro = null,
    bankaGunSonu = [],
  } = data;

  // 1. DengePOS Satış Toplamı
  const dengePosToplam =
    num(dengePos.nakit) +
    num(dengePos.krediKarti) +
    num(dengePos.sodexho) +
    num(dengePos.multinet) +
    num(dengePos.ticket) +
    num(dengePos.setcard) +
    num(dengePos.cari);

  // 2. Suitable POS Satış Toplamı
  const suitablePosToplam =
    num(suitablePos.nakit) +
    num(suitablePos.krediKarti) +
    num(suitablePos.onlineKrediKarti) +
    num(suitablePos.sodexho) +
    num(suitablePos.multinet) +
    num(suitablePos.ticket) +
    num(suitablePos.setcard);

  // 3. Toplam Ciro / Satış
  const toplamSatis = dengePosToplam + suitablePosToplam;

  // 4. Harcamalar (Nakit vs KK Ayrımı)
  const harcamalarList = harcamalar || [];
  const nakitHarcamalar = harcamalarList
    .filter((item) => !item.isKK)
    .reduce((acc, item) => acc + num(item.tutar), 0);
  const kkHarcamalar = harcamalarList
    .filter((item) => !!item.isKK)
    .reduce((acc, item) => acc + num(item.tutar), 0);
  const toplamHarcamalar = nakitHarcamalar + kkHarcamalar;

  // 5. Kurye Paket / Adisyon Ödemeleri (Kasadan Nakit Çıkar)
  const kuryeList = data.kuryeOdemeleri || [];
  const kuryeOdemeleriToplami = kuryeList.reduce((acc, item) => {
    const count = num(item.siparisSayisi);
    const unitPrice = item.birimFiyat !== undefined ? num(item.birimFiyat) : 20;
    const total = item.toplamTutar !== undefined && item.toplamTutar !== '' ? num(item.toplamTutar) : (count * unitPrice);
    return acc + total;
  }, 0);
  const kuryeToplamSiparisSayisi = kuryeList.reduce((acc, item) => acc + num(item.siparisSayisi), 0);

  // 6. Kredi Kartı Bahşiş (Tip) & Kesintili Nakit Ödeme
  const tipList = data.tipOdemeleri || [];
  const tipCekilenKartToplami = tipList.reduce((acc, item) => acc + num(item.cekilenTip), 0);
  const tipNetNakitToplami = tipList.reduce((acc, item) => {
    if (item.netNakitTip !== undefined && item.netNakitTip !== '') return acc + num(item.netNakitTip);
    const cekilen = num(item.cekilenTip);
    const rate = item.kesintiOrani !== undefined ? num(item.kesintiOrani) : 20;
    return acc + (cekilen - (cekilen * (rate / 100)));
  }, 0);
  const tipKesintiToplami = tipCekilenKartToplami - tipNetNakitToplami;

  // 7. Kasa Nakit Akışı & Hesaplanan Nakit (Nakit Harcamalar + Kurye + Nakit Tip düşülür)
  const devir = num(kasaGiris.devir);
  const kasayaParaKondu = num(kasaGiris.kasayaParaKondu);
  const satisNakitToplam = num(dengePos.nakit) + num(suitablePos.nakit);

  const toplamNakitGiris = devir + kasayaParaKondu + satisNakitToplam;
  const toplamNakitCikis = nakitHarcamalar + kuryeOdemeleriToplami + tipNetNakitToplami;
  const hesaplananNakit = toplamNakitGiris - toplamNakitCikis;
  const fizikiSayim = num(fizikiKasa);
  const kasaFarki = fizikiSayim - hesaplananNakit; // Negatif ise eksik, pozitif ise fazla

  // 8. Fiş Kesim Mutabakatı (Nakit Fişi)
  // kasa.xlsx: D7 + D15 + D17 (Denge Nakit + Suitable Nakit + Suitable Online KK)
  const kesilmesiGerekenNakitFisi =
    num(dengePos.nakit) +
    num(suitablePos.nakit) +
    num(suitablePos.onlineKrediKarti);

  const posCihazlari = zBilgileri.posCihazlari || [];
  const kesilenNakitFisi = posCihazlari.reduce(
    (acc, item) => acc + num(item.nakit),
    0
  );
  const nakitFisFarki = kesilenNakitFisi - kesilmesiGerekenNakitFisi;

  // 9. Kredi Kartı Mutabakatı (Satış KK + Karttan Çekilen Bahşiş)
  const hesaplananKrediKarti =
    num(dengePos.krediKarti) + num(suitablePos.krediKarti) + tipCekilenKartToplami;
  const fizikiKrediKarti = posCihazlari.reduce(
    (acc, item) => acc + num(item.krediKarti),
    0
  );
  const krediKartiFarki = fizikiKrediKarti - hesaplananKrediKarti;

  // 10. Paneller Toplamı
  const panelSiparisTutari = (paneller || []).reduce(
    (acc, item) => acc + num(item.satis),
    0
  );
  const panelSiparisSayisi = (paneller || []).reduce(
    (acc, item) => acc + num(item.siparisSayisi),
    0
  );
  const posPaketSiparisSayisi = num(suitablePos.paketSiparisSayisi);
  const panelPosTutarFarki = panelSiparisTutari - suitablePosToplam;
  const siparisSayisiFarki = panelSiparisSayisi - posPaketSiparisSayisi;

  // 10b. Marka / kanal kırılımlı ciro (kağıt form)
  const kanal = calculateKanalMetrics(kanalCiro);
  const kanalGirildi = kanal.ciroToplam > 0 || kanal.paketToplam > 0 || kanal.kisiToplam > 0;
  const kanalCiroFarki = kanalGirildi ? kanal.ciroToplam - toplamSatis : 0;
  // Kanal tablosu girildiyse platform ciro/sayıları ondan alınır (Panel Bilgileri formu artık kullanılmıyor)
  const panelTutar = kanalGirildi ? kanal.panelCiro : panelSiparisTutari;
  const panelAdet = kanalGirildi ? kanal.panelPaket : panelSiparisSayisi;

  // 10c. Banka gün sonu raporları vs POS Z kredi kartı (2 farklı banka)
  const bankalar = bankaGunSonu || [];
  const bankaToplam = bankalar.reduce((acc, b) => acc + num(b.tutar), 0);
  const bankaGirildi = bankalar.some((b) => String(b.tutar ?? '') !== '' && num(b.tutar) !== 0);
  const bankaDetay = bankalar.map((b) => {
    const atananCihazlar = posCihazlari.filter((d) => d.bankId === b.id);
    const zToplam = atananCihazlar.reduce((acc, d) => acc + num(d.krediKarti), 0);
    return {
      id: b.id,
      name: b.name,
      tutar: num(b.tutar),
      zToplam,
      cihazSayisi: atananCihazlar.length,
      fark: atananCihazlar.length ? num(b.tutar) - zToplam : null,
    };
  });
  const bankaAtanmamisZ = posCihazlari
    .filter((d) => !bankalar.some((b) => b.id === d.bankId))
    .reduce((acc, d) => acc + num(d.krediKarti), 0);
  const bankaFarki = bankaGirildi ? bankaToplam - fizikiKrediKarti : 0;

  // 11. Yemek Kartları Mutabakatı
  const multinetHesaplanan = num(dengePos.multinet) + num(suitablePos.multinet);
  const multinetFiziki = num(zBilgileri.multinet);
  const multinetFark = multinetFiziki - multinetHesaplanan;

  const sodexhoHesaplanan = num(dengePos.sodexho) + num(suitablePos.sodexho);
  const sodexhoFiziki = num(zBilgileri.sodexho);
  const sodexhoFark = sodexhoFiziki - sodexhoHesaplanan;

  const ticketHesaplanan = num(dengePos.ticket) + num(suitablePos.ticket);
  const ticketFiziki = num(zBilgileri.ticket);
  const ticketFark = ticketFiziki - ticketHesaplanan;

  const setcardHesaplanan = num(dengePos.setcard) + num(suitablePos.setcard);
  const setcardFiziki = num(zBilgileri.setcard);
  const setcardFark = setcardFiziki - setcardHesaplanan;

  return {
    dengePosToplam,
    suitablePosToplam,
    toplamSatis,
    toplamHarcamalar,
    nakitHarcamalar,
    kkHarcamalar,
    kuryeOdemeleriToplami,
    kuryeToplamSiparisSayisi,
    tipCekilenKartToplami,
    tipNetNakitToplami,
    tipKesintiToplami,
    toplamNakitGiris,
    toplamNakitCikis,
    hesaplananNakit,
    fizikiSayim,
    kasaFarki,
    kesilmesiGerekenNakitFisi,
    kesilenNakitFisi,
    nakitFisFarki,
    hesaplananKrediKarti,
    fizikiKrediKarti,
    krediKartiFarki,
    panelSiparisTutari: panelTutar,
    panelSiparisSayisi: panelAdet,
    posPaketSiparisSayisi,
    panelPosTutarFarki: panelTutar - suitablePosToplam,
    siparisSayisiFarki: panelAdet - posPaketSiparisSayisi,
    kanal,
    kanalGirildi,
    kanalCiroFarki,
    bankaToplam,
    bankaGirildi,
    bankaFarki,
    bankaDetay,
    bankaAtanmamisZ,
    yemekKartlari: {
      multinet: { hesaplanan: multinetHesaplanan, fiziki: multinetFiziki, fark: multinetFark },
      sodexho: { hesaplanan: sodexhoHesaplanan, fiziki: sodexhoFiziki, fark: sodexhoFark },
      ticket: { hesaplanan: ticketHesaplanan, fiziki: ticketFiziki, fark: ticketFark },
      setcard: { hesaplanan: setcardHesaplanan, fiziki: setcardFiziki, fark: setcardFark },
    },
  };
};

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
  kanalCiro: getDefaultKanalCiro(),
  bankaGunSonu: getDefaultBankalar(),
  fizikiKasa: 0,
  notlar: '',
});
