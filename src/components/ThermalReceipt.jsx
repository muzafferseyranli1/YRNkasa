import React from 'react';
import { formatCurrency, formatNumber, num, resolvePosMarka, buildSummary, shiftDate, BANKA_ADLARI } from '../utils/calculations';

/**
 * 80mm gün sonu raporu. İçerik ve sıra A4 raporuyla aynıdır (yalnızca biçim farklı):
 * özet → devir/extra → ödeme tipleri → kanallar → ara toplam → online nakit fişi → kredi kartı → yemek çeki
 * → masraflar → kurye → bahşiş → ara toplam − çıkışlar = kasa sonucu / sayım → yarına devir, imza.
 */

const Sec = ({ title, children }) => (
  <div className="py-2 border-b-2 border-black">
    <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">--- {title} ---</div>
    {children}
  </div>
);

const Row = ({ l, v, bold, small, top, indent }) => (
  <div
    className={`flex justify-between gap-2 ${small ? 'text-[11px]' : ''} ${bold ? 'font-black' : ''} ${top ? 'border-t border-black mt-1 pt-0.5' : ''} ${indent ? 'pl-2' : ''}`}
  >
    <span>{l}</span>
    <span className="text-right whitespace-nowrap">{v}</span>
  </div>
);

const okv = (v) => Math.abs(num(v)) <= 0.05;
const farkText = (d) => (okv(d) ? '✓ TAM' : formatCurrency(d));
const delta = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const dText = (d) => (d === null ? '' : ` ${d >= 0 ? '+' : '-'}%${Math.abs(d).toFixed(1).replace('.', ',')}`);

export default function ThermalReceipt({ date, data, metrics, prev = { exists: false, metrics: null } }) {
  if (!data || !metrics) return null;

  const { kasaGiris = {}, dengePos = {}, suitablePos = {}, zBilgileri = {}, harcamalar = [], kanalCiro = null } = data;
  const markalar = kanalCiro?.markalar || [];
  const kanal = metrics.kanal || {};

  const formatDateDisplay = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' });
    } catch {
      return dateStr;
    }
  };
  const shortDay = (dateStr) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

  const nakitGiderToplam = metrics.nakitHarcamalar ?? metrics.toplamHarcamalar;
  const kkGiderToplam = metrics.kkHarcamalar ?? 0;
  const kasaFarki = metrics.kasaFarki || 0;

  // ---- Özet (A4 ile ortak hesap) ----
  const { cur, old, hasPrev, ort, ortPrev } = buildSummary(metrics, prev.metrics);
  const prevDate = shiftDate(date, -7);

  // ---- Ödeme tipleri (Denge + Suitable birleşik, marka kırılımlı) ----
  const pm = resolvePosMarka(data.posMarka, markalar, dengePos, suitablePos);
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
      const brands = markalar.map((mk) => ({ name: mk.name, v: brandVal(mk, key) }));
      return { label, key, brands, total: brands.reduce((t, b) => t + b.v, 0), always };
    })
    .filter((r) => r.always || r.total !== 0);
  const odemeToplam = odemeRows.reduce((t, r) => t + r.total, 0);

  // ---- Nakit akışı ----
  const nakitSatis = num(dengePos.nakit) + num(suitablePos.nakit);
  const onlineKK = num(dengePos.onlineKrediKarti) + num(suitablePos.onlineKrediKarti);
  const satisKK = num(dengePos.krediKarti) + num(suitablePos.krediKarti);

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
      const cardTip = num(t.cekilenTip);
      const rate = t.kesintiOrani !== undefined && t.kesintiOrani !== '' ? num(t.kesintiOrani) : 20;
      const net = t.netNakitTip !== undefined && t.netNakitTip !== '' ? num(t.netNakitTip) : cardTip - cardTip * (rate / 100);
      return { name: t.personelAdi || 'Personel', cardTip, rate, net };
    })
    .filter((t) => t.cardTip > 0);

  return (
    <div className="thermal-receipt-container text-black bg-white select-none">
      {/* BAŞLIK */}
      <div className="text-center pb-2 border-b-2 border-black">
        <h1 className="text-2xl font-black tracking-wide uppercase leading-tight">YRN RESTORAN</h1>
        <h2 className="text-base font-black uppercase mt-0.5 tracking-wide">GÜN SONU KASA RAPORU</h2>
        <div className="flex justify-center items-center space-x-3 text-sm font-bold mt-1 text-black">
          <span>{formatDateDisplay(date)}</span>
          <span>•</span>
          <span>{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* 1. ÖZET (geçen hafta aynı güne göre %) */}
      <Sec title="ÖZET">
        <div className="space-y-1 text-sm font-bold">
          <Row l="TOPLAM SATIŞ:" v={`${formatCurrency(cur.toplam)}${hasPrev ? dText(delta(cur.toplam, old.toplam)) : ''}`} bold />
          <Row l="Salon:" v={`${formatCurrency(cur.salon)}${hasPrev ? dText(delta(cur.salon, old.salon)) : ''}`} />
          <Row l={`${formatNumber(cur.salonFis)} fiş · ort.`} v={formatCurrency(ort.salon)} small indent />
          <Row l="Paket:" v={`${formatCurrency(cur.paket)}${hasPrev ? dText(delta(cur.paket, old.paket)) : ''}`} />
          <Row l={`${formatNumber(cur.paketFis)} fiş · ort.`} v={formatCurrency(ort.paket)} small indent />
          <Row l="Fiş Sayısı:" v={`${formatNumber(cur.fis)}${hasPrev ? dText(delta(cur.fis, old.fis)) : ''}`} />
          <Row l="Ortalama Fiş:" v={`${formatCurrency(ort.toplam)}${hasPrev ? dText(delta(ort.toplam, ortPrev.toplam)) : ''}`} />
        </div>
        <div className="mt-1 text-[11px] font-bold">
          {hasPrev
            ? `Kıyas: geçen hf. ${shortDay(prevDate)} → satış ${formatCurrency(old.toplam)} · ${formatNumber(old.fis)} fiş`
            : 'Geçen hafta aynı gün kaydı yok'}
        </div>
      </Sec>

      {/* 2. DEVİR + EXTRA NAKİT */}
      <Sec title="KASA GİRİŞİ">
        <div className="space-y-1 text-sm font-bold">
          <Row l="Önceki Günden Devir:" v={formatCurrency(kasaGiris.devir)} bold />
          <Row l="Extra Eklenen Nakit:" v={formatCurrency(kasaGiris.kasayaParaKondu)} />
        </div>
      </Sec>

      {/* 3. ÖDEME TİPLERİ DÖKÜMÜ */}
      <Sec title="ÖDEME TİPLERİ">
        <div className="space-y-1 text-sm font-bold">
          {odemeRows.map((r) => (
            <div key={r.key}>
              <Row l={`${r.label}:`} v={formatCurrency(r.total)} />
              {r.brands.filter((b) => b.v !== 0).length > 1 && (
                <div className="pl-2 text-[11px] font-semibold">
                  {r.brands.filter((b) => b.v !== 0).map((b) => `${b.name} ${formatCurrency(b.v)}`).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="border-t-2 border-black my-1.5"></div>
        <Row l="TOPLAM:" v={formatCurrency(odemeToplam)} bold />
        <div className="text-[11px] font-bold mt-0.5">
          DengePOS {formatCurrency(metrics.dengePosToplam)} · Suitable {formatCurrency(metrics.suitablePosToplam)}
        </div>
      </Sec>

      {/* 4. SATIŞ KANALLARI DÖKÜMÜ */}
      {metrics.kanalGirildi && kanalCiro && (
        <Sec title="SATIŞ KANALLARI">
          <div className="space-y-1 text-sm font-bold">
            {markalar.map((mk) => (
              <Row
                key={mk.id}
                l={`${mk.name}:`}
                v={`${formatCurrency(kanal.markaCiro?.[mk.id])} · ${formatNumber((kanal.markaPaket?.[mk.id] || 0) + (kanal.markaSalonFis?.[mk.id] || 0))} adet`}
                bold
              />
            ))}
          </div>
          <div className="border-t border-black my-1.5"></div>
          <div className="space-y-1 text-xs font-bold">
            {(kanalCiro.satirlar || [])
              .filter((r) => {
                const t = kanal.satirToplamlari?.[r.id] || {};
                return (t.ciro || 0) !== 0 || (t.online || 0) !== 0 || (t.adet || 0) !== 0 || (t.kisi || 0) !== 0;
              })
              .map((r) => {
                const t = kanal.satirToplamlari?.[r.id] || {};
                return (
                  <div key={r.id}>
                    <Row l={`${r.name}:`} v={formatCurrency(t.ciro)} bold />
                    <div className="flex justify-between pl-2 text-[11px]">
                      <span>
                        {r.sayiTuru === 'kisi'
                          ? `${formatNumber(t.adet)} fiş${(t.kisi || 0) > 0 ? ` · ${formatNumber(t.kisi)} kişi` : ''}`
                          : `${formatNumber(t.adet)} paket`}
                      </span>
                      {(t.online || 0) !== 0 && <span>Online alacak: {formatCurrency(t.online)}</span>}
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="border-t-2 border-black my-1.5"></div>
          <div className="space-y-1 text-sm font-bold">
            <Row l="CİRO TOPLAM:" v={formatCurrency(kanal.ciroToplam)} bold />
            <Row l="Online Alacak Toplam:" v={formatCurrency(kanal.onlineToplam)} />
            <Row
              l="Paket / Salon Fiş / Kişi:"
              v={`${formatNumber(kanal.paketToplam)} / ${formatNumber(kanal.salonFisToplam)} / ${formatNumber(kanal.kisiToplam)}`}
            />
            <Row l="Kanal Ciro − POS Farkı:" v={farkText(metrics.kanalCiroFarki)} bold />
            {metrics.onlineKontrolVar && <Row l="Online Alacak − POS Online KK:" v={farkText(metrics.kanalOnlineFarki)} bold />}
          </div>
        </Sec>
      )}

      {/* 5. ARA TOPLAM (devir + extra + satıştan gelen nakit) */}
      <Sec title="ARA TOPLAM">
        <div className="space-y-1 text-sm font-bold">
          <Row l="Devir:" v={formatCurrency(kasaGiris.devir)} />
          <Row l="+ Extra konan nakit:" v={formatCurrency(kasaGiris.kasayaParaKondu)} />
          <Row l="+ Satıştan gelen nakit:" v={formatCurrency(nakitSatis)} />
        </div>
        <div className="border-t-2 border-black my-1.5"></div>
        <Row l="ARA TOPLAM:" v={formatCurrency(metrics.toplamNakitGiris)} bold />
      </Sec>

      {/* 6. ONLİNE SATIŞ · KESİLEN NAKİT FİŞİ */}
      <Sec title="ONLİNE · NAKİT FİŞİ">
        <div className="space-y-1 text-sm font-bold">
          <Row l="Nakit satış:" v={formatCurrency(nakitSatis)} />
          <Row l="+ Online kredi kartı satış:" v={formatCurrency(onlineKK)} />
          <Row l="= Kesilmesi gereken:" v={formatCurrency(metrics.kesilmesiGerekenNakitFisi)} bold top />
          <Row l="Kesilen Z nakit fişi:" v={formatCurrency(metrics.kesilenNakitFisi)} bold />
          <Row
            l="Fark:"
            v={okv(metrics.nakitFisFarki) ? '✓ TAM' : `${formatCurrency(metrics.nakitFisFarki)} ${metrics.nakitFisFarki < 0 ? '(EKSİK FİŞ)' : '(FAZLA FİŞ)'}`}
            bold
            top
          />
        </div>
      </Sec>

      {/* 7. KREDİ KARTI: sistem / Z / banka gün sonu */}
      <Sec title="KREDİ KARTI">
        <div className="space-y-1 text-sm font-bold">
          <Row l="Sistem satış kredi kartı:" v={formatCurrency(satisKK)} />
          <Row l="+ Kartla çekilen bahşiş:" v={formatCurrency(metrics.tipCekilenKartToplami)} />
          <Row l="= Sistem kredi kartı:" v={formatCurrency(metrics.hesaplananKrediKarti)} bold top />
          <Row l="Z raporları (POS):" v={formatCurrency(metrics.fizikiKrediKarti)} bold />
          <Row l="Fark (Z − sistem):" v={farkText(metrics.krediKartiFarki)} bold top />

          {metrics.bankaGirildi ? (
            <>
              <div className="border-t border-black my-1.5"></div>
              <div className="font-black text-xs uppercase">Banka Gün Sonu</div>
              {(metrics.bankaDetay || []).map((b) => (
                <div key={b.id}>
                  <Row l={`${b.name}:`} v={formatCurrency(b.tutar)} />
                  {/* Cihazın Banka 1/2/3 kırılımı (yalnızca girilenler) */}
                  {((zBilgileri.posCihazlari || []).find((d) => d.id === b.id)?.banka || []).map((v, slot) =>
                    num(v) !== 0 ? <Row key={slot} l={`${BANKA_ADLARI[slot]}:`} v={formatCurrency(v)} small indent /> : null
                  )}
                  {b.cihazSayisi > 0 && <Row l={`Z: ${formatCurrency(b.zToplam)}`} v={`Fark: ${farkText(b.fark)}`} small indent />}
                </div>
              ))}
              <Row l={`Banka toplamı ${formatCurrency(metrics.bankaToplam)} − Z:`} v={farkText(metrics.bankaFarki)} bold top />
            </>
          ) : (
            <div className="text-xs font-semibold">Banka gün sonu girilmedi</div>
          )}
        </div>
      </Sec>

      {/* 8. YEMEK ÇEKİ: sistem / Z (gün sonu) */}
      <Sec title="YEMEK ÇEKİ">
        <div className="space-y-1 text-sm font-bold">
          {Object.entries(metrics.yemekKartlari || {}).map(([key, item]) => {
            const name = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key}>
                <Row l={`${name}:`} v={`Sistem ${formatCurrency(item.hesaplanan)}`} />
                <Row l={`Z/gün sonu ${formatCurrency(item.fiziki)}`} v={`Fark: ${farkText(item.fark)}`} small indent />
              </div>
            );
          })}
        </div>
      </Sec>

      {/* 9. MASRAFLAR */}
      {harcamalar && harcamalar.length > 0 && (
        <Sec title="MASRAFLAR">
          <div className="space-y-1 text-sm font-bold">
            {harcamalar.map((h, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="truncate max-w-[200px]">
                  {h.isKK && <span className="font-black mr-1">[KK]</span>}
                  {h.title} {h.aciklama ? `(${h.aciklama})` : ''}:
                </span>
                <span className="font-black">
                  {formatCurrency(h.tutar)}
                  {h.isKK && <span className="text-xs font-semibold ml-1">(KK)</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-black my-1.5"></div>
          <div className="space-y-0.5 text-xs font-bold">
            <Row l="Kasadan Çıkan Nakit Gider:" v={formatCurrency(nakitGiderToplam)} bold />
            {kkGiderToplam > 0 && <Row l="Kredi Kartı ile Yapılan [KK]:" v={`${formatCurrency(kkGiderToplam)} (Harici)`} />}
            <Row l="TOPLAM GİDER (Nakit+KK):" v={formatCurrency(metrics.toplamHarcamalar)} bold top />
          </div>
        </Sec>
      )}

      {/* 10. ADİSYON KURYE ÖDEMELERİ */}
      {kurye.length > 0 && (
        <Sec title="KURYE ÖDEMELERİ">
          <div className="space-y-1 text-sm font-bold">
            {kurye.map((k, i) => (
              <Row key={i} l={`${k.name} (${k.count}x${k.unit}₺):`} v={formatCurrency(k.total)} />
            ))}
          </div>
          <div className="border-t border-black mt-1.5 pt-1 space-y-0.5 text-sm font-black">
            <Row l="Toplam Sipariş:" v={formatNumber(metrics.kuryeToplamSiparisSayisi)} />
            <Row l="Toplam Kurye Nakit Çıkışı:" v={formatCurrency(metrics.kuryeOdemeleriToplami)} />
          </div>
        </Sec>
      )}

      {/* 11. BAHŞİŞ (TİP) ÖDEMELERİ */}
      {tips.length > 0 && (
        <Sec title="BAHŞİŞ (TİP) ÖDEMELERİ">
          <div className="space-y-1 text-sm font-bold">
            {tips.map((t, i) => (
              <Row key={i} l={`${t.name} (Kart:${t.cardTip}₺ -%${t.rate}):`} v={`Net ${formatCurrency(t.net)}`} />
            ))}
          </div>
          <div className="border-t border-black mt-1.5 pt-1 space-y-0.5 text-xs font-bold">
            <Row l="Karttan Çekilen Tip:" v={formatCurrency(metrics.tipCekilenKartToplami)} />
            <Row l="İşletme Komisyonu:" v={formatCurrency(metrics.tipKesintiToplami)} />
            <Row l="Kasadan Ödenen Net Nakit:" v={formatCurrency(metrics.tipNetNakitToplami)} bold top />
          </div>
        </Sec>
      )}

      {/* 12. ARA TOPLAM − ÇIKIŞLAR = KASA SONUCU · SAYIM */}
      <Sec title="KASA SONUCU">
        <div className="space-y-1 text-sm font-bold">
          <Row l="Ara Toplam:" v={formatCurrency(metrics.toplamNakitGiris)} />
          <Row l="− Nakit Gider:" v={formatCurrency(nakitGiderToplam)} small indent />
          <Row l="− Kurye Ödemeleri:" v={formatCurrency(metrics.kuryeOdemeleriToplami)} small indent />
          <Row l="− Net Bahşiş:" v={formatCurrency(metrics.tipNetNakitToplami)} small indent />
          <Row l="Toplam Çıkışlar:" v={`-${formatCurrency(metrics.toplamNakitCikis)}`} bold top />
        </div>
        <div className="space-y-1 mt-1.5">
          <div className="flex justify-between text-sm font-black">
            <span>KASA SONUCU:</span>
            <span className="text-base font-black">{formatCurrency(metrics.hesaplananNakit)}</span>
          </div>
          <div className="flex justify-between text-sm font-black">
            <span>SAYIM (FİZİKİ):</span>
            <span className="text-base font-black">{formatCurrency(metrics.fizikiSayim)}</span>
          </div>
          <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
            <span>KASA FARKI:</span>
            <span className="text-base font-black">
              {okv(kasaFarki)
                ? '0,00 ₺ (TAM)'
                : kasaFarki < 0
                ? `${formatCurrency(Math.abs(kasaFarki))} (EKSİK)`
                : `${formatCurrency(kasaFarki)} (FAZLA)`}
            </span>
          </div>
        </div>
        <div className="border-t border-black mt-1.5 pt-1 text-sm font-black">
          <Row l="YARINA DEVİR:" v={formatCurrency(metrics.fizikiSayim)} />
        </div>
        {data.notlar && <div className="mt-1 text-[11px] font-bold">Not: {String(data.notlar).slice(0, 160)}</div>}
      </Sec>

      {/* İMZA ALANI */}
      <div className="pt-2 pb-1 text-center text-sm font-bold">
        <div className="flex justify-between mt-1">
          <div className="w-1/2 text-center">
            <p className="font-black text-sm">Teslim Eden</p>
            <p className="text-xs text-black">(Kasiyer)</p>
            <div className="h-6 border-b-2 border-black mx-3 mt-1"></div>
          </div>
          <div className="w-1/2 text-center">
            <p className="font-black text-sm">Teslim Alan</p>
            <p className="text-xs text-black">(Yetkili / Yönetici)</p>
            <div className="h-6 border-b-2 border-black mx-3 mt-1"></div>
          </div>
        </div>
        <p className="mt-2 text-xs font-black uppercase tracking-widest">*** GÜN SONU KASA RAPORU ***</p>
      </div>
    </div>
  );
}
