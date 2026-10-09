import { useEffect, useState } from 'react';
import { apiFetch } from './api';
import { calculateReportMetrics, normalizeReportData, shiftDate } from './calculations';

/** Geçen haftanın aynı günü (date - 7) kaydının metriklerini getirir; kayıt yoksa metrics = null. */
export default function usePrevWeek(date) {
  const [prev, setPrev] = useState({ exists: false, metrics: null });
  const prevDate = shiftDate(date, -7);

  useEffect(() => {
    let alive = true;
    setPrev({ exists: false, metrics: null });
    (async () => {
      try {
        const res = await apiFetch(`/api/reports/${prevDate}`);
        const json = await res.json();
        if (!alive || !json.success) return;
        setPrev({
          exists: !!json.exists,
          metrics: json.exists ? calculateReportMetrics(normalizeReportData(json.report.data)) : null,
        });
      } catch {
        /* karşılaştırma olmadan da çalışır */
      }
    })();
    return () => {
      alive = false;
    };
  }, [prevDate]);

  return { ...prev, prevDate };
}
