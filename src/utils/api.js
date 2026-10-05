/**
 * API client with automatic Base URL detection for Web and Capacitor Android Native,
 * plus bearer-token auth (token localStorage'da tutulur).
 */

const TOKEN_KEY = 'yrnkasa_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* depolama kapalı olabilir */
  }
};

export const getApiBaseUrl = () => {
  // If running inside Capacitor Native or file protocol
  if (
    (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) ||
    (typeof window !== 'undefined' && window.location.protocol === 'file:')
  ) {
    return 'https://kasa.derinsoft.com.tr';
  }
  return '';
};

export const apiFetch = async (endpoint, options = {}) => {
  const base = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && !endpoint.startsWith('/api/auth/')) {
    setToken('');
    window.dispatchEvent(new Event('yrnkasa-auth-required'));
  }
  return res;
};

// <img src> / <a href> istekleri başlık gönderemez; token sorgu parametresiyle eklenir
export const assetUrl = (path) => {
  if (!path) return path;
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path}`;
  const token = getToken();
  return token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;
};
