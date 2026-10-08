import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatNumber, num, calculateReportMetrics, normalizeReportData } from '../utils/calculations';
import { apiFetch } from '../utils/api';

/**
 * A4 tek sayfa gün sonu raporu: KPI'lar, geçen haftanın aynı günüyle karşılaştırma,
 * marka / kanal dağılımı, ödeme tipi kırılımı, masraflar ve kasa mutabakatı.
 * Grafikler saf SVG (ek kütüphane yok) ve baskıda renkli çıkar.
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
  violet: '#7c3aed',
  prev: '#cbd5e1',
};
const PALETTE = ['#ea580c', '#4f46e5', '#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#0f766e', '#64748b'];

const DAY = 86400000;
const shiftDate = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00');
  return new Date(d.getTime() + days * DAY).toLocaleDateString('sv-SE'); // YYYY-MM-DD
};
const dayName = (dateStr) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long' });
const longDate = (dateStr) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
const shortDay = (dateStr) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const fmtPct = (v) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`);
const compact = (v) => {
  const n = num(v);
  if (Math.abs(n) >= 1000) return (n / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' B';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
};

// ---- Küçük parçalar ----

function Section({ title, right, children, className = '' }) {
  return (
    <div className={`a4-card ${className}`} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 11px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: C.ink }}>{title}</span>
        {right && <span style={{ fontSize: 9.5, color: C.mute, fontWeight: 600 }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

function Delta({ v, size = 10 }) {
  if (v === null) return <span style={{ color: C.mute, fontSize: size }}>—</span>;
  const up = v >= 0;
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 800,
        color: up ? C.emerald : C.rose,
        background: up ? '#ecfdf5' : '#fff1f2',
        padding: '1px 6px',
        borderRadius: 99,
        whiteSpace: 'nowrap',
      }}
    >
      {up ? '▲' : '▼'} {fmtPct(Math.abs(v)).replace('+', '')}
    </span>
  );
}

function Kpi({ label, value, sub, accent, delta }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '8px 11px', background: '#fff' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: C.mute }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 900, color: C.ink, lineHeight: 1.15, marginTop: 2 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 9.5, color: C.mute, minHeight: 15 }}>
        {delta !== undefined && <Delta v={delta} />}
        <span>{sub}</span>
      </div>
    </div>
  );
}

function Donut({ items, size = 134, center }) {
  const total = items.reduce((t, i) => t + i.value, 0);
  const r = 40;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke={C.line} strokeWidth="16" />
      {total > 0 &&
        items.map((it) => {
          const len = (it.value / total) * circ;
          const el = (
            <circle
              key={it.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={it.color}
              strokeWidth="16"
              strokeDasharray={`${Math.max(len - 0.8, 0)} ${circ}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 50 50)"
            />
          );
          acc += len;
          return el;
        })}
      {center && (
        <>
          <text x="50" y="47" textAnchor="middle" fontSize="7" fill={C.mute} fontWeight="700">{center.top}</text>
          <text x="50" y="58" textAnchor="middle" fontSize="9.5" fill={C.ink} fontWeight="900">{center.bottom}</text>
        </>
      )}
    </svg>
  );
}

function Legend({ items }) {
  const total = items.reduce((t, i) => t + i.value, 0);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2.5px 0', fontSize: 10.5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: it.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: C.ink, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>
          <span style={{ fontWeight: 700, color: C.ink }}>{formatCurrency(it.value)}</span>
          <span style={{ width: 38, textAlign: 'right', color: C.mute, fontWeight: 700 }}>
            {total > 0 ? ((it.value / total) * 100).toFixed(1).replace('.', ',') + '%' : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function HBars({ rows, max, labelW = 92 }) {
  const m = max || Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2.5px 0', fontSize: 10.5 }}>
          <span style={{ width: labelW, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
          <div style={{ flex: 1, height: 11, background: C.soft, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            {(r.parts || [{ value: r.value, color: r.color }]).map((p, i) => (
              <div key={i} style={{ width: `${(p.value / m) * 100}%`, background: p.color, height: '100%' }} />
            ))}
          </div>
          <span style={{ width: 70, textAlign: 'right', fontWeight: 800, color: C.ink }}>{formatCurrency(r.value)}</span>
          {r.extra !== undefined && <span style={{ width: 36, textAlign: 'right', color: C.mute, fontWeight: 700 }}>{r.extra}</span>}
        </div>
      ))}
    </div>
  );
}

// İki seri (bu gün / geçen hafta) yan yana yatay çubuk
function CompareRow({ label, cur, prev, hasPrev, max }) {
  const d = pct(cur, prev);
  return (
    <div style={{ padding: '5px 0', borderTop: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.ink }}>{label}</span>
        {hasPrev ? <Delta v={d} /> : <span style={{ fontSize: 9.5, color: C.mute }}>kayıt yok</span>}
      </div>
      {[
        { v: cur, color: C.brand, t: 'Bugün' },
        { v: prev, color: C.prev, t: 'Geçen hf.' },
      ].map((s) => (
        <div key={s.t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, height: 14 }}>
          <span style={{ width: 48, color: C.mute, fontWeight: 600 }}>{s.t}</span>
          <div style={{ flex: 1, height: 8, background: C.soft, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${max > 0 ? (s.v / max) * 100 : 0}%`, height: '100%', background: s.color, borderRadius: 4 }} />
          </div>
          <span style={{ width: 70, textAlign: 'right', fontWeight: 800, color: C.ink }}>{s.t === 'Geçen hf.' && !hasPrev ? '—' : formatCurrency(s.v)}</span>
        </div>
      ))}
    </div>
  );
}

function TrendBars({ days, today, lastWeek }) {
  const max = Math.max(...days.map((d) => d.value), 1);
  const W = 330;
  const H = 130;
  const bw = W / days.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%" style={{ display: 'block' }}>
      {[0.5, 1].map((g) => (
        <line key={g} x1="0" x2={W} y1={H - g * (H - 14)} y2={H - g * (H - 14)} stroke={C.line} strokeDasharray="2 3" />
      ))}
      {days.map((d, i) => {
        const h = (d.value / max) * (H - 14);
        const color = d.date === today ? C.brand : d.date === lastWeek ? C.indigo : C.prev;
        return (
          <g key={d.date}>
            <rect x={i * bw + 4} y={H - h} width={bw - 8} height={Math.max(h, d.value > 0 ? 1.5 : 0)} rx="2.5" fill={color} />
            {(d.date === today || d.date === lastWeek) && d.value > 0 && (
              <text x={i * bw + bw / 2} y={H - h - 3} textAnchor="middle" fontSize="7.5" fontWeight="800" fill={C.ink}>
                {compact(d.value)}
              </text>
            )}
            <text x={i * bw + bw / 2} y={H + 10} textAnchor="middle" fontSize="7" fill={d.date === today || d.date === lastWeek ? C.ink : C.mute} fontWeight={d.date === today || d.date === lastWeek ? 800 : 500}>
              {shortDay(d.date)}
            </text>
            <text x={i * bw + bw / 2} y={H + 19} textAnchor="middle" fontSize="6.5" fill={C.mute}>
              {dayName(d.date).slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Chip({ ok, label, value }) {
  return (
    <div
      style={{
        border: `1px solid ${ok ? '#a7f3d0' : '#fecdd3'}`,
        background: ok ? '#ecfdf5' : '#fff1f2',
        borderRadius: 8,
        padding: '5px 8px',
      }}
    >
      <div style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', color: ok ? '#047857' : '#be123c', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 11.5, fontWeight: 900, color: ok ? '#065f46' : '#9f1239' }}>{value}</div>
    </div>
  );
}

// ---- Ana bileşen ----

export default function A4Report({ open, onClose, date, data, metrics }) {
  const [prev, setPrev] = useState({ loading: true, exists: false, metrics: null });
  const [trend, setTrend] = useState([]);
  const prevDate = shiftDate(date, -7);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setPrev({ loading: true, exists: false, metrics: null });
    (async () => {
      try {
        const res = await apiFetch(`/api/reports/${prevDate}`);
        const json = await res.json();
        if (!alive || !json.success) return;
        setPrev({
          loading: false,
          exists: !!json.exists,
          metrics: json.exists ? calculateReportMetrics(normalizeReportData(json.report.data)) : null,
        });
      } catch {
        if (alive) setPrev({ loading: false, exists: false, metrics: null });
      }
      try {
        const res = await apiFetch('/api/reports');
        const json = await res.json();
        if (alive && json.success) setTrend(json.reports);
      } catch {
        /* trend olmadan da çalışır */
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, date, prevDate]);

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
    const salonCiro = kanal.satirToplamlari?.restoran?.ciro || 0;
    const salonFis = kanal.kisiToplam || 0;
    const paketCiro = (kanal.ciroToplam || 0) - salonCiro;
    const paketFis = kanal.paketToplam || 0;
    const kanalVar = (kanal.ciroToplam || 0) > 0;
    const cur = {
      toplam: kanalVar ? kanal.ciroToplam : metrics.toplamSatis,
      salon: salonCiro,
      paket: paketCiro,
      fis: salonFis + paketFis,
      salonFis,
      paketFis,
    };
    const pk = prev.metrics?.kanal;
    const pSalon = pk?.satirToplamlari?.restoran?.ciro || 0;
    const pPaketCiro = (pk?.ciroToplam || 0) - pSalon;
    const pTop = pk && pk.ciroToplam > 0 ? pk.ciroToplam : prev.metrics?.toplamSatis || 0;
    const pFis = (pk?.kisiToplam || 0) + (pk?.paketToplam || 0);
    const old = { toplam: pTop, salon: pSalon, paket: pPaketCiro, fis: pFis };

    // marka dağılımı
    const markalar = data.kanalCiro?.markalar || [];
    const markaItems = markalar
      .map((m, i) => ({ label: m.name, value: kanal.markaCiro?.[m.id] || 0, color: PALETTE[i % PALETTE.length] }))
      .filter((m) => m.value > 0);

    // kanal dağılımı
    const kanalRows = (data.kanalCiro?.satirlar || [])
      .map((r, i) => ({ label: r.name, value: kanal.satirToplamlari?.[r.id]?.ciro || 0, color: PALETTE[i % PALETTE.length] }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);

    // ödeme tipleri (Denge + Suitable)
    const dp = data.dengePos || {};
    const sp = data.suitablePos || {};
    const tipler = [
      ['Nakit', 'nakit'],
      ['Kredi Kartı', 'krediKarti'],
      ['Online Kredi K.', 'onlineKrediKarti'],
      ['Cari', 'cari'],
      ['Sodexho', 'sodexho'],
      ['Multinet', 'multinet'],
      ['Ticket', 'ticket'],
      ['Setcard', 'setcard'],
    ];
    const odeme = tipler
      .map(([label, key], i) => ({
        label,
        denge: num(dp[key]),
        suitable: num(sp[key]),
        value: num(dp[key]) + num(sp[key]),
        color: PALETTE[i % PALETTE.length],
      }))
      .filter((o) => o.value > 0);

    // masraflar
    const harcamalar = (data.harcamalar || []).filter((h) => num(h.tutar) > 0);
    const giderRows = [
      ...harcamalar.map((h) => ({ label: h.title || 'Gider', value: num(h.tutar), kk: !!h.isKK })),
      ...(metrics.kuryeOdemeleriToplami > 0 ? [{ label: 'Kurye ödemeleri', value: metrics.kuryeOdemeleriToplami }] : []),
      ...(metrics.tipNetNakitToplami > 0 ? [{ label: 'Bahşiş (net nakit)', value: metrics.tipNetNakitToplami }] : []),
    ].sort((a, b) => b.value - a.value);
    const giderToplam = giderRows.reduce((t, g) => t + g.value, 0);

    // son 14 gün
    const byDate = Object.fromEntries(trend.map((t) => [t.date, num(t.toplam_satis)]));
    byDate[date] = metrics.toplamSatis;
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = shiftDate(date, i - 13);
      return { date: d, value: byDate[d] || 0 };
    });

    return { cur, old, markaItems, kanalRows, odeme, giderRows, giderToplam, days };
  }, [open, data, metrics, prev, trend, date]);

  if (!open || !view || typeof document === 'undefined') return null;

  const { cur, old, markaItems, kanalRows, odeme, giderRows, giderToplam, days } = view;
  const hasPrev = prev.exists && old.toplam > 0;
  const ortFis = cur.fis > 0 ? cur.toplam / cur.fis : 0;
  const ortFisPrev = old.fis > 0 ? old.toplam / old.fis : 0;
  const maxCmp = Math.max(cur.toplam, old.toplam, 1);
  const kasaFarki = metrics.kasaFarki || 0;
  const odemeToplam = odeme.reduce((t, o) => t + o.value, 0);
  const yemekKartlari = metrics.yemekKartlari || {};
  const yemekOk = Object.values(yemekKartlari).every((y) => Math.abs(y.fark) <= 0.05);

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
          padding: '9mm 9mm 7mm',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif',
          color: C.ink,
        }}
      >
        {/* Başlık */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `2.5px solid ${C.brand}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.brand, color: '#fff', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>YRN</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.1 }}>Gün Sonu Raporu</div>
              <div style={{ fontSize: 10, color: C.mute, fontWeight: 600 }}>YRN Restoran · Günlük kasa kapanış ve satış analizi</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{longDate(date)}</div>
            <div style={{ fontSize: 10, color: C.mute, fontWeight: 700, textTransform: 'capitalize' }}>
              {dayName(date)} · karşılaştırma: {shortDay(prevDate)} {dayName(prevDate)}
            </div>
          </div>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Kpi label="Toplam Satış (Ciro)" value={formatCurrency(cur.toplam)} accent={C.brand} delta={hasPrev ? pct(cur.toplam, old.toplam) : undefined} sub={hasPrev ? 'geçen haftaya göre' : 'geçen hafta kaydı yok'} />
          <Kpi label="Fiş / Kişi Sayısı" value={formatNumber(cur.fis)} accent={C.indigo} delta={hasPrev ? pct(cur.fis, old.fis) : undefined} sub={`Salon ${formatNumber(cur.salonFis)} · Paket ${formatNumber(cur.paketFis)}`} />
          <Kpi label="Ortalama Fiş" value={formatCurrency(ortFis)} accent={C.emerald} delta={hasPrev ? pct(ortFis, ortFisPrev) : undefined} sub={hasPrev ? `geçen hf. ${formatCurrency(ortFisPrev)}` : 'satış ÷ fiş'} />
          <Kpi
            label="Kasa Durumu"
            value={Math.abs(kasaFarki) <= 0.05 ? 'Tam' : formatCurrency(Math.abs(kasaFarki))}
            accent={Math.abs(kasaFarki) <= 0.05 ? C.emerald : C.rose}
            sub={Math.abs(kasaFarki) <= 0.05 ? 'sayım = hesaplanan' : kasaFarki < 0 ? 'kasa açık' : 'kasa fazla'}
          />
        </div>

        {/* Karşılaştırma + trend */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <Section title="Geçen Haftanın Aynı Günü" right={`${shortDay(prevDate)} ${dayName(prevDate)}`}>
            <CompareRow label="Toplam Satış" cur={cur.toplam} prev={old.toplam} hasPrev={hasPrev} max={maxCmp} />
            <CompareRow label="Salon" cur={cur.salon} prev={old.salon} hasPrev={hasPrev} max={maxCmp} />
            <CompareRow label="Paket" cur={cur.paket} prev={old.paket} hasPrev={hasPrev} max={maxCmp} />
          </Section>
          <Section title="Son 14 Gün Satış Seyri" right="turuncu: bugün · mor: geçen hafta">
            <TrendBars days={days} today={date} lastWeek={prevDate} />
          </Section>
        </div>

        {/* Marka + kanal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <Section title="Marka Satış Dağılımı" right={formatCurrency(markaItems.reduce((t, m) => t + m.value, 0))}>
            {markaItems.length ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Donut items={markaItems} center={{ top: 'MARKA', bottom: `${markaItems.length}` }} />
                <Legend items={markaItems} />
              </div>
            ) : (
              <Empty />
            )}
          </Section>
          <Section title="Satış Kanalı Dağılımı" right="ciro">
            {kanalRows.length ? (
              <HBars
                labelW={86}
                rows={kanalRows.map((r) => ({ ...r, extra: cur.toplam > 0 ? Math.round((r.value / cur.toplam) * 100) + '%' : '' }))}
              />
            ) : (
              <Empty />
            )}
          </Section>
        </div>

        {/* Ödeme tipi + masraflar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <Section title="Ödeme Tipi Kırılımı" right="Denge + Suitable">
            {odeme.length ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Donut items={odeme} size={112} center={{ top: 'TOPLAM', bottom: compact(odemeToplam) }} />
                  <Legend items={odeme} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 9.5, color: C.mute, fontWeight: 600 }}>
                  <span>DengePOS <b style={{ color: C.indigo }}>{formatCurrency(metrics.dengePosToplam)}</b></span>
                  <span>Suitable <b style={{ color: C.sky }}>{formatCurrency(metrics.suitablePosToplam)}</b></span>
                </div>
              </>
            ) : (
              <Empty />
            )}
          </Section>
          <Section title="Masraf & Giderler" right={`${formatCurrency(giderToplam)}${cur.toplam > 0 ? ' · ciroya %' + ((giderToplam / cur.toplam) * 100).toFixed(1).replace('.', ',') : ''}`}>
            {giderRows.length ? (
              <HBars
                labelW={96}
                rows={giderRows.map((g) => ({
                  label: g.label + (g.kk ? ' (KK)' : ''),
                  value: g.value,
                  color: g.kk ? C.indigo : C.rose,
                }))}
              />
            ) : (
              <Empty text="Gider girilmedi" />
            )}
          </Section>
        </div>

        {/* Kasa & mutabakat */}
        <Section title="Kasa Akışı & Mutabakat">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 7 }}>
            {[
              ['Devir', formatCurrency(data.kasaGiris?.devir), C.mute],
              ['+ Nakit giriş', formatCurrency(metrics.toplamNakitGiris - num(data.kasaGiris?.devir)), C.emerald],
              ['− Nakit çıkış', formatCurrency(metrics.toplamNakitCikis), C.rose],
              ['= Hesaplanan', formatCurrency(metrics.hesaplananNakit), C.ink],
              ['Fiziki sayım', formatCurrency(metrics.fizikiSayim), C.ink],
              ['Fark', formatCurrency(kasaFarki), Math.abs(kasaFarki) <= 0.05 ? C.emerald : C.rose],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: C.soft, borderRadius: 8, padding: '5px 8px' }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, color: C.mute, textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 12.5, fontWeight: 900, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            <Chip ok={Math.abs(metrics.nakitFisFarki) <= 0.05} label="Nakit fişi" value={Math.abs(metrics.nakitFisFarki) <= 0.05 ? '✓ Tam' : formatCurrency(metrics.nakitFisFarki)} />
            <Chip ok={Math.abs(metrics.krediKartiFarki) <= 0.05} label="Kredi kartı Z" value={Math.abs(metrics.krediKartiFarki) <= 0.05 ? '✓ Tam' : formatCurrency(metrics.krediKartiFarki)} />
            <Chip ok={yemekOk} label="Yemek kartları" value={yemekOk ? '✓ Tam' : 'Fark var'} />
            <Chip
              ok={!metrics.bankaGirildi || Math.abs(metrics.bankaFarki) <= 0.05}
              label="Banka gün sonu"
              value={!metrics.bankaGirildi ? 'girilmedi' : Math.abs(metrics.bankaFarki) <= 0.05 ? '✓ Tam' : formatCurrency(metrics.bankaFarki)}
            />
            <Chip
              ok={!metrics.kanalGirildi || Math.abs(metrics.kanalCiroFarki) <= 0.05}
              label="Kanal ↔ POS ciro"
              value={!metrics.kanalGirildi ? 'girilmedi' : Math.abs(metrics.kanalCiroFarki) <= 0.05 ? '✓ Tam' : formatCurrency(metrics.kanalCiroFarki)}
            />
          </div>
        </Section>

        {data.notlar && (
          <div style={{ fontSize: 10, color: C.mute, border: `1px dashed ${C.line}`, borderRadius: 8, padding: '5px 9px' }}>
            <b style={{ color: C.ink }}>Not:</b> {String(data.notlar).slice(0, 220)}
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: C.mute, paddingTop: 5, borderTop: `1px solid ${C.line}` }}>
          <span>YRN Kasa · {longDate(date)} gün sonu raporu</span>
          <span>Hazırlanma: {new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Empty({ text = 'Veri girilmedi' }) {
  return <div style={{ padding: '26px 0', textAlign: 'center', fontSize: 10.5, color: C.mute }}>{text}</div>;
}
