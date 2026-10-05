import React, { useEffect, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { apiFetch, getToken, setToken } from '../utils/api';

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | locked | open
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = async () => {
    try {
      const res = await apiFetch('/api/auth/check');
      const json = await res.json();
      setStatus(json.valid ? 'open' : 'locked');
    } catch {
      // Sunucuya ulaşılamıyorsa kayıtlı token varsa uygulamayı aç, hatalar kendi akışında görünür
      setStatus(getToken() ? 'open' : 'locked');
    }
  };

  useEffect(() => {
    check();
    const onAuth = () => setStatus('locked');
    window.addEventListener('yrnkasa-auth-required', onAuth);
    return () => window.removeEventListener('yrnkasa-auth-required', onAuth);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        setToken(json.token);
        setPassword('');
        setStatus('open');
      } else {
        setError(json.error || 'Giriş başarısız');
      }
    } catch {
      setError('Sunucuya bağlanılamadı');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'open') return children;

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="w-full max-w-xs bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-slate-800">YRN Kasa</h1>
          <p className="text-xs text-slate-500">Devam etmek için parolayı girin</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Parola"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-colors"
        >
          {busy ? 'Kontrol ediliyor...' : 'Giriş'}
        </button>
      </form>
    </div>
  );
}
