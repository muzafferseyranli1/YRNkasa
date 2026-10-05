/**
 * API client with automatic Base URL detection, bearer-token auth,
 * and automatic fallback (Domain <-> Direct VPS IP) for 100% uptime on mobile.
 */

const TOKEN_KEY = 'yrnkasa_token';
const PRIMARY_BASE = 'https://kasa.derinsoft.com.tr';
const FALLBACK_BASE = 'http://188.132.198.144:3002';

let activeBaseUrl = PRIMARY_BASE;

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

export const isNativeApp = () => {
  return (
    (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) ||
    (typeof window !== 'undefined' && window.location.protocol === 'file:')
  );
};

export const getApiBaseUrl = () => {
  if (isNativeApp()) {
    return activeBaseUrl;
  }
  return '';
};

export const apiFetch = async (endpoint, options = {}) => {
  const isNative = isNativeApp();
  const token = getToken();

  const makeRequest = async (baseUrl) => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  if (!isNative) {
    // Web browser: relative request
    const res = await makeRequest('');
    if (res.status === 401 && !endpoint.startsWith('/api/auth/')) {
      setToken('');
      window.dispatchEvent(new Event('yrnkasa-auth-required'));
    }
    return res;
  }

  // Mobile App: Try active base URL first
  try {
    const res = await makeRequest(activeBaseUrl);
    // If domain gives 502/503/504 Bad Gateway, try fallback IP
    if (res.status >= 502 && res.status <= 504) {
      throw new Error(`Gateway Error ${res.status}`);
    }
    if (res.status === 401 && !endpoint.startsWith('/api/auth/')) {
      setToken('');
      window.dispatchEvent(new Event('yrnkasa-auth-required'));
    }
    return res;
  } catch (err) {
    console.warn(`[API] ${activeBaseUrl} failed, trying fallback...`, err);
    // Switch to fallback
    const altBase = activeBaseUrl === PRIMARY_BASE ? FALLBACK_BASE : PRIMARY_BASE;
    try {
      const altRes = await makeRequest(altBase);
      if (altRes.ok || altRes.status === 400 || altRes.status === 401) {
        activeBaseUrl = altBase; // Cache working base URL
      }
      if (altRes.status === 401 && !endpoint.startsWith('/api/auth/')) {
        setToken('');
        window.dispatchEvent(new Event('yrnkasa-auth-required'));
      }
      return altRes;
    } catch (altErr) {
      throw altErr;
    }
  }
};

// <img src> / <a href> istekleri için URL oluşturucu
export const assetUrl = (path) => {
  if (!path) return path;
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path}`;
  const token = getToken();
  return token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;
};
