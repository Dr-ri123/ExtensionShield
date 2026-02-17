/**
 * Risk rating criteria (aligned with backend scoring/models.py and normalizeScanResult.ts)
 * Used by DonutScore, sidebar tiles, and any UI that shows red/amber/green bands.
 * Colors come from CSS variables in index.css (--risk-good, --risk-warn, --risk-bad, --risk-neutral).
 *
 * Red (BAD):    0–59  — Not safe
 * Amber (WARN): 60–84 — Needs review
 * Green (GOOD): 85–100 — Safe
 *
 * Consumer-friendly labels: "Safe", "Needs review", "Not safe"
 * These are intuitive and help users quickly understand extension safety.
 * Aligned with signalMapper.js (getRiskDisplayLabel, getSignalDisplayLabel).
 */
export const RISK_BAND_THRESHOLDS = {
  BAD:  { min: 0,  max: 59,  label: 'Not safe',      color: 'var(--risk-bad)' },
  WARN: { min: 60, max: 84,  label: 'Needs review',  color: 'var(--risk-warn)' },
  GOOD: { min: 85, max: 100, label: 'Safe',          color: 'var(--risk-good)' },
};

export const getBandFromScore = (score) => {
  if (score == null) return 'NA';
  if (score >= RISK_BAND_THRESHOLDS.GOOD.min) return 'GOOD';
  if (score >= RISK_BAND_THRESHOLDS.WARN.min) return 'WARN';
  return 'BAD';
};

/** Return CSS variable for band (for use in style/className). */
export const getRiskColorVar = (band) => {
  switch (band) {
    case 'GOOD': return 'var(--risk-good)';
    case 'WARN': return 'var(--risk-warn)';
    case 'BAD': return 'var(--risk-bad)';
    default: return 'var(--risk-neutral)';
  }
};
