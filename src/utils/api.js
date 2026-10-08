/**
 * API client: aynı origin üzerinden (Express hem API'yi hem arayüzü sunar) + bearer-token auth.
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

export const apiFetch = async (endpoint, options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(endpoint, { ...options, headers });
  if (res.status === 401 && !endpoint.startsWith('/api/auth/')) {
    setToken('');
    window.dispatchEvent(new Event('yrnkasa-auth-required'));
  }
  return res;
};

// <img src> / <a href> istekleri başlık gönderemez; token sorgu parametresiyle eklenir
export const assetUrl = (path) => {
  if (!path) return path;
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http')) return path;
  const token = getToken();
  return token ? `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : path;
};
