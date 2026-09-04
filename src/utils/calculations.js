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

  // 4. Harcamalar Toplamı
  const toplamHarcamalar = (harcamalar || []).reduce(
    (acc, item) => acc + num(item.tutar),
    0
  );

  // 5. Kasa Nakit Akışı & Hesaplanan Nakit
  const devir = num(kasaGiris.devir);
  const kasayaParaKondu = num(kasaGiris.kasayaParaKondu);
  const satisNakitToplam = num(dengePos.nakit) + num(suitablePos.nakit);

  const toplamNakitGiris = devir + kasayaParaKondu + satisNakitToplam;
  const hesaplananNakit = toplamNakitGiris - toplamHarcamalar;
  const fizikiSayim = num(fizikiKasa);
  const kasaFarki = fizikiSayim - hesaplananNakit; // Negatif ise eksik, pozitif ise fazla

  // 6. Fiş Kesim Mutabakatı (Nakit Fişi)
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

  // 7. Kredi Kartı Mutabakatı
  // kasa.xlsx: D8 + D16 (Denge KK + Suitable KK)
  const hesaplananKrediKarti =
    num(dengePos.krediKarti) + num(suitablePos.krediKarti);
  const fizikiKrediKarti = posCihazlari.reduce(
    (acc, item) => acc + num(item.krediKarti),
    0
  );
  const krediKartiFarki = fizikiKrediKarti - hesaplananKrediKarti;

  // 8. Paneller Toplamı
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

  // 9. Yemek Kartları Mutabakatı
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
    toplamNakitGiris,
    hesaplananNakit,
    fizikiSayim,
    kasaFarki,
    kesilmesiGerekenNakitFisi,
    kesilenNakitFisi,
    nakitFisFarki,
    hesaplananKrediKarti,
    fizikiKrediKarti,
    krediKartiFarki,
    panelSiparisTutari,
    panelSiparisSayisi,
    posPaketSiparisSayisi,
    panelPosTutarFarki,
    siparisSayisiFarki,
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
    { id: 'h_1', title: 'Nakit Çıkışı', tutar: 0, aciklama: 'bankaya yatırıldı' },
    { id: 'h_2', title: 'Yakıt Alımı', tutar: 0, aciklama: '' },
    { id: 'h_3', title: 'Market Alışverişi', tutar: 0, aciklama: '' },
    { id: 'h_4', title: 'Hammadde Alımı', tutar: 0, aciklama: '' },
  ],
  fizikiKasa: 0,
  notlar: '',
});

