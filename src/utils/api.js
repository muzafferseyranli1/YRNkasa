/**
 * API client with automatic Base URL detection for Web and Capacitor Android Native
 */

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

export const apiFetch = (endpoint, options = {}) => {
  const base = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
  return fetch(url, options);
};
