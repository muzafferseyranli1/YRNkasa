import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatNumber, num, resolvePosMarka, buildSummary, shiftDate, BANKA_ADLARI } from '../utils/calculations';

/**
 * ÖZET ADİSYON (80mm): tek bakışta gün sonu.
 * Özet (satış/fiş/ortalama) → ödeme tipleri (tip | toplam) → kanallar (marka blok + toplam blok)
 * → Z toplamları (Z nakit, Z kredi kartı, banka toplamları) → yemek kartı gün sonu.
 * Kanal tabloları dar kâğıda sığsın diye tutarlar kuruşsuz (yuvarlanmış) basılır.
 */

const INK = '#000';
const fmt0 = (v) => Math.round(num(v)).toLocaleString('tr-TR');
const tl = (v) => formatCurrency(v);
const okv = (v) => Math.abs(num(v)) <= 0.05;
const delta = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const dText = (d) => (d === null ? '' : ` ${d >= 0 ? '+' : '-'}%${Math.abs(d).toFixed(1).replace('.', ',')}`);
const shortDay = (dateStr) => new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
const dateLabel = (dateStr) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' });

const Sec = ({ title, children }) => (
  <div style={{ padding: '5px 0', borderBottom: `2px solid ${INK}` }}>
    <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', paddingBottom: 2, marginBottom: 4, borderBottom: `1px solid ${INK}` }}>
      --- {title} ---
    </div>
    {children}
  </div>
);

const Row = ({ l, v, bold, small, indent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: small ? 10 : 12, fontWeight: bold ? 900 : 700, paddingLeft: indent ? 8 : 0, lineHeight: 1.35 }}>
    <span>{l}</span>
    <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{v}</span>
  </div>
);

const tbl = { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 11, fontWeight: 700 };
const th = (align = 'right') => ({ textAlign: align, fontSize: 9.5, fontWeight: 900, padding: '1px 2px', borderBottom: `1px solid ${INK}`, textTransform: 'uppercase' });
const td = (align = 'right', bold = false) => ({ textAlign: align, padding: '1px 2px', fontWeight: bold ? 900 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
const totalRow = { borderTop: `1.5px solid ${INK}` };

export default function SummaryReceipt({ open, onClose, date, data, metrics, prev = { exists: false, metrics: null } }) {
  if (!open || !data || !metrics || typeof document === 'undefined') return null;

  const markalar = data.kanalCiro?.markalar || [];
  const satirlar = data.kanalCiro?.satirlar || [];
  const kanal = metrics.kanal || {};
  const dp = data.dengePos || {};
  const sp = data.suitablePos || {};
  const z = data.zBilgileri || {};
  const cihazlar = z.posCihazlari || [];

  // ---- Özet ----
  const { cur, old, hasPrev, ort, ortPrev } = buildSummary(metrics, prev.metrics);
  const prevDate = shiftDate(date, -7);

  // ---- Ödeme tipleri (Denge + Suitable + marka birleşik) ----
  const pm = resolvePosMarka(data.posMarka, markalar, dp, sp);
  const tipler = [
    ['Nakit', 'nakit', true],
    ['Kredi Kartı', 'krediKarti', true],
    ['Online Kredi Kartı', 'onlineKrediKarti', false],
    ['Cari', 'cari', false],
    ['Sodexho', 'sodexho', false],
    ['Multinet', 'multinet', false],
    ['Ticket', 'ticket', false],
    ['Setcard', 'setcard', false],
  ];
  const odemeRows = tipler
    .map(([label, key, always]) => ({
      label,
      key,
      total: markalar.reduce((t, mk) => t + num(pm[mk.id]?.denge?.[key]) + num(pm[mk.id]?.suitable?.[key]), 0),
      always,
    }))
    .filter((r) => r.always || r.total !== 0);
  const odemeToplam = odemeRows.reduce((t, r) => t + r.total, 0);

  // ---- Kanallar ----
  const kanalRows = satirlar.filter((r) => {
    const t = kanal.satirToplamlari?.[r.id] || {};
    return (t.ciro || 0) !== 0 || (t.online || 0) !== 0 || (t.adet || 0) !== 0;
  });
  const adetToplam = (kanal.paketToplam || 0) + (kanal.salonFisToplam || 0);

  // ---- Z toplamları ----
  const zNakit = cihazlar.reduce((a, d) => a + num(d.nakit), 0);
  const zKK = cihazlar.reduce((a, d) => a + num(d.krediKarti), 0);
  const bankaToplamlari = BANKA_ADLARI.map((_, slot) => cihazlar.reduce((a, d) => a + num(d.banka?.[slot]), 0));

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
      <div className="sum-toolbar" style={{ width: '82mm', margin: '0 auto 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
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
        style={{ width: '78mm', margin: '0 auto', background: '#fff', color: INK, padding: '2mm 2mm 3mm', boxSizing: 'border-box', boxShadow: '0 10px 40px rgba(0,0,0,0.35)', fontFamily: '"Segoe UI", Arial, sans-serif' }}
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
          <Row l="TOPLAM SATIŞ:" v={`${tl(cur.toplam)}${hasPrev ? dText(delta(cur.toplam, old.toplam)) : ''}`} bold />
          <Row l="Salon:" v={`${tl(cur.salon)}${hasPrev ? dText(delta(cur.salon, old.salon)) : ''}`} />
          <Row l={`${formatNumber(cur.salonFis)} fiş · ort.`} v={tl(ort.salon)} small indent />
          <Row l="Paket:" v={`${tl(cur.paket)}${hasPrev ? dText(delta(cur.paket, old.paket)) : ''}`} />
          <Row l={`${formatNumber(cur.paketFis)} fiş · ort.`} v={tl(ort.paket)} small indent />
          <Row l="Fiş Sayısı:" v={`${formatNumber(cur.fis)}${hasPrev ? dText(delta(cur.fis, old.fis)) : ''}`} />
          <Row l="Ortalama Fiş:" v={`${tl(ort.toplam)}${hasPrev ? dText(delta(ort.toplam, ortPrev.toplam)) : ''}`} />
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>
            {hasPrev ? `Kıyas: geçen hf. ${shortDay(prevDate)} → ${tl(old.toplam)} · ${formatNumber(old.fis)} fiş` : 'Geçen hafta aynı gün kaydı yok'}
          </div>
        </Sec>

        {/* Ödeme tipleri: tip | toplam */}
        <Sec title="ÖDEME TİPLERİ">
          <table style={tbl}>
            <tbody>
              {odemeRows.map((r) => (
                <tr key={r.key}>
                  <td style={td('left')}>{r.label}</td>
                  <td style={td('right', true)}>{tl(r.total)}</td>
                </tr>
              ))}
              <tr style={totalRow}>
                <td style={td('left', true)}>TOPLAM</td>
                <td style={td('right', true)}>{tl(odemeToplam)}</td>
              </tr>
            </tbody>
          </table>
        </Sec>

        {/* Kanallar: marka bloğu + toplam bloğu */}
        {kanalRows.length > 0 && (
          <Sec title="SATIŞ KANALLARI">
            <table style={tbl}>
              <colgroup>
                <col style={{ width: '31%' }} />
                {markalar.map((mk) => (
                  <col key={mk.id} style={{ width: `${69 / Math.max(markalar.length, 1)}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th style={th('left')}>Kanal</th>
                  {markalar.map((mk) => (
                    <th key={mk.id} style={th()}>{mk.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kanalRows.map((r) => (
                  <tr key={r.id}>
                    <td style={td('left')}>{r.name}</td>
                    {markalar.map((mk) => (
                      <td key={mk.id} style={td()}>{fmt0(r.ciro?.[mk.id])}</td>
                    ))}
                  </tr>
                ))}
                <tr style={totalRow}>
                  <td style={td('left', true)}>TOPLAM</td>
                  {markalar.map((mk) => (
                    <td key={mk.id} style={td('right', true)}>{fmt0(kanal.markaCiro?.[mk.id])}</td>
                  ))}
                </tr>
              </tbody>
            </table>

            <div style={{ borderTop: `1px dashed ${INK}`, margin: '5px 0 3px' }} />

            <table style={tbl}>
              <colgroup>
                <col style={{ width: '31%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '19%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={th('left')}>Kanal</th>
                  <th style={th()}>Ciro</th>
                  <th style={th()}>Online</th>
                  <th style={th()}>Adet</th>
                </tr>
              </thead>
              <tbody>
                {kanalRows.map((r) => {
                  const t = kanal.satirToplamlari?.[r.id] || {};
                  return (
                    <tr key={r.id}>
                      <td style={td('left')}>{r.name}</td>
                      <td style={td()}>{fmt0(t.ciro)}</td>
                      <td style={td()}>{(t.online || 0) ? fmt0(t.online) : '-'}</td>
                      <td style={td()}>{formatNumber(t.adet || 0)}</td>
                    </tr>
                  );
                })}
                <tr style={totalRow}>
                  <td style={td('left', true)}>TOPLAM</td>
                  <td style={td('right', true)}>{fmt0(kanal.ciroToplam)}</td>
                  <td style={td('right', true)}>{fmt0(kanal.onlineToplam)}</td>
                  <td style={td('right', true)}>{formatNumber(adetToplam)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 2 }}>
              Tutarlar ₺, kuruşsuz yuvarlanmıştır. Paket: {formatNumber(kanal.paketToplam)} · Salon fiş: {formatNumber(kanal.salonFisToplam)}
              {(kanal.kisiToplam || 0) > 0 ? ` · Kişi: ${formatNumber(kanal.kisiToplam)}` : ''}
            </div>
          </Sec>
        )}

        {/* Z toplamları */}
        <Sec title="Z TOPLAMLARI">
          <Row l="Z Nakit Fişi Toplamı:" v={tl(zNakit)} bold />
          <Row l="Z Kredi Kartı Toplamı:" v={tl(zKK)} bold />
          {BANKA_ADLARI.map((ad, slot) => (
            <Row key={ad} l={`${ad} Toplamı:`} v={tl(bankaToplamlari[slot])} />
          ))}
        </Sec>

        {/* Yemek kartı gün sonu */}
        <Sec title="YEMEK KARTI GÜN SONU">
          <table style={tbl}>
            <colgroup>
              <col style={{ width: '32%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th('left')}>Kart</th>
                <th style={th()}>Gün Sonu</th>
                <th style={th()}>Fark</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics.yemekKartlari || {}).map(([key, y]) => (
                <tr key={key}>
                  <td style={td('left')}>{key.charAt(0).toUpperCase() + key.slice(1)}</td>
                  <td style={td()}>{tl(y.fiziki)}</td>
                  <td style={td('right', true)}>{okv(y.fark) ? '✓' : tl(y.fark)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 2 }}>Fark = gün sonu − sistem satışı</div>
        </Sec>

        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, paddingTop: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
          *** ÖZET GÜN SONU ***
        </div>
      </div>
    </div>,
    document.body
  );
}
