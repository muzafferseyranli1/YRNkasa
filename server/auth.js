import crypto from 'crypto';

/**
 * Basit paylaşılan-parola kimlik doğrulaması.
 *  - AUTH_PASSWORD tanımlı değilse doğrulama KAPALIDIR (başlangıçta uyarı basılır).
 *  - Giriş başarılıysa imzalı, süreli bir token döner; istemci bunu Authorization: Bearer
 *    başlığı (veya görseller için ?token=) ile gönderir.
 */
const PASSWORD = process.env.AUTH_PASSWORD || '';
const SECRET = process.env.AUTH_SECRET || PASSWORD;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

export const authEnabled = () => !!PASSWORD;

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export const issueToken = () => {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp)}`;
};

const verifyToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
};

const extractToken = (req) => {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return typeof req.query.token === 'string' ? req.query.token : '';
};

export const requireAuth = (req, res, next) => {
  if (!authEnabled()) return next();
  if (verifyToken(extractToken(req))) return next();
  res.status(401).json({ success: false, error: 'Giriş gerekli', authRequired: true });
};

// Kaba kuvvet yavaşlatma: IP başına art arda hatalı denemede gecikme
const failures = new Map();

export const loginHandler = (req, res) => {
  if (!authEnabled()) return res.json({ success: true, token: '', authDisabled: true });

  const ip = req.ip || 'unknown';
  const rec = failures.get(ip) || { count: 0, until: 0 };
  if (rec.until > Date.now()) {
    return res.status(429).json({ success: false, error: 'Çok fazla hatalı deneme. Biraz bekleyip tekrar deneyin.' });
  }

  if (typeof req.body?.password === 'string' && safeEqual(req.body.password, PASSWORD)) {
    failures.delete(ip);
    return res.json({ success: true, token: issueToken() });
  }

  rec.count += 1;
  if (rec.count >= 5) {
    rec.until = Date.now() + Math.min(15 * 60 * 1000, 30 * 1000 * 2 ** (rec.count - 5));
  }
  failures.set(ip, rec);
  res.status(401).json({ success: false, error: 'Parola hatalı' });
};

export const checkHandler = (req, res) => {
  res.json({ success: true, authEnabled: authEnabled(), valid: !authEnabled() || verifyToken(extractToken(req)) });
};
