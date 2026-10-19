import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatNumber, num, BANKA_ADLARI } from '../utils/calculations';

/**
 * A5 gün sonu raporu (Excel taslağına göre).
 * Üst tablo: kanal × (Pide ciro/sayı, Tandır ciro/sayı, Toplam ciro/sayı). Salon'da "sayı" = kişi sayısı, diğer kanallarda adet (paket).
 * Alt bölüm "Masraflar": solda nakit sayımı, banka toplamları, yemek kartı gün sonu ve platform "cari" (online) tutarları,
 * sağda kurye, nakit masraf, bahşiş ve KK ile ödenen (harici) masraf listesi.
 * "Toplam" sütunu tüm markaları (Kıymalı dahil) kapsar.
 */

const INK = '#0f172a';
const GRID = '#334155';
const MUTE = '#64748b';
const tl = (v) => formatCurrency(v).replace(' ₺', ''); // A5'te sütun dar: ₺ işareti başlıkta
const n0 = (v) => formatNumber(v);

// Excel'deki kanal sırası ve adları
const EXCEL_SIRA = [
  ['restoran', 'Salon'],
  ['restoranPaket', 'Restoran Paket'],
  ['yemeksepeti', 'YemekSepeti'],
  ['trendyol', 'Trendyol'],
  ['migros', 'Migros'],
  ['fuudy', 'Fuudy'],
  ['tiklagelsin', 'Tıkla Gelsin'],
  ['suitable', 'Suitable Yemek'],
];
// "Cari" (platform online) satırları: Excel adı
const CARI_AD = {
  yemeksepeti: 'YemekSpt Cari',
  trendyol: 'Trendyol Cari',
  migros: 'Migros Cari',
  fuudy: 'Fuudy Cari',
  tiklagelsin: 'TıklaGls Cari',
  suitable: 'Suitable Cari',
};

const cell = (extra = {}) => ({ border: `1px solid ${GRID}`, padding: '1.5px 4px', fontSize: 9, lineHeight: 1.25, whiteSpace: 'nowrap', ...extra });

function Grup({ baslik, toplam, children }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: MUTE, borderBottom: `1px solid ${GRID}`, paddingBottom: 1, marginBottom: 1 }}>
        <span>{baslik}</span>
        {toplam !== undefined && <span style={{ color: INK }}>{tl(toplam)}</span>}
      </div>
      {children}
    </div>
  );
}

const Satir = ({ ad, tutar, soluk }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 9, lineHeight: 1.3, color: soluk ? MUTE : INK }}>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad}</span>
    <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{tl(tutar)}</span>
  </div>
);

export default function A5Report({ open, onClose, date, data, metrics }) {
  const view = useMemo(() => {
    if (!open || !data || !metrics) return null;
    const kanal = metrics.kanal || {};
    const markalar = data.kanalCiro?.markalar || [];
    const satirlar = data.kanalCiro?.satirlar || [];
    const b0 = markalar[0];
    const b1 = markalar[1];
    const z = data.zBilgileri || {};
    const cihazlar = z.posCihazlari || [];

    const byId = Object.fromEntries(satirlar.map((r) => [r.id, r]));
    const tot = (r) => kanal.satirToplamlari?.[r.id] || {};
    const dolu = (r) => {
      const t = tot(r);
      return (t.ciro || 0) !== 0 || (t.online || 0) !== 0 || (t.adet || 0) !== 0 || (t.kisi || 0) !== 0;
    };

    // Excel sırası (boş olsa da gösterilir) + Excel'de olmayan dolu kanallar (örn. Getir)
    const sirali = EXCEL_SIRA.map(([id, ad]) => ({ r: byId[id], ad })).filter((x) => x.r);
    const exIds = new Set(EXCEL_SIRA.map(([id]) => id));
    const ekstra = satirlar.filter((r) => !exIds.has(r.id) && dolu(r)).map((r) => ({ r, ad: r.name }));
    const kanalSatirlari = [...sirali, ...ekstra].map(({ r, ad }) => {
      const salon = r.sayiTuru === 'kisi';
      const sayi = (mk) => (mk ? num(salon ? r.kisi?.[mk.id] : r.adet?.[mk.id]) : 0);
      const t = tot(r);
      return {
        id: r.id,
        ad,
        pide: { ciro: b0 ? num(r.ciro?.[b0.id]) : 0, sayi: sayi(b0) },
        tandir: { ciro: b1 ? num(r.ciro?.[b1.id]) : 0, sayi: sayi(b1) },
        toplam: { ciro: t.ciro || 0, sayi: salon ? t.kisi || 0 : t.adet || 0 },
      };
    });
    const genel = kanalSatirlari.reduce(
      (a, k) => ({
        pideC: a.pideC + k.pide.ciro, pideS: a.pideS + k.pide.sayi,
        tanC: a.tanC + k.tandir.ciro, tanS: a.tanS + k.tandir.sayi,
        topC: a.topC + k.toplam.ciro, topS: a.topS + k.toplam.sayi,
      }),
      { pideC: 0, pideS: 0, tanC: 0, tanS: 0, topC: 0, topS: 0 }
    );

    // Sol blok: Z (sayım), V/Y (banka toplamları), U (yemek kartı gün sonu), N/O (platform online "cari")
    const bankaToplam = BANKA_ADLARI.map((_, slot) => cihazlar.reduce((a, d) => a + num(d.banka?.[slot]), 0));
    const sol = [
      { ad: 'Nakit (sayım)', v: metrics.fizikiSayim },
      { ad: BANKA_ADLARI[0], v: bankaToplam[0] },
      { ad: BANKA_ADLARI[1], v: bankaToplam[1] },
      ...(bankaToplam[2] ? [{ ad: BANKA_ADLARI[2], v: bankaToplam[2] }] : []),
      { ad: 'Multinet', v: z.multinet },
      { ad: 'Ticket', v: z.ticket },
      { ad: 'Sodexho', v: z.sodexho },
      { ad: 'Setcard', v: z.setcard },
      ...EXCEL_SIRA.filter(([id]) => CARI_AD[id] && byId[id]).map(([id]) => ({ ad: CARI_AD[id], v: tot(byId[id]).online || 0 })),
      ...ekstra.filter((x) => (tot(x.r).online || 0) !== 0).map((x) => ({ ad: `${x.ad} Cari`, v: tot(x.r).online })),
      { ad: 'Restoran Cari', v: null }, // Excel'de boş satır
    ];

    // Sağ blok: kurye (P), nakit masraf (R), bahşiş (T), KK ile ödenen masraf (S)
    const kurye = (data.kuryeOdemeleri || [])
      .map((k) => {
        const count = num(k.siparisSayisi);
        const unit = k.birimFiyat !== undefined && k.birimFiyat !== '' ? num(k.birimFiyat) : 20;
        const total = k.toplamTutar !== undefined && k.toplamTutar !== '' ? num(k.toplamTutar) : count * unit;
        return { ad: k.kuryeAdi || k.courierName || 'Kurye', v: total, count };
      })
      .filter((k) => k.count > 0 || k.v > 0);
    const harcamalar = (data.harcamalar || []).filter((h) => num(h.tutar) > 0);
    const nakitMasraf = harcamalar.filter((h) => !h.isKK).map((h) => ({ ad: h.title || 'Gider', v: num(h.tutar) }));
    const kkMasraf = harcamalar.filter((h) => !!h.isKK).map((h) => ({ ad: h.title || 'Gider', v: num(h.tutar) }));
    const tips = (data.tipOdemeleri || [])
      .map((t) => {
        const kart = num(t.cekilenTip);
        const rate = t.kesintiOrani !== undefined && t.kesintiOrani !== '' ? num(t.kesintiOrani) : 20;
        const net = t.netNakitTip !== undefined && t.netNakitTip !== '' ? num(t.netNakitTip) : kart - kart * (rate / 100);
        return { ad: t.personelAdi || t.staffName || 'Personel', v: net, kart };
      })
      .filter((t) => t.kart > 0 || t.v > 0);

    return { markalar, b0, b1, kanalSatirlari, genel, sol, kurye, nakitMasraf, kkMasraf, tips };
  }, [open, data, metrics]);

  if (!open || !view || typeof document === 'undefined') return null;
  const { b0, b1, kanalSatirlari, genel, sol, kurye, nakitMasraf, kkMasraf, tips } = view;
  const sum = (arr) => arr.reduce((a, x) => a + x.v, 0);

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'a5-page-style';
    style.textContent = '@media print { @page { size: A5 portrait; margin: 0; } }';
    document.head.appendChild(style);
    document.body.classList.add('printing-a5');
    const cleanup = () => {
      document.body.classList.remove('printing-a5');
      document.getElementById('a5-page-style')?.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  const longDate = new Date(date + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });
  const thB = (extra = {}) => cell({ fontWeight: 800, textAlign: 'center', background: '#f1f5f9', fontSize: 9, ...extra });
  const num_ = (extra = {}) => cell({ textAlign: 'right', ...extra });

  return createPortal(
    <div className="a5-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.65)', overflow: 'auto', padding: '16px 0' }}>
      <div className="a5-toolbar" style={{ width: '148mm', margin: '0 auto 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>A5 Gün Sonu Raporu — önizleme</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d9488', color: '#fff', border: 0, borderRadius: 10, padding: '7px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            <Printer size={15} /> Yazdır / PDF
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: INK, border: 0, borderRadius: 10, padding: '7px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <X size={15} /> Kapat
          </button>
        </div>
      </div>

      <div
        className="a5-sheet"
        style={{ width: '148mm', height: '210mm', margin: '0 auto', background: '#fff', color: INK, padding: '6mm 6mm 5mm', boxSizing: 'border-box', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.35)', fontFamily: '"Segoe UI", Arial, sans-serif', display: 'flex', flexDirection: 'column' }}
      >
        {/* Başlık */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px solid ${INK}`, paddingBottom: 3, marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 900 }}>YRN Restoran · Gün Sonu</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{longDate}</span>
        </div>

        {/* Kanal tablosu */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '25%' }} />
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                <col style={{ width: '17.5%' }} />
                <col style={{ width: '7.5%' }} />
              </React.Fragment>
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={thB()} />
              <th style={thB()} colSpan={2}>{b0?.name || 'Pide'}</th>
              <th style={thB()} colSpan={2}>{b1?.name || 'Tandır'}</th>
              <th style={thB()} colSpan={2}>Toplam</th>
            </tr>
            <tr>
              <th style={thB()} />
              {[0, 1, 2].map((i) => (
                <React.Fragment key={i}>
                  <th style={thB({ fontWeight: 700 })}>Ciro ₺</th>
                  <th style={thB({ fontWeight: 700 })}>Sayı</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {kanalSatirlari.map((k) => (
              <tr key={k.id}>
                <td style={cell({ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' })}>{k.ad}</td>
                <td style={num_()}>{k.pide.ciro ? tl(k.pide.ciro) : ''}</td>
                <td style={num_()}>{k.pide.sayi ? n0(k.pide.sayi) : ''}</td>
                <td style={num_()}>{k.tandir.ciro ? tl(k.tandir.ciro) : ''}</td>
                <td style={num_()}>{k.tandir.sayi ? n0(k.tandir.sayi) : ''}</td>
                <td style={num_({ fontWeight: 800 })}>{k.toplam.ciro ? tl(k.toplam.ciro) : ''}</td>
                <td style={num_({ fontWeight: 800 })}>{k.toplam.sayi ? n0(k.toplam.sayi) : ''}</td>
              </tr>
            ))}
            <tr style={{ background: '#f1f5f9' }}>
              <td style={cell({ fontWeight: 900 })}>Toplam</td>
              <td style={num_({ fontWeight: 900 })}>{tl(genel.pideC)}</td>
              <td style={num_({ fontWeight: 900 })}>{n0(genel.pideS)}</td>
              <td style={num_({ fontWeight: 900 })}>{tl(genel.tanC)}</td>
              <td style={num_({ fontWeight: 900 })}>{n0(genel.tanS)}</td>
              <td style={num_({ fontWeight: 900 })}>{tl(genel.topC)}</td>
              <td style={num_({ fontWeight: 900 })}>{n0(genel.topS)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: 7.5, color: MUTE, marginTop: 2 }}>
          Sayı: Salon'da kişi sayısı, diğer kanallarda paket adedi. Toplam sütunu tüm markaları (Kıymalı dahil) içerir.
        </div>

        {/* Masraflar ayırıcı */}
        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, margin: '7px 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ flex: 1, borderTop: `1.5px dashed ${GRID}` }} />
          <span>Masraflar</span>
          <span style={{ flex: 1, borderTop: `1.5px dashed ${GRID}` }} />
        </div>

        {/* Alt bölüm: sol değerler + sağ liste */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {sol.map((x) => (
                  <tr key={x.ad}>
                    <td style={cell({ fontWeight: 700 })}>{x.ad}</td>
                    <td style={num_({ fontWeight: 700, width: '45%' })}>{x.v === null ? '' : tl(x.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ border: `1px solid ${GRID}`, padding: '3px 5px', overflow: 'hidden' }}>
            <Grup baslik="Kurye" toplam={kurye.length ? sum(kurye) : undefined}>
              {kurye.length ? kurye.map((k, i) => <Satir key={i} ad={k.ad} tutar={k.v} />) : <Satir ad="—" tutar={0} soluk />}
            </Grup>
            <Grup baslik="Masraf (nakit)" toplam={nakitMasraf.length ? sum(nakitMasraf) : undefined}>
              {nakitMasraf.length ? nakitMasraf.map((m, i) => <Satir key={i} ad={m.ad} tutar={m.v} />) : <Satir ad="—" tutar={0} soluk />}
            </Grup>
            <Grup baslik="Bahşiş (net nakit)" toplam={tips.length ? sum(tips) : undefined}>
              {tips.length ? tips.map((t, i) => <Satir key={i} ad={t.ad} tutar={t.v} />) : <Satir ad="—" tutar={0} soluk />}
            </Grup>
            <Grup baslik="Masraf (KK · harici)" toplam={kkMasraf.length ? sum(kkMasraf) : undefined}>
              {kkMasraf.length ? kkMasraf.map((m, i) => <Satir key={i} ad={m.ad} tutar={m.v} />) : <Satir ad="—" tutar={0} soluk />}
            </Grup>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 3, borderTop: `1px solid ${GRID}`, fontSize: 7.5, color: MUTE, display: 'flex', justifyContent: 'space-between' }}>
          <span>YRN Kasa · {longDate}</span>
          <span>Hazırlanma: {new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
