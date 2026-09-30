/**
 * API client with automatic Base URL detection for Web and Capacitor Android Native
 */

export const getApiBaseUrl = () => {
  // If running inside Capacitor Native or file protocol or dev environment
  if (
    (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) ||
    (typeof window !== 'undefined' && window.location.protocol === 'file:') ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ) {
    return 'http://188.132.198.144:3002';
  }
  return '';
};

export const apiFetch = (endpoint, options = {}) => {
  const base = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
  return fetch(url, options);
};
