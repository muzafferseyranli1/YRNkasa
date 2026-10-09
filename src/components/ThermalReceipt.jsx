import React from 'react';
import { formatCurrency, formatNumber, num } from '../utils/calculations';

export default function ThermalReceipt({ date, data, metrics }) {
  if (!data || !metrics) return null;

  const {
    kasaGiris = {},
    dengePos = {},
    suitablePos = {},
    paneller = [],
    zBilgileri = {},
    harcamalar = [],
    kanalCiro = null,
  } = data;

  const formatDateDisplay = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        weekday: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const nakitGiderToplam = metrics.nakitHarcamalar ?? metrics.toplamHarcamalar;
  const kkGiderToplam = metrics.kkHarcamalar ?? 0;

  return (
    <div className="thermal-receipt-container text-black bg-white select-none">
      {/* 1. BAŞLIK */}
      <div className="text-center pb-2 border-b-2 border-black">
        <h1 className="text-2xl font-black tracking-wide uppercase leading-tight">YRN RESTORAN</h1>
        <h2 className="text-base font-black uppercase mt-0.5 tracking-wide">GÜN SONU KASA RAPORU</h2>
        <div className="flex justify-center items-center space-x-3 text-sm font-bold mt-1 text-black">
          <span>{formatDateDisplay(date)}</span>
          <span>•</span>
          <span>{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* 2. KASA NAKİT VE DEVİR DURUMU */}
      <div className="py-2 border-b-2 border-black">
        <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
          --- KASA NAKİT AKIŞI ---
        </div>
        
        <div className="space-y-1 text-sm font-bold">
          <div className="flex justify-between">
            <span>Önceki Günden Devir:</span>
            <span className="font-black text-base">{formatCurrency(kasaGiris.devir)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasaya Konan Nakit:</span>
            <span>{formatCurrency(kasaGiris.kasayaParaKondu)}</span>
          </div>
          <div className="flex justify-between">
            <span>DengePOS Nakit Satış:</span>
            <span>{formatCurrency(dengePos.nakit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Suitable POS Nakit Satış:</span>
            <span>{formatCurrency(suitablePos.nakit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasa Nakit Çıkışı (Gider):</span>
            <span>-{formatCurrency(nakitGiderToplam)}</span>
          </div>
        </div>

        <div className="border-t-2 border-black my-1.5"></div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm font-black">
            <span>HESAPLANAN KASA:</span>
            <span className="text-base font-black">{formatCurrency(metrics.hesaplananNakit)}</span>
          </div>
          <div className="flex justify-between text-sm font-black">
            <span>FİZİKİ KASA SAYIMI:</span>
            <span className="text-base font-black">{formatCurrency(metrics.fizikiSayim)}</span>
          </div>
          <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
            <span>KASA FARKI:</span>
            <span className="text-base font-black">
              {metrics.kasaFarki === 0
                ? '0,00 ₺ (TAM)'
                : metrics.kasaFarki < 0
                ? `${formatCurrency(Math.abs(metrics.kasaFarki))} (EKSİK)`
                : `${formatCurrency(metrics.kasaFarki)} (FAZLA)`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SATIŞ VE CİRO ÖZETİ */}
      <div className="py-2 border-b-2 border-black">
        <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
          --- SATIŞ VE CİRO ÖZETİ ---
        </div>
        <div className="space-y-1 text-sm font-bold">
          <div className="flex justify-between">
            <span>DengePOS Satış:</span>
            <span>{formatCurrency(metrics.dengePosToplam)}</span>
          </div>
          <div className="flex justify-between">
            <span>Suitable POS Satış:</span>
            <span>{formatCurrency(metrics.suitablePosToplam)}</span>
          </div>
        </div>
        <div className="border-t-2 border-black my-1.5"></div>
        <div className="flex justify-between text-base font-black">
          <span>TOPLAM SATIŞ (CİRO):</span>
          <span className="text-lg font-black">{formatCurrency(metrics.toplamSatis)}</span>
        </div>
      </div>

      {/* 3b. MARKA / KANAL KIRILIMLI CİRO */}
      {metrics.kanalGirildi && kanalCiro && (
        <div className="py-2 border-b-2 border-black">
          <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
            --- MARKA / KANAL CİRO ---
          </div>

          {/* Marka toplamları */}
          <div className="space-y-1 text-sm font-bold">
            {(kanalCiro.markalar || []).map((mk) => (
              <div key={mk.id} className="flex justify-between">
                <span>{mk.name}:</span>
                <span className="font-black">
                  {formatCurrency(metrics.kanal.markaCiro[mk.id])} · {formatNumber(metrics.kanal.markaPaket[mk.id])} pkt
                </span>
              </div>
            ))}
          </div>

          {/* Kanal satırları (yalnızca girilmiş olanlar) */}
          <div className="border-t border-black my-1.5"></div>
          <div className="space-y-1 text-xs font-bold">
            {(kanalCiro.satirlar || [])
              .filter((r) => {
                const t = metrics.kanal.satirToplamlari[r.id] || {};
                return (t.ciro || 0) !== 0 || (t.online || 0) !== 0 || (t.adet || 0) !== 0;
              })
              .map((r) => {
                const t = metrics.kanal.satirToplamlari[r.id] || {};
                return (
                  <div key={r.id}>
                    <div className="flex justify-between">
                      <span>{r.name}:</span>
                      <span className="font-black">{formatCurrency(t.ciro)}</span>
                    </div>
                    <div className="flex justify-between pl-2 text-[11px]">
                      <span>{r.sayiTuru === 'kisi' ? `${formatNumber(t.adet)} kişi` : `${formatNumber(t.adet)} paket`}</span>
                      {(t.online || 0) !== 0 && <span>Online alacak: {formatCurrency(t.online)}</span>}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="border-t-2 border-black my-1.5"></div>
          <div className="space-y-1 text-sm font-bold">
            <div className="flex justify-between text-base font-black">
              <span>CİRO TOPLAM:</span>
              <span>{formatCurrency(metrics.kanal.ciroToplam)}</span>
            </div>
            <div className="flex justify-between">
              <span>Online Alacak Toplam:</span>
              <span className="font-black">{formatCurrency(metrics.kanal.onlineToplam)}</span>
            </div>
            <div className="flex justify-between">
              <span>Toplam Paket / Kişi:</span>
              <span className="font-black">
                {formatNumber(metrics.kanal.paketToplam)} / {formatNumber(metrics.kanal.kisiToplam)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Kanal Ciro − POS Farkı:</span>
              <span className="font-black">{formatCurrency(metrics.kanalCiroFarki)}</span>
            </div>
            {metrics.onlineKontrolVar && (
              <div className="flex justify-between">
                <span>Online Alacak − Suitable Online:</span>
                <span className="font-black">{formatCurrency(metrics.kanalOnlineFarki)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Z RAPORU & FİŞ MUTABAKATI */}
      <div className="py-2 border-b-2 border-black">
        <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
          --- MALİ FİŞ & Z MUTABAKAT ---
        </div>
        <div className="space-y-1 text-sm font-bold">
          <div className="flex justify-between">
            <span>Gereken Nakit Fişi:</span>
            <span>{formatCurrency(metrics.kesilmesiGerekenNakitFisi)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kesilen Z Nakit Fişi:</span>
            <span className="font-black">{formatCurrency(metrics.kesilenNakitFisi)}</span>
          </div>
          <div className="flex justify-between font-black pt-0.5">
            <span>Nakit Fiş Farkı:</span>
            <span>{formatCurrency(metrics.nakitFisFarki)}</span>
          </div>

          <div className="border-t border-black my-1.5"></div>

          <div className="flex justify-between">
            <span>Hesaplanan Kredi Kartı:</span>
            <span>{formatCurrency(metrics.hesaplananKrediKarti)}</span>
          </div>
          <div className="flex justify-between">
            <span>Fiziki POS Kredi Kartı Z:</span>
            <span className="font-black">{formatCurrency(metrics.fizikiKrediKarti)}</span>
          </div>
          <div className="flex justify-between font-black pt-0.5">
            <span>Kredi Kartı Farkı:</span>
            <span>{formatCurrency(metrics.krediKartiFarki)}</span>
          </div>

          {metrics.bankaGirildi && (
            <>
              <div className="border-t border-black my-1.5"></div>
              <div className="font-black text-xs uppercase">Banka Gün Sonu</div>
              {(metrics.bankaDetay || []).map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between">
                    <span>{b.name}:</span>
                    <span className="font-black">{formatCurrency(b.tutar)}</span>
                  </div>
                  {/* Cihazın Banka 1/2/3 kırılımı (yalnızca girilenler) */}
                  {((zBilgileri.posCihazlari || []).find((d) => d.id === b.id)?.banka || []).map((v, slot) =>
                    num(v) !== 0 ? (
                      <div key={slot} className="flex justify-between pl-2 text-[11px]">
                        <span>Banka {slot + 1}:</span>
                        <span>{formatCurrency(v)}</span>
                      </div>
                    ) : null
                  )}
                  {b.cihazSayisi > 0 && (
                    <div className="flex justify-between pl-2 text-[11px]">
                      <span>Z: {formatCurrency(b.zToplam)}</span>
                      <span>Fark: {formatCurrency(b.fark)}</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between font-black pt-0.5">
                <span>Banka − Z Farkı:</span>
                <span>{formatCurrency(metrics.bankaFarki)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. YEMEK KARTLARI */}
      <div className="py-2 border-b-2 border-black">
        <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
          --- YEMEK KARTI GÜN SONU (GÜN SONU / SİSTEM) ---
        </div>
        <div className="space-y-1 text-sm font-bold">
          {Object.entries(metrics.yemekKartlari || {}).map(([key, item]) => {
            const name = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} className="flex justify-between">
                <span>{name}:</span>
                <span className="font-black">
                  {formatCurrency(item.fiziki)} / {formatCurrency(item.hesaplanan)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. HARCAMA DETAYLARI */}
      {harcamalar && harcamalar.length > 0 && (
        <div className="py-2 border-b-2 border-black">
          <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
            --- KASA GİDER DETAYLARI ---
          </div>
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
            <div className="flex justify-between">
              <span>Kasadan Çıkan Nakit Gider:</span>
              <span className="font-black">{formatCurrency(nakitGiderToplam)}</span>
            </div>
            {kkGiderToplam > 0 && (
              <div className="flex justify-between text-black">
                <span>Kredi Kartı ile Yapılan [KK]:</span>
                <span className="font-black">{formatCurrency(kkGiderToplam)} (Harici)</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
              <span>TOPLAM GİDER (Nakit+KK):</span>
              <span className="text-base font-black">{formatCurrency(metrics.toplamHarcamalar)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6.1. KURYE ADİSYON / PAKET ÖDEMELERİ */}
      {data.kuryeOdemeleri && data.kuryeOdemeleri.length > 0 && metrics.kuryeOdemeleriToplami > 0 && (
        <div className="py-2 border-b-2 border-black">
          <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
            --- KURYE PAKET ÖDEMELERİ ---
          </div>
          <div className="space-y-1 text-sm font-bold">
            {data.kuryeOdemeleri.filter(k => num(k.siparisSayisi) > 0 || num(k.toplamTutar) > 0).map((k, i) => {
              const count = num(k.siparisSayisi);
              const unit = k.birimFiyat !== undefined ? num(k.birimFiyat) : 20;
              const total = k.toplamTutar !== undefined && k.toplamTutar !== '' ? num(k.toplamTutar) : (count * unit);
              return (
                <div key={i} className="flex justify-between items-center">
                  <span>{k.kuryeAdi || 'Kurye'} ({count}x{unit}₺):</span>
                  <span className="font-black">{formatCurrency(total)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-black mt-1.5 pt-1 flex justify-between text-sm font-black">
            <span>Toplam Kurye Nakit Çıkışı:</span>
            <span className="font-black">{formatCurrency(metrics.kuryeOdemeleriToplami)}</span>
          </div>
        </div>
      )}

      {/* 6.2. KREDİ KARTI BAHŞİŞ & NAKİT TİP ÖDEMELERİ */}
      {data.tipOdemeleri && data.tipOdemeleri.length > 0 && (metrics.tipCekilenKartToplami > 0 || metrics.tipNetNakitToplami > 0) && (
        <div className="py-2 border-b-2 border-black">
          <div className="font-black text-sm uppercase text-center pb-0.5 mb-1.5 border-b border-black">
            --- BAHŞİŞ (TİP) ÖDEMELERİ ---
          </div>
          <div className="space-y-1 text-sm font-bold">
            {data.tipOdemeleri.filter(t => num(t.cekilenTip) > 0).map((t, i) => {
              const cardTip = num(t.cekilenTip);
              const rate = t.kesintiOrani !== undefined ? num(t.kesintiOrani) : 20;
              const netCash = t.netNakitTip !== undefined && t.netNakitTip !== '' ? num(t.netNakitTip) : (cardTip - (cardTip * (rate / 100)));
              return (
                <div key={i} className="flex justify-between items-center">
                  <span>{t.personelAdi || 'Personel'} (Kart:{cardTip}₺ -%{rate}):</span>
                  <span className="font-black">Net {formatCurrency(netCash)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-black mt-1.5 pt-1 space-y-0.5 text-xs font-bold">
            <div className="flex justify-between">
              <span>Karttan Çekilen Tip:</span>
              <span>{formatCurrency(metrics.tipCekilenKartToplami)}</span>
            </div>
            <div className="flex justify-between">
              <span>İşletme Komisyonu (%20):</span>
              <span>{formatCurrency(metrics.tipKesintiToplami)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-0.5 border-t border-black">
              <span>Kasadan Ödenen Net Nakit:</span>
              <span className="font-black">{formatCurrency(metrics.tipNetNakitToplami)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 7. İMZA ALANI */}
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
