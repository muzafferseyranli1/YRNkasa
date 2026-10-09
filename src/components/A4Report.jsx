import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import {
  formatCurrency,
  formatNumber,
  num,
  resolvePosMarka,
  buildSummary,
  shiftDate,
} from '../utils/calculations';

/**
 * A4 tek sayfa gün sonu raporu. Sıra: özet kartları → devir / ekstra nakit → ödeme tipleri dökümü (marka kırılımlı)
 * → satış kanalları dökümü → ara toplam (nakit) → online nakit fişi → kredi kartı → yemek çeki karşılaştırmaları
 * → masraflar → kurye → bahşiş → ara toplam − çıkışlar → kasa sonucu → sayım.
 */

const C = {
  ink: '#0f172a',
  mute: '#64748b',
  line: '#e2e8f0',
  soft: '#f8fafc',
  brand: '#ea580c',
  indigo: '#4f46e5',
  sky: '#0284c7',
  emerald: '#059669',
  rose: '#e11d48',
  amber: '#d97706',
};

const dayName = (dateStr) => new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long' });
const longDate = (dateStr) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
const shortDay = (dateStr) => new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const fmtPct = (v) => `${Math.abs(v).toFixed(1).replace('.', ',')}%`;
const tl = (v) => formatCurrency(v);
const ok = (v) => Math.abs(num(v)) <= 0.05;

// ---- Küçük parçalar ----

function Section({ title, right, children, style }) {
  return (
    <div className="a4-card" style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '5px 9px', background: '#fff', minWidth: 0, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2, gap: 6 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: C.ink }}>{title}</span>
        {right && <span style={{ fontSize: 8.5, color: C.mute, fontWeight: 600, whiteSpace: 'nowrap' }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

function Delta({ v }) {
  if (v === null) return <span style={{ color: C.mute, fontSize: 9 }}>—</span>;
  const up = v >= 0;
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 800,
        color: up ? C.emerald : C.rose,
        background: up ? '#ecfdf5' : '#fff1f2',
        padding: '0 5px',
        borderRadius: 99,
        whiteSpace: 'nowrap',
      }}
    >
      {up ? '▲' : '▼'} {fmtPct(v)}
    </span>
  );
}

function Kpi({ label, value, sub, accent, delta, prevText }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderTop: `3px solid ${accent}`, borderRadius: 8, padding: '5px 8px', background: '#fff', minWidth: 0 }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: C.mute }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: C.ink, lineHeight: 1.2, marginTop: 1, whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 8.5, color: C.mute, marginTop: 1 }}>{sub}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, fontSize: 8.5, color: C.mute, minHeight: 13 }}>
        {delta !== undefined && <Delta v={delta} />}
        <span style={{ whiteSpace: 'nowrap' }}>{prevText}</span>
      </div>
    </div>
  );
}

const cellBase = { padding: '0.5px 4px', fontSize: 9, lineHeight: 1.25, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };
const Th = ({ children, align = 'right', span, bg, color }) => (
  <th colSpan={span} style={{ ...cellBase, textAlign: align, fontWeight: 800, color: color || C.mute, fontSize: 8.5, textTransform: 'uppercase', background: bg }}>
    {children}
  </th>
);
const Td = ({ children, align = 'right', bold, color, bg, span, size }) => (
  <td colSpan={span} style={{ ...cellBase, textAlign: align, fontWeight: bold ? 800 : 600, color: color || C.ink, background: bg, ...(size ? { fontSize: size } : {}) }}>
    {children}
  </td>
);

// Etiket – değer satırı (karşılaştırma kutuları için)
function Line({ label, value, bold, color, top, tone }) {
  const bg = tone === 'ok' ? '#ecfdf5' : tone === 'bad' ? '#fff1f2' : undefined;
  const fg = tone === 'ok' ? '#065f46' : tone === 'bad' ? '#9f1239' : color || C.ink;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 6,
        padding: '0.5px 4px',
        fontSize: 9,
        lineHeight: 1.25,
        borderTop: top ? `1px solid ${C.mute}` : `1px solid ${C.line}`,
        background: bg,
        borderRadius: tone ? 4 : 0,
        fontWeight: bold ? 800 : 600,
        color: fg,
      }}
    >
      <span style={{ color: tone ? fg : bold ? C.ink : C.mute }}>{label}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

const diffLabel = (d) => (ok(d) ? '✓ Tam' : tl(d));

function Box({ label, value, color, sub, bg, big }) {
  return (
    <div style={{ background: bg || C.soft, borderRadius: 7, padding: '4px 8px', minWidth: 0 }}>
      <div style={{ fontSize: 8, fontWeight: 800, color: C.mute, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: big ? 14 : 11.5, fontWeight: 900, color: color || C.ink, whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 8, color: C.mute }}>{sub}</div>}
    </div>
  );
}

const Op = ({ children }) => (
  <div style={{ alignSelf: 'center', fontSize: 14, fontWeight: 900, color: C.mute, padding: '0 1px' }}>{children}</div>
);

// ---- Ana bileşen ----

export default function A4Report({ open, onClose, date, data, metrics, prev = { exists: false, metrics: null } }) {
  const prevDate = shiftDate(date, -7);

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'a4-page-style';
    style.textContent = '@media print { @page { size: A4 portrait; margin: 0; } }';
    document.head.appendChild(style);
    document.body.classList.add('printing-a4');
    const cleanup = () => {
      document.body.classList.remove('printing-a4');
      document.getElementById('a4-page-style')?.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  const view = useMemo(() => {
    if (!open || !data || !metrics) return null;
    const kanal = metrics.kanal || {};
    const markalar = data.kanalCiro?.markalar || [];
    const satirlar = data.kanalCiro?.satirlar || [];
    const dp = data.dengePos || {};
    const sp = data.suitablePos || {};

    // ---- Özet kartları (bu gün + geçen hafta aynı gün) ----
    const { cur, old } = buildSummary(metrics, prev.metrics);

    // ---- Ödeme tipleri dökümü (Denge + Suitable birleşik, marka kırılımlı) ----
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
    const brandVal = (mk, key) => num(pm[mk.id]?.denge?.[key]) + num(pm[mk.id]?.suitable?.[key]);
    const odemeRows = tipler
      .map(([label, key, always]) => {
        const brands = markalar.map((mk) => brandVal(mk, key));
        return { label, key, brands, total: brands.reduce((t, v) => t + v, 0), always };
      })
      .filter((r) => r.always || r.total !== 0);
    const odemeBrandTotals = markalar.map((mk, i) => odemeRows.reduce((t, r) => t + r.brands[i], 0));
    const odemeToplam = odemeBrandTotals.reduce((t, v) => t + v, 0);

    // ---- Satış kanalları dökümü ----
    const kanalRows = satirlar.filter((r) => {
      const t = kanal.satirToplamlari?.[r.id] || {};
      return (t.ciro || 0) !== 0 || (t.online || 0) !== 0 || (t.adet || 0) !== 0 || (t.kisi || 0) !== 0;
    });

    // ---- Nakit akışı ----
    const nakitSatis = num(dp.nakit) + num(sp.nakit);
    const onlineKK = num(dp.onlineKrediKarti) + num(sp.onlineKrediKarti);
    const satisKK = num(dp.krediKarti) + num(sp.krediKarti);

    // ---- Masraflar / kurye / bahşiş ----
    const harcamalar = (data.harcamalar || []).filter((h) => num(h.tutar) > 0);
    const kurye = (data.kuryeOdemeleri || [])
      .map((k) => {
        const count = num(k.siparisSayisi);
        const unit = k.birimFiyat !== undefined && k.birimFiyat !== '' ? num(k.birimFiyat) : 20;
        const total = k.toplamTutar !== undefined && k.toplamTutar !== '' ? num(k.toplamTutar) : count * unit;
        return { name: k.kuryeAdi || k.courierName || 'Kurye', count, unit, total };
      })
      .filter((k) => k.count > 0 || k.total > 0);
    const tips = (data.tipOdemeleri || [])
      .map((t) => {
        const cekilen = num(t.cekilenTip);
        const rate = t.kesintiOrani !== undefined && t.kesintiOrani !== '' ? num(t.kesintiOrani) : 20;
        const net = t.netNakitTip !== undefined && t.netNakitTip !== '' ? num(t.netNakitTip) : cekilen - cekilen * (rate / 100);
        return { name: t.personelAdi || t.staffName || 'Personel', cekilen, net };
      })
      .filter((t) => t.cekilen > 0 || t.net > 0);

    return {
      cur, old, markalar, odemeRows, odemeBrandTotals, odemeToplam, kanalRows, nakitSatis, onlineKK, satisKK,
      harcamalar, kurye, tips,
    };
  }, [open, data, metrics, prev]);

  if (!open || !view || typeof document === 'undefined') return null;

  const {
    cur, old, markalar, odemeRows, odemeBrandTotals, odemeToplam, kanalRows, nakitSatis, onlineKK, satisKK,
    harcamalar, kurye, tips,
  } = view;
  const kanal = metrics.kanal || {};
  const { hasPrev, ort, ortPrev } = buildSummary(metrics, prev.metrics);
  const ortFis = ort.toplam;
  const ortFisPrev = ortPrev.toplam;
  const ortSalon = ort.salon;
  const ortSalonPrev = ortPrev.salon;
  const ortPaket = ort.paket;
  const ortPaketPrev = ortPrev.paket;
  const kasaFarki = metrics.kasaFarki || 0;
  const prevTag = hasPrev ? `geçen hf. ${shortDay(prevDate)}` : 'geçen hafta kaydı yok';
  // Masraf kalemlerinin hepsi gösterilir; 6'dan fazlaysa Masraflar tam genişlik ve 3 sütun olur
  const cokMasraf = harcamalar.length > 6;

  return createPortal(
    <div className="a4-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.65)', overflow: 'auto', padding: '16px 0' }}>
      <div className="a4-toolbar" style={{ maxWidth: '210mm', margin: '0 auto 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>A4 Gün Sonu Raporu — önizleme</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.brand, color: '#fff', border: 0, borderRadius: 10, padding: '7px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            <Printer size={15} /> Yazdır / PDF
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: C.ink, border: 0, borderRadius: 10, padding: '7px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <X size={15} /> Kapat
          </button>
        </div>
      </div>

      <div
        className="a4-sheet"
        style={{
          width: '210mm',
          height: '297mm',
          margin: '0 auto',
          background: '#fff',
          boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
          padding: '6mm 8mm 5mm',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif',
          color: C.ink,
        }}
      >
        {/* Başlık */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5, borderBottom: `2.5px solid ${C.brand}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.brand, color: '#fff', fontWeight: 900, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>YRN</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.1 }}>Gün Sonu Raporu</div>
              <div style={{ fontSize: 9, color: C.mute, fontWeight: 600 }}>YRN Restoran · Günlük kasa kapanış raporu</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 900 }}>{longDate(date)}</div>
            <div style={{ fontSize: 9, color: C.mute, fontWeight: 700, textTransform: 'capitalize' }}>
              {dayName(date)} · kıyas: geçen {dayName(prevDate)} ({shortDay(prevDate)})
            </div>
          </div>
        </div>

        {/* 1. Özet kartları (not: geçen hafta aynı gün) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          <Kpi label="Toplam Satış" value={tl(cur.toplam)} accent={C.brand} delta={hasPrev ? pct(cur.toplam, old.toplam) : undefined} prevText={hasPrev ? `${prevTag}: ${tl(old.toplam)}` : prevTag} />
          <Kpi label="Salon" value={tl(cur.salon)} accent={C.indigo} sub={`${formatNumber(cur.salonFis)} fiş · ort. ${tl(ortSalon)}`} delta={hasPrev ? pct(cur.salon, old.salon) : undefined} prevText={hasPrev ? `${prevTag}: ${tl(old.salon)}` : prevTag} />
          <Kpi label="Paket" value={tl(cur.paket)} accent={C.sky} sub={`${formatNumber(cur.paketFis)} fiş · ort. ${tl(ortPaket)}`} delta={hasPrev ? pct(cur.paket, old.paket) : undefined} prevText={hasPrev ? `${prevTag}: ${tl(old.paket)}` : prevTag} />
          <Kpi label="Fiş Sayısı" value={formatNumber(cur.fis)} accent={C.amber} sub={`Salon ${formatNumber(cur.salonFis)} · Paket ${formatNumber(cur.paketFis)}`} delta={hasPrev ? pct(cur.fis, old.fis) : undefined} prevText={hasPrev ? `${prevTag}: ${formatNumber(old.fis)}` : prevTag} />
          <Kpi label="Ortalama Fiş" value={tl(ortFis)} accent={C.emerald} sub="satış ÷ fiş" delta={hasPrev ? pct(ortFis, ortFisPrev) : undefined} prevText={hasPrev ? `${prevTag}: ${tl(ortFisPrev)}` : prevTag} />
        </div>

        {/* 2-3. Devir ve ekstra nakit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {[
            ['Bir gün önceden devreden nakit', data.kasaGiris?.devir],
            ['Extra eklenen nakit (gün içi kasaya konan)', data.kasaGiris?.kasayaParaKondu],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', background: C.soft, borderRadius: 6, padding: '3px 8px' }}>
              <span style={{ fontSize: 8.5, fontWeight: 800, color: C.mute, textTransform: 'uppercase' }}>{l}</span>
              <span style={{ fontSize: 11.5, fontWeight: 900 }}>{tl(v)}</span>
            </div>
          ))}
        </div>

        {/* 4. Ödeme tipleri dökümü */}
        <Section title="Ödeme Tipleri Dökümü" right={`DengePOS ${tl(metrics.dengePosToplam)} · Suitable ${tl(metrics.suitablePosToplam)}`}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="left">Ödeme tipi</Th>
                {markalar.map((mk) => (
                  <Th key={mk.id}>{mk.name}</Th>
                ))}
                <Th>Toplam</Th>
              </tr>
            </thead>
            <tbody>
              {odemeRows.map((r) => (
                <tr key={r.key}>
                  <Td align="left" bold>{r.label}</Td>
                  {r.brands.map((v, i) => (
                    <Td key={i} color={v === 0 ? '#cbd5e1' : undefined}>{tl(v)}</Td>
                  ))}
                  <Td bold>{tl(r.total)}</Td>
                </tr>
              ))}
              <tr>
                <Td align="left" bold bg="#fff7ed">TOPLAM</Td>
                {odemeBrandTotals.map((v, i) => (
                  <Td key={i} bold bg="#fff7ed">{tl(v)}</Td>
                ))}
                <Td bold bg="#fff7ed" color={C.brand}>{tl(odemeToplam)}</Td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* 5. Satış kanalları dökümü */}
        <Section title="Satış Kanalları Dökümü" right="ciro · online alacak · adet (Salon: fiş, kişi bilgi)">
          {kanalRows.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th align="left" span={1}>Kanal</Th>
                  {[...markalar, { id: '_t', name: 'Toplam' }].map((mk) => (
                    <Th key={mk.id} span={3} align="center" bg={mk.id === '_t' ? '#fff7ed' : undefined}>{mk.name}</Th>
                  ))}
                </tr>
                <tr>
                  <Th align="left" />
                  {[...markalar, { id: '_t' }].map((mk) => (
                    <React.Fragment key={mk.id}>
                      <Th>Ciro</Th>
                      <Th color={C.sky}>Online</Th>
                      <Th>Adet</Th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kanalRows.map((r) => {
                  const t = kanal.satirToplamlari?.[r.id] || {};
                  return (
                    <tr key={r.id}>
                      <Td align="left" bold>
                        {r.name}
                        {r.sayiTuru === 'kisi' && (t.kisi || 0) > 0 && (
                          <span style={{ color: C.mute, fontWeight: 500, fontSize: 8 }}> ({formatNumber(t.kisi)} kişi)</span>
                        )}
                      </Td>
                      {markalar.map((mk) => (
                        <React.Fragment key={mk.id}>
                          <Td>{tl(r.ciro?.[mk.id])}</Td>
                          <Td color={C.sky}>{num(r.online?.[mk.id]) ? tl(r.online[mk.id]) : '—'}</Td>
                          <Td>{num(r.adet?.[mk.id]) ? formatNumber(r.adet[mk.id]) : '—'}</Td>
                        </React.Fragment>
                      ))}
                      <Td bold>{tl(t.ciro)}</Td>
                      <Td bold color={C.sky}>{(t.online || 0) ? tl(t.online) : '—'}</Td>
                      <Td bold>{formatNumber(t.adet || 0)}</Td>
                    </tr>
                  );
                })}
                <tr>
                  <Td align="left" bold bg="#fff7ed">TOPLAM</Td>
                  {markalar.map((mk) => (
                    <React.Fragment key={mk.id}>
                      <Td bold bg="#fff7ed">{tl(kanal.markaCiro?.[mk.id])}</Td>
                      <Td bold bg="#fff7ed" color={C.sky}>{tl(kanal.markaOnline?.[mk.id])}</Td>
                      <Td bold bg="#fff7ed">{formatNumber((kanal.markaPaket?.[mk.id] || 0) + (kanal.markaSalonFis?.[mk.id] || 0))}</Td>
                    </React.Fragment>
                  ))}
                  <Td bold bg="#fff7ed" color={C.brand}>{tl(kanal.ciroToplam)}</Td>
                  <Td bold bg="#fff7ed" color={C.sky}>{tl(kanal.onlineToplam)}</Td>
                  <Td bold bg="#fff7ed">{formatNumber((kanal.paketToplam || 0) + (kanal.salonFisToplam || 0))}</Td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 9.5, color: C.mute }}>Kanal bilgisi girilmedi</div>
          )}
          {metrics.kanalGirildi && (
            <div style={{ display: 'flex', gap: 14, marginTop: 3, fontSize: 8.5, fontWeight: 700, color: C.mute }}>
              <span>
                Kanal ciro ↔ POS satış:{' '}
                <b style={{ color: ok(metrics.kanalCiroFarki) ? C.emerald : C.rose }}>{diffLabel(metrics.kanalCiroFarki)}</b>
              </span>
              {metrics.onlineKontrolVar && (
                <span>
                  Online alacak ↔ POS online KK:{' '}
                  <b style={{ color: ok(metrics.kanalOnlineFarki) ? C.emerald : C.rose }}>{diffLabel(metrics.kanalOnlineFarki)}</b>
                </span>
              )}
              <span>Toplam paket: <b style={{ color: C.ink }}>{formatNumber(kanal.paketToplam)}</b></span>
            </div>
          )}
        </Section>

        {/* 6. Ara toplam (devir + extra + satıştan gelen nakit) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1.3fr', gap: 5 }}>
          <Box label="Devir" value={tl(data.kasaGiris?.devir)} />
          <Op>+</Op>
          <Box label="Extra konan nakit" value={tl(data.kasaGiris?.kasayaParaKondu)} />
          <Op>+</Op>
          <Box label="Satıştan gelen nakit" value={tl(nakitSatis)} />
          <Op>=</Op>
          <Box label="ARA TOPLAM" value={tl(metrics.toplamNakitGiris)} color={C.brand} bg="#fff7ed" big />
        </div>

        {/* 7-8. Online nakit fişi + kredi kartı karşılaştırması */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 6 }}>
          <Section title="Online Satış · Kesilen Nakit Fişi">
            <Line label="Nakit satış" value={tl(nakitSatis)} />
            <Line label="+ Online kredi kartı satış" value={tl(onlineKK)} />
            <Line label="= Kesilmesi gereken nakit fişi" value={tl(metrics.kesilmesiGerekenNakitFisi)} bold top />
            <Line label="Kesilen Z nakit fişleri" value={tl(metrics.kesilenNakitFisi)} bold />
            <Line label="Fark" value={ok(metrics.nakitFisFarki) ? '✓ Tam' : `${tl(metrics.nakitFisFarki)} ${metrics.nakitFisFarki < 0 ? '(eksik fiş)' : '(fazla fiş)'}`} bold tone={ok(metrics.nakitFisFarki) ? 'ok' : 'bad'} />
          </Section>

          <Section title="Kredi Kartı · Sistem / Z / Banka Gün Sonu">
            <Line label="Sistem satış kredi kartı" value={tl(satisKK)} />
            <Line label="+ Kartla çekilen bahşiş" value={tl(metrics.tipCekilenKartToplami)} />
            <Line label="= Sistem kredi kartı" value={tl(metrics.hesaplananKrediKarti)} bold top />
            <Line label="Z raporları (POS cihazları)" value={tl(metrics.fizikiKrediKarti)} bold />
            <Line label="Fark (Z − sistem)" value={diffLabel(metrics.krediKartiFarki)} bold tone={ok(metrics.krediKartiFarki) ? 'ok' : 'bad'} />
            {metrics.bankaGirildi ? (
              <>
                {(metrics.bankaDetay || []).map((b) => (
                  <Line key={b.id} label={`${b.name}: banka ${tl(b.tutar)} · Z ${tl(b.zToplam)}`} value={diffLabel(b.fark)} tone={ok(b.fark) ? 'ok' : 'bad'} />
                ))}
                <Line label={`Banka gün sonu toplamı ${tl(metrics.bankaToplam)}`} value={diffLabel(metrics.bankaFarki)} bold tone={ok(metrics.bankaFarki) ? 'ok' : 'bad'} />
              </>
            ) : (
              <Line label="Banka gün sonu" value="girilmedi" color={C.mute} />
            )}
          </Section>
        </div>

        {/* 9. Yemek çeki karşılaştırması */}
        <Section title="Yemek Çeki · Sistem / Z (Gün Sonu)">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="left">Kart</Th>
                <Th>Sistem</Th>
                <Th>Z / gün sonu</Th>
                <Th>Fark</Th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics.yemekKartlari || {}).map(([key, y]) => (
                <tr key={key}>
                  <Td align="left" bold>{key.charAt(0).toUpperCase() + key.slice(1)}</Td>
                  <Td>{tl(y.hesaplanan)}</Td>
                  <Td>{tl(y.fiziki)}</Td>
                  <Td bold color={ok(y.fark) ? C.emerald : C.rose}>{diffLabel(y.fark)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* 10-12. Masraflar · kurye · bahşiş */}
        <div style={{ display: 'grid', gridTemplateColumns: cokMasraf ? '1fr 1fr' : '1.15fr 1fr 1fr', gap: 6 }}>
          <Section title="Masraflar" right={tl(metrics.toplamHarcamalar)} style={cokMasraf ? { gridColumn: '1 / -1' } : undefined}>
            {harcamalar.length ? (
              <>
                <div style={cokMasraf ? { columnCount: 3, columnGap: 14 } : undefined}>
                  {harcamalar.map((h) => (
                    <div key={h.id} style={{ breakInside: 'avoid' }}>
                      <Line label={`${h.title || 'Gider'}${h.aciklama ? ` (${String(h.aciklama).slice(0, 22)})` : ''}${h.isKK ? ' (KK)' : ''}`} value={tl(h.tutar)} color={h.isKK ? C.indigo : undefined} />
                    </div>
                  ))}
                </div>
                <div style={cokMasraf ? { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 14 } : undefined}>
                  <Line label="Nakit çıkan" value={tl(metrics.nakitHarcamalar)} bold top />
                  {metrics.kkHarcamalar > 0 && <Line label="KK ile ödenen" value={tl(metrics.kkHarcamalar)} color={C.indigo} top={cokMasraf} />}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 9, color: C.mute, padding: '4px 0' }}>Gider girilmedi</div>
            )}
          </Section>

          <Section title="Adisyon · Kurye Ödemeleri" right={tl(metrics.kuryeOdemeleriToplami)}>
            {kurye.length ? (
              <>
                {kurye.map((k, i) => (
                  <Line key={i} label={`${k.name} · ${formatNumber(k.count)}×${formatNumber(k.unit)}`} value={tl(k.total)} />
                ))}
                <Line label={`${formatNumber(metrics.kuryeToplamSiparisSayisi)} sipariş toplam`} value={tl(metrics.kuryeOdemeleriToplami)} bold top />
              </>
            ) : (
              <div style={{ fontSize: 9, color: C.mute, padding: '4px 0' }}>Kurye ödemesi yok</div>
            )}
          </Section>

          <Section title="Bahşiş (Tip) Ödemeleri" right={tl(metrics.tipNetNakitToplami)}>
            {tips.length ? (
              <>
                {tips.map((t, i) => (
                  <Line key={i} label={`${t.name} · kart ${tl(t.cekilen)}`} value={tl(t.net)} />
                ))}
                <Line label={`Kesinti ${tl(metrics.tipKesintiToplami)}`} value="" color={C.mute} top />
                <Line label="Net nakit ödenen" value={tl(metrics.tipNetNakitToplami)} bold />
              </>
            ) : (
              <div style={{ fontSize: 9, color: C.mute, padding: '4px 0' }}>Bahşiş ödemesi yok</div>
            )}
          </Section>
        </div>

        {/* 13-15. Ara toplam − çıkışlar = kasa sonucu · sayım */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1.2fr auto 1.2fr 1fr 1fr', gap: 5 }}>
          <Box label="Ara toplam" value={tl(metrics.toplamNakitGiris)} />
          <Op>−</Op>
          <Box label="Çıkışlar (nakit masraf + kurye + net bahşiş)" value={tl(metrics.toplamNakitCikis)} color={C.rose} />
          <Op>=</Op>
          <Box label="KASA SONUCU" value={tl(metrics.hesaplananNakit)} bg="#fff7ed" color={C.brand} big />
          <Box label="SAYIM (fiziki)" value={tl(metrics.fizikiSayim)} big />
          <Box
            label="Kasa farkı"
            value={ok(kasaFarki) ? '✓ Tam' : tl(Math.abs(kasaFarki))}
            sub={ok(kasaFarki) ? 'sayım = kasa sonucu' : kasaFarki < 0 ? 'KASA AÇIK' : 'KASA FAZLA'}
            color={ok(kasaFarki) ? C.emerald : C.rose}
            bg={ok(kasaFarki) ? '#ecfdf5' : '#fff1f2'}
            big
          />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, fontSize: 8, color: C.mute, paddingTop: 4, borderTop: `1px solid ${C.line}` }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ color: C.ink }}>Yarına devir: {tl(metrics.fizikiSayim)}</b>
            {data.notlar ? <> · Not: {String(data.notlar).slice(0, 110)}</> : null}
            <br />YRN Kasa · {longDate(date)} · Hazırlanma: {new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          <span style={{ display: 'flex', gap: 22 }}>
            <span>Teslim eden: ____________</span>
            <span>Teslim alan: ____________</span>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
