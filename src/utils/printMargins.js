/**
 * 80mm fişlerin sol/sağ baskı boşlukları (mm). Yazıcının basılabilir alanı bazen simetrik değildir
 * (örn. sağdan fazla kesebilir); bu ayar önizleme çubuğundan değiştirilir, bu tarayıcıda saklanır.
 * CSS tarafı `--fis-sol` / `--fis-sag` değişkenlerini kullanır (index.css, .thermal-receipt-container ve .sum-sheet).
 */
const KEY = 'yrnkasa_fis_bosluk';
export const VARSAYILAN_BOSLUK = { sol: 3, sag: 8 };

const sinirla = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(15, Math.max(0, n)) : d;
};

export const getPrintMargins = () => {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j) return { sol: sinirla(j.sol, VARSAYILAN_BOSLUK.sol), sag: sinirla(j.sag, VARSAYILAN_BOSLUK.sag) };
  } catch {
    /* depolama kapalı olabilir */
  }
  return { ...VARSAYILAN_BOSLUK };
};

export const applyPrintMargins = (m = getPrintMargins()) => {
  const root = document.documentElement;
  root.style.setProperty('--fis-sol', `${m.sol}mm`);
  root.style.setProperty('--fis-sag', `${m.sag}mm`);
};

export const setPrintMargins = (m) => {
  const next = { sol: sinirla(m.sol, VARSAYILAN_BOSLUK.sol), sag: sinirla(m.sag, VARSAYILAN_BOSLUK.sag) };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sorun değil: bu oturumda uygulanır */
  }
  applyPrintMargins(next);
  return next;
};
