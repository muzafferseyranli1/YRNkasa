import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';

// kind -> geçmişte kullanılan isimler (oturum boyunca önbellekte)
const cache = {};
const loadNames = (kind) => {
  if (!cache[kind]) {
    cache[kind] = apiFetch(`/api/reports/names/${kind}`)
      .then((r) => r.json())
      .then((j) => (j.success ? j.names : []))
      .catch(() => {
        delete cache[kind];
        return [];
      });
  }
  return cache[kind];
};

const lower = (s) => s.toLocaleLowerCase('tr-TR');

/**
 * Excel gibi satır içi otomatik tamamlama: baş harfleri yazınca ismin devamı
 * seçili olarak gelir; Enter/Tab veya sağ ok kabul eder, yazmaya devam edersen
 * önerinin üzerine yazılır. `extraNames` (örn. formdaki mevcut isimler) da önerilir.
 */
export default function NameInput({ kind, value, onChange, extraNames = [], className = '', ...rest }) {
  const [known, setKnown] = useState([]);
  const inputRef = useRef(null);
  const pendingSel = useRef(null);

  // Önerinin devamını, React değeri DOM'a yazdıktan sonra seçili hale getir
  useLayoutEffect(() => {
    const sel = pendingSel.current;
    const el = inputRef.current;
    if (sel && el && el.value.length >= sel[1]) {
      try {
        el.setSelectionRange(sel[0], sel[1]);
      } catch {
        /* odak kaybedilmiş olabilir */
      }
    }
    pendingSel.current = null;
  }, [value]);

  useEffect(() => {
    let alive = true;
    loadNames(kind).then((n) => alive && setKnown(n));
    return () => {
      alive = false;
    };
  }, [kind]);

  const suggestions = [...new Set([...extraNames, ...known].map((n) => (n || '').trim()).filter(Boolean))];

  const handleChange = (e) => {
    const el = e.target;
    const typed = el.value;
    const native = e.nativeEvent;
    const deleting = native?.inputType?.startsWith('delete');
    onChange(e);

    if (deleting || !typed || el.selectionStart !== typed.length) return;
    const hit = suggestions.find((n) => lower(n).startsWith(lower(typed)) && n.length > typed.length);
    if (!hit) return;
    // Önerinin yazımını (büyük/küçük harf) kullan, yazılmayan kısmı seçili bırak
    pendingSel.current = [typed.length, hit.length];
    onChange({ target: { value: hit } });
  };

  const handleKeyDown = (e) => {
    const el = e.target;
    if ((e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowRight') && el.selectionStart !== el.selectionEnd) {
      if (e.key === 'Enter') e.preventDefault();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      autoComplete="off"
      className={className}
      {...rest}
    />
  );
}
