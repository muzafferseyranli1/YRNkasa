import React, { useState, useRef } from 'react';

/**
 * Tutar giriş alanı.
 *  - Odaklanınca içeriği tamamen seçer (0'ın sağına yazma sorunu olmaz).
 *  - "10+5" gibi ifadeleri destekler: Enter, "=" butonu veya alandan çıkınca sonucu (15) yazar.
 *  - Ondalık için virgül veya nokta kabul edilir.
 * onChange, <input> ile aynı şekilde { target: { value } } alır (value metin olarak gelir).
 */

const EXPR_ALLOWED = /^[0-9+\-*/().,\s]+$/;
const HAS_OPERATOR = /[+*/]|\d\s*-/;

export const evaluateExpression = (text) => {
  const src = String(text ?? '').trim();
  if (!src || !EXPR_ALLOWED.test(src)) return null;
  const expr = src.replace(/,/g, '.').replace(/\s+/g, '');
  try {
    // Yalnızca rakam ve + - * / ( ) . karakterleri geçtiği için güvenli
    const result = Function(`"use strict"; return (${expr});`)();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
};

// Odakta değilken 1.000,00 (tr-TR) biçiminde gösterir; step="1" olan alanlar (adet) ondalıksız: 1.000
export const formatDisplay = (value, decimals) => {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(value);
  if (!isFinite(n)) return String(value);
  return n.toLocaleString("tr-TR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export default function NumberInput({
  value,
  onChange,
  className = '',
  wrapperClassName = 'w-full',
  placeholder = '0',
  // <input type="number"> ile uyumluluk için kabul edilip yok sayılan prop'lar
  step,
  min,
  max,
  type,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const justFocused = useRef(false);

  const emit = (v) => onChange?.({ target: { value: v } });

  const decimals = String(step) === '1' ? 0 : 2;
  const shown = focused ? draft : formatDisplay(value, decimals);
  const pending = focused && HAS_OPERATOR.test(draft);

  const commit = () => {
    if (!HAS_OPERATOR.test(draft)) return draft;
    const result = evaluateExpression(draft);
    if (result === null) return draft;
    const text = String(result);
    setDraft(text);
    emit(text);
    return text;
  };

  const handleFocus = (e) => {
    const n = Number(value);
    setDraft(value === undefined || value === null || value === '' || n === 0 ? '' : String(value));
    setFocused(true);
    justFocused.current = true;
    const el = e.target;
    setTimeout(() => el.select?.(), 0);
  };

  const handleChange = (e) => {
    const text = e.target.value;
    setDraft(text);
    if (text === '') {
      emit('');
    } else if (/^-?\d*[.,]?\d*$/.test(text)) {
      emit(text.replace(',', '.'));
    }
    // İfade yazılıyorsa (10+5) sonucu Enter / "=" / blur'da yazılır
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === '=') {
      if (HAS_OPERATOR.test(draft)) {
        e.preventDefault();
        commit();
      }
    }
  };

  const handleBlur = () => {
    commit();
    setFocused(false);
  };

  const keepFocus = (e) => e.preventDefault();

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={shown}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onMouseUp={(e) => {
          // Tıklamayla odaklanınca imleç seçimi bozmasın (Safari/Chrome mouseup'ta seçimi kaldırır)
          if (justFocused.current) {
            e.preventDefault();
            justFocused.current = false;
          }
        }}
        className={className}
        style={{ textAlign: "left", ...rest.style }}
        {...rest}
      />
      {focused && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 z-10 screen-only">
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={keepFocus}
            onClick={() => setDraft((d) => (d && !/[+\-*/]\s*$/.test(d) ? `${d}+` : d))}
            className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black leading-none"
            title="Toplama ekle (10+5)"
          >
            +
          </button>
          {pending && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={keepFocus}
              onClick={commit}
              className="w-6 h-6 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black leading-none"
              title="Hesapla"
            >
              =
            </button>
          )}
        </div>
      )}
    </div>
  );
}
