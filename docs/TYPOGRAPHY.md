# Typography system – ExtensionShield

Canonical type system and audit summary. Use this for consistency across UI, marketing, and report/scan pages.

---

## Findings (audit)

- **font-family overrides**
  - `HomePage.jsx`: SVG `<text>` used `fontFamily="Arial"` (logo icon; left as-is for SVG).
  - `ReportDetailPage.jsx`: Inline `fontFamily` with a long mono stack; normalized to `var(--font-mono)`.
  - `ScanProgressPage.scss`: `.retro-title`, `.retro-subtitle`, `.retro-id`, `.retro-exit-button` used `'Courier New', ...` instead of `var(--font-mono)`; updated to token.
  - Many components use `font-family: inherit`; acceptable where parent sets `var(--font-sans)` (e.g. body/App).

- **Explicit font-size / line-height**
  - Two systems: `index.css` `--report-text-*` / `--report-line-*` and `_theme-tokens.scss` `$font-size-*` (note: `_theme-tokens.scss` is not currently imported; index.css is canonical).
  - `--report-text-sm` was 15px; set to 0.875rem (14px) to match canonical sm.

- **Hover changing typography**
  - No hover rules were found that change `font-weight`, `font-size`, `line-height`, or `letter-spacing`. Link/button hovers use color, background, underline, or transform only.

- **Non-canonical weights**
  - `EnterprisePage.scss`: 800/900 used for headings and CTA; normalized to 600/700 and 500 for buttons/labels.
  - `MethodologyPage.scss`: 900 (decorative) → 700; 300 (body) → 400.
  - `SummaryPanel.scss`: `font-weight: 450` → 400; `font-weight: bold` → 700.

- **VT323**
  - Used only in `ScanHUD.scss` and `ScanProgressPage.scss` (scan HUD + progress modals). Comments added to keep it scoped.

---

## Decision (canonical mapping)

| Role | Family | Weight | Line height | Size (body/UI) |
|------|--------|--------|-------------|-----------------|
| Body | `var(--font-sans)` | `--weight-body` (400) | `--leading-normal` (1.6) | 16px |
| UI / labels / buttons / nav | `var(--font-sans)` | `--weight-ui` (500) | inherit | per component |
| Headings | `var(--font-sans)` | `--weight-heading` (600) | tight/normal | per component |
| Strong emphasis | `var(--font-sans)` | `--weight-strong` (700) | inherit | per component |
| Code / IDs | `var(--font-mono)` | 400–700 as needed | inherit | per component |
| Display (scan HUD/progress only) | VT323 | 400 | — | per component |

- **Weights:** 400, 500, 600, 700 only in normal UI. 800 reserved for rare hero/display if needed; 900/300/450 removed.
- **Size scale:** xs 12px, sm 14px, base 16px, lg 18px, xl 20px, 2xl 24px, 3xl 30px, 4xl 36px (aligned with `--report-text-*` and SCSS).
- **Hover/focus:** Use color, opacity, underline, or transform only; do not change font-weight, font-size, line-height, or letter-spacing.

---

## Changes (file-by-file)

| File | Change |
|------|--------|
| `frontend/src/index.css` | Added `--weight-body`, `--weight-ui`, `--weight-heading`, `--weight-strong` and `--leading-tight`, `--leading-normal`, `--leading-relaxed`. Aligned `--report-text-sm` to 14px; added `--report-text-2xl/3xl/4xl`; report line-heights use leading vars. Body: `font-size: 16px`, `line-height: var(--leading-normal)`, `font-weight: var(--weight-body)`. |
| `frontend/src/styles/_theme-tokens.scss` | Typography comment updated: scale aligned with `--report-text-*` and weight tokens; note “do not change on hover”. |
| `frontend/src/pages/EnterprisePage.scss` | Replaced 800/900 with `var(--weight-heading, 600)` or `var(--weight-strong, 700)`; button/label use `var(--weight-ui, 500)`. |
| `frontend/src/pages/research/MethodologyPage.scss` | 900 → `var(--weight-strong, 700)`; 300 → `var(--weight-body, 400)`. |
| `frontend/src/components/report/SummaryPanel.scss` | 450 → `var(--weight-body, 400)`; `bold` → `var(--weight-strong, 700)`. |
| `frontend/src/pages/scanner/ScanProgressPage.scss` | `.retro-title`, `.retro-subtitle`, `.retro-id`, `.retro-exit-button`: font-family → `var(--font-mono)`, font-weight → `var(--weight-strong, 700)` where 700. Comment: VT323 only for scan-progress modals. |
| `frontend/src/pages/reports/ReportDetailPage.jsx` | Inline `fontFamily` for JSON block → `var(--font-mono)`. |
| `frontend/src/components/ScanHUD.scss` | Comment: VT323 only for scan HUD; do not use elsewhere. |

---

## Visual checklist

- **Nav:** Items use weight 500; hover changes color/background only, not weight/size.
- **Hero:** Headings 600; body 400; no 800/900 unless a single hero exception.
- **CTA buttons:** Single weight (500); hover uses color/background/transform only.
- **Links:** Hover uses color/underline; weight unchanged (500 or inherit).
- **Cards / headings:** Section titles 600; card titles 600; body 400.
- **Report page:** Uses `--report-font` (sans); code/IDs use `var(--font-mono)`; sizes use `--report-text-*`, line-heights `--report-line-*`.
- **Scan HUD / Scan progress:** VT323 only in HUD and progress modals; rest of progress page uses `var(--font-mono)`.
