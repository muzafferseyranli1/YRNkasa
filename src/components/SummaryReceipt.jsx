import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatNumber, num, buildSummary, BANKA_ADLARI } from '../utils/calculations';

/**
 * ÖZET ADİSYON (80mm). Sıra:
 * Özet → Satış Kanalları Dökümü (kanal → marka: ciro / fiş) + Toplam → Ödeme Tipleri (nakit, kredi kartı + banka gün sonu,
 * yemek çekleri sistem/gün sonu, platform ciro/online) → Ara Toplam → Harcamalar → Adisyon (kurye) ödemeleri
 * → Tip ödemeleri → Kasa Sonucu.
 */

const INK = '#000';
const tl = (v) => formatCurrency(v);
const okv = (v) => Math.abs(num(v)) <= 0.05;
const dateLabel = (dateStr) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' });
// Fark: gün sonu − sistem. Pozitif = artı, negatif = eksi
const farkText = (d) => (okv(d) ? '✓ TAM' : `${d > 0 ? '+' : '-'}${formatCurrency(Math.abs(d))} (${d > 0 ? 'ARTI' : 'EKSİ'})`);

const Sec = ({ title, children }) => (
  <div style={{ padding: '5px 0', borderBottom: `2px solid ${INK}` }}>
    <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', paddingBottom: 2, marginBottom: 4, borderBottom: `1px solid ${INK}` }}>
      --- {title} ---
    </div>
    {children}
  </div>
);

// indent: 0 = ana satır, 1 / 2 = girinti seviyesi
const Row = ({ l, v, bold, small, indent = 0 }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: small ? 10.5 : 12, fontWeight: bold ? 900 : 700, paddingLeft: indent * 10, lineHeight: 1.4 }}>
    <span>{l}</span>
    <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{v}</span>
  </div>
);

// Başlık stili: kanal / ödeme tipi başlıkları ile Özet'teki Salon: / Paket: etiketleri aynıdır
const headStyle = { fontSize: 12.5, fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 2 };

// Başlık satırı (alt satırları olan kalem adı)
const Head = ({ children, mt = 5 }) => <div style={{ ...headStyle, marginTop: mt }}>{children}</div>;

const Rule = ({ heavy }) => <div style={{ borderTop: `${heavy ? 1.5 : 1}px solid ${INK}`, margin: '3px 0' }} />;

export default function SummaryReceipt({ open, onClose, date, data, metrics }) {
  if (!open || !data || !metrics || typeof document === 'undefined') return null;

  const markalar = data.kanalCiro?.markalar || [];
  const satirlar = data.kanalCiro?.satirlar || [];
  const kanal = metrics.kanal || {};
  const dp = data.dengePos || {};
  const sp = data.suitablePos || {};
  const z = data.zBilgileri || {};
  const cihazlar = z.posCihazlari || [];
  const kasaGiris = data.kasaGiris || {};

  // ---- Özet (bu rapor yalnızca günün kendisini gösterir, geçen hafta kıyası yok) ----
  const { cur, ort } = buildSummary(metrics, null);

  // ---- Satış kanalları: kanal → marka (ciro / fiş) ----
  const hucre = (r, mk) => ({ ciro: num(r.ciro?.[mk.id]), adet: num(r.adet?.[mk.id]), online: num(r.online?.[mk.id]) });
  const kanalRows = satirlar
    .map((r) => ({ r, brands: markalar.map((mk) => ({ mk, ...hucre(r, mk) })).filter((b) => b.ciro !== 0 || b.adet !== 0 || b.online !== 0) }))
    .filter((x) => x.brands.length > 0);
  const markaFis = (mk) => (kanal.markaSalonFis?.[mk.id] || 0) + (kanal.markaPaket?.[mk.id] || 0);
  const toplamFis = (kanal.salonFisToplam || 0) + (kanal.paketToplam || 0);

  // ---- Ödeme tipleri ----
  const split = (key) => ({ denge: num(dp[key]), suitable: num(sp[key]), toplam: num(dp[key]) + num(sp[key]) });
  const nakit = split('nakit');
  const kk = split('krediKarti');
  const onlineKK = split('onlineKrediKarti');
  const cari = split('cari');
  const zNakit = cihazlar.reduce((a, d) => a + num(d.nakit), 0);
  const zKK = cihazlar.reduce((a, d) => a + num(d.krediKarti), 0);
  const bankaToplamlari = BANKA_ADLARI.map((_, slot) => cihazlar.reduce((a, d) => a + num(d.banka?.[slot]), 0));
  const bankaGunSonu = bankaToplamlari.reduce((a, v) => a + v, 0);
  const bahsisKart = num(metrics.tipCekilenKartToplami);
  const kkSistem = kk.toplam + bahsisKart; // banka gün sonu kartla çekilen bahşişi de içerir
  const kkFark = bankaGunSonu - kkSistem;

  const yemek = Object.entries(metrics.yemekKartlari || {}).filter(([, y]) => num(y.hesaplanan) !== 0 || num(y.fiziki) !== 0);

  // ---- Harcama / kurye / bahşiş ----
  const harcamalar = (data.harcamalar || []).filter((h) => num(h.tutar) > 0);
  const kurye = (data.kuryeOdemeleri || [])
    .map((k) => {
      const count = num(k.siparisSayisi);
      const unit = k.birimFiyat !== undefined && k.birimFiyat !== '' ? num(k.birimFiyat) : 20;
      const total = k.toplamTutar !== undefined && k.toplamTutar !== '' ? num(k.toplamTutar) : count * unit;
      return { name: k.kuryeAdi || 'Kurye', count, unit, total };
    })
    .filter((k) => k.count > 0 || k.total > 0);
  const tips = (data.tipOdemeleri || [])
    .map((t) => {
      const kart = num(t.cekilenTip);
      const rate = t.kesintiOrani !== undefined && t.kesintiOrani !== '' ? num(t.kesintiOrani) : 20;
      const net = t.netNakitTip !== undefined && t.netNakitTip !== '' ? num(t.netNakitTip) : kart - kart * (rate / 100);
      return { name: t.personelAdi || 'Personel', kart, net };
    })
    .filter((t) => t.kart > 0 || t.net > 0);

  const kasaFarki = metrics.kasaFarki || 0;
  const nakitGider = metrics.nakitHarcamalar ?? metrics.toplamHarcamalar;

  const handlePrint = () => {
    document.body.classList.add('printing-summary');
    const cleanup = () => {
      document.body.classList.remove('printing-summary');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  return createPortal(
    <div className="sum-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.65)', overflow: 'auto', padding: '16px 0' }}>
      <div className="sum-toolbar" style={{ width: '78mm', margin: '0 auto 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Önizleme</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#d97706', color: '#fff', border: 0, borderRadius: 10, padding: '7px 12px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            <Printer size={15} /> Yazdır
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#0f172a', border: 0, borderRadius: 10, padding: '7px 10px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <X size={15} /> Kapat
          </button>
        </div>
      </div>

      <div
        className="sum-sheet"
        style={{ width: '74mm', margin: '0 auto', background: '#fff', color: INK, padding: '2mm 2mm 3mm', boxSizing: 'border-box', boxShadow: '0 10px 40px rgba(0,0,0,0.35)', fontFamily: '"Segoe UI", Arial, sans-serif' }}
      >
        {/* Başlık */}
        <div style={{ textAlign: 'center', paddingBottom: 5, borderBottom: `2px solid ${INK}` }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.1 }}>YRN RESTORAN</div>
          <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>ÖZET GÜN SONU</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {dateLabel(date)} • {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Özet */}
        <Sec title="ÖZET">
          <Row l="TOPLAM SATIŞ:" v={tl(cur.toplam)} bold />
          <Row l={<span style={headStyle}>Salon:</span>} v={tl(cur.salon)} />
          <Row l={`${formatNumber(cur.salonFis)} fiş · ort.`} v={tl(ort.salon)} small indent={1} />
          {cur.kisi > 0 && <Row l={`${formatNumber(cur.kisi)} kişi · ort.`} v={tl(ort.kisiBasi)} small indent={1} />}
          <Row l={<span style={headStyle}>Paket:</span>} v={tl(cur.paket)} />
          <Row l={`${formatNumber(cur.paketFis)} fiş · ort.`} v={tl(ort.paket)} small indent={1} />
          {cur.paketKisi > 0 && <Row l={`${formatNumber(cur.paketKisi)} kişi* · ort.`} v={tl(ort.paketKisiBasi)} small indent={1} />}
          <Row l="Fiş Sayısı:" v={formatNumber(cur.fis)} />
          <div style={{ borderTop: `1px dashed ${INK}`, margin: '3px 0' }} />
          <Row l="Ortalama Fiş:" v={tl(ort.toplam)} />
          {cur.kisi > 0 && (
            <>
              <Row l="Ortalama Kişi:" v={tl(ort.konsolideKisiBasi)} />
              <Row l={`${formatNumber(cur.kisiToplam)} kişi (salon ${formatNumber(cur.kisi)} + paket ${formatNumber(cur.paketKisi)}*)`} v="" small indent={1} />
            </>
          )}
        </Sec>

        {/* 1. Satış Kanalları Dökümü */}
        <Sec title="SATIŞ KANALLARI DÖKÜMÜ">
          {kanalRows.length ? (
            <>
              {kanalRows.map(({ r, brands }, i) => (
                <div key={r.id}>
                  <Head mt={i === 0 ? 0 : 5}>{r.name}</Head>
                  {brands.map(({ mk, ciro, adet, online }) => (
                    <div key={mk.id}>
                      <Row indent={1} l={`${mk.name} :`} v={`${tl(ciro)} / ${formatNumber(adet)}`} />
                      {online !== 0 && <Row indent={2} l="Online:" v={tl(online)} />}
                    </div>
                  ))}
                </div>
              ))}
              <Rule heavy />
              <Head mt={0}>Toplam</Head>
              {markalar.map((mk) => (
                <div key={mk.id}>
                  <Row indent={1} l={`${mk.name} :`} v={`${tl(kanal.markaCiro?.[mk.id])} / ${formatNumber(markaFis(mk))}`} />
                  {num(kanal.markaOnline?.[mk.id]) !== 0 && <Row indent={2} l="Online:" v={tl(kanal.markaOnline[mk.id])} />}
                </div>
              ))}
              <Row indent={1} bold l="Toplam :" v={`${tl(kanal.ciroToplam)} / ${formatNumber(toplamFis)}`} />
              {num(kanal.onlineToplam) !== 0 && <Row indent={2} bold l="Online alacak toplam:" v={tl(kanal.onlineToplam)} />}
              <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 2 }}>
                Format: ciro / fiş (paket kanallarında paket) sayısı
                {(kanal.kisiToplam || 0) > 0 ? ` · Salon kişi: ${formatNumber(kanal.kisiToplam)}` : ''}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 700 }}>Kanal bilgisi girilmedi</div>
          )}
        </Sec>

        {/* 2. Ödeme tipleri */}
        <Sec title="ÖDEME TİPLERİ">
          <Head mt={0}>Nakit</Head>
          <Row indent={1} l="Toplam:" v={tl(nakit.toplam)} bold />
          <Row indent={1} l="Denge:" v={tl(nakit.denge)} />
          <Row indent={1} l="Suitable:" v={tl(nakit.suitable)} />
          <Row indent={1} small l="Z nakit fişi:" v={tl(zNakit)} />

          <Head>Kredi Kartı</Head>
          <Row indent={1} l="Toplam:" v={tl(kk.toplam)} bold />
          <Row indent={1} l="Denge:" v={tl(kk.denge)} />
          <Row indent={1} l="Suitable:" v={tl(kk.suitable)} />
          {bahsisKart > 0 && <Row indent={1} small l="+ Karttan çekilen bahşiş:" v={tl(bahsisKart)} />}
          <Row indent={1} small l="Z kredi kartı:" v={tl(zKK)} />
          {BANKA_ADLARI.map((ad, slot) =>
            slot < 2 || bankaToplamlari[slot] !== 0 ? <Row key={ad} indent={2} l={`${ad} gün sonu:`} v={tl(bankaToplamlari[slot])} /> : null
          )}
          {bankaGunSonu !== 0 ? (
            <Row bold l="Fark:" v={farkText(kkFark)} />
          ) : (
            <div style={{ fontSize: 10.5, fontWeight: 700, paddingLeft: 10 }}>Banka gün sonu girilmedi</div>
          )}

          {onlineKK.toplam !== 0 && (
            <>
              <Head>Online Kredi Kartı</Head>
              <Row indent={1} l="Toplam:" v={tl(onlineKK.toplam)} bold />
              <Row indent={1} l="Denge:" v={tl(onlineKK.denge)} />
              <Row indent={1} l="Suitable:" v={tl(onlineKK.suitable)} />
            </>
          )}

          {cari.toplam !== 0 && (
            <>
              <Head>Cari</Head>
              <Row indent={1} l="Toplam:" v={tl(cari.toplam)} bold />
              <Row indent={1} l="Denge:" v={tl(cari.denge)} />
              <Row indent={1} l="Suitable:" v={tl(cari.suitable)} />
            </>
          )}

          {yemek.map(([key, y]) => (
            <div key={key}>
              <Head>{key.charAt(0).toUpperCase() + key.slice(1)}</Head>
              <Row indent={1} l="Sistem:" v={tl(y.hesaplanan)} />
              <Row indent={2} l="Gün sonu:" v={tl(y.fiziki)} />
              <Row bold l="Fark:" v={farkText(y.fark)} />
            </div>
          ))}
        </Sec>

        {/* 3. Ara toplam */}
        <Sec title="ARA TOPLAM">
          <Row l="Devir:" v={tl(kasaGiris.devir)} />
          <Row l="+ Elden nakit girişi:" v={tl(kasaGiris.kasayaParaKondu)} />
          <Row l="+ Satıştan gelen nakit:" v={tl(nakit.toplam)} />
          <Rule heavy />
          <Row bold l="ARA TOPLAM:" v={tl(metrics.toplamNakitGiris)} />
        </Sec>

        {/* 4. Harcamalar */}
        <Sec title="HARCAMALAR">
          {harcamalar.length ? (
            harcamalar.map((h, i) => (
              <Row key={i} l={`${h.isKK ? '[KK] ' : ''}${h.title || 'Gider'}${h.aciklama ? ` (${String(h.aciklama).slice(0, 24)})` : ''}:`} v={tl(h.tutar)} />
            ))
          ) : (
            <div style={{ fontSize: 11, fontWeight: 700 }}>Gider girilmedi</div>
          )}
          <Rule heavy />
          <Row bold l="Nakit çıkan:" v={tl(nakitGider)} />
          {(metrics.kkHarcamalar || 0) > 0 && <Row l="KK ile ödenen:" v={tl(metrics.kkHarcamalar)} />}
        </Sec>

        {/* 5. Adisyon (kurye) ödemeleri */}
        <Sec title="ADİSYON ÖDEMELERİ">
          {kurye.length ? (
            <>
              {kurye.map((k, i) => (
                <Row key={i} l={`${k.name} (${formatNumber(k.count)}x${formatNumber(k.unit)}₺):`} v={tl(k.total)} />
              ))}
              <Rule heavy />
              <Row bold l={`Toplam (${formatNumber(metrics.kuryeToplamSiparisSayisi)} sipariş):`} v={tl(metrics.kuryeOdemeleriToplami)} />
            </>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 700 }}>Kurye ödemesi yok</div>
          )}
        </Sec>

        {/* 6. Tip ödemeleri */}
        <Sec title="TİP ÖDEMELERİ">
          {tips.length ? (
            <>
              {tips.map((t, i) => (
                <Row key={i} l={`${t.name} (kart ${tl(t.kart)}):`} v={tl(t.net)} />
              ))}
              <Rule heavy />
              <Row l="Karttan çekilen:" v={tl(metrics.tipCekilenKartToplami)} />
              <Row l="Kesinti:" v={tl(metrics.tipKesintiToplami)} />
              <Row bold l="Kasadan ödenen net nakit:" v={tl(metrics.tipNetNakitToplami)} />
            </>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 700 }}>Bahşiş ödemesi yok</div>
          )}
        </Sec>

        {/* 7. Kasa sonucu */}
        <Sec title="KASA SONUCU">
          <Row l="Ara toplam:" v={tl(metrics.toplamNakitGiris)} />
          <Row l="− Harcamalar (nakit):" v={tl(nakitGider)} indent={1} small />
          <Row l="− Adisyon ödemeleri:" v={tl(metrics.kuryeOdemeleriToplami)} indent={1} small />
          <Row l="− Tip ödemeleri (net):" v={tl(metrics.tipNetNakitToplami)} indent={1} small />
          <Rule heavy />
          <Row bold l="KASA SONUCU:" v={tl(metrics.hesaplananNakit)} />
          <Row bold l="SAYIM (fiziki):" v={tl(metrics.fizikiSayim)} />
          <Row bold l="Fark (sayım − kasa):" v={farkText(kasaFarki)} />
          <Rule />
          <Row l="Yarına devir:" v={tl(metrics.fizikiSayim)} />
        </Sec>

        {cur.paketKisi > 0 && (
          <div style={{ fontSize: 9.5, fontWeight: 700, paddingTop: 4 }}>* Paket kişi = sipariş × 1,5 (yukarı yuvarlanır)</div>
        )}

        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, paddingTop: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
          *** ÖZET GÜN SONU ***
        </div>
      </div>
    </div>,
    document.body
  );
}
