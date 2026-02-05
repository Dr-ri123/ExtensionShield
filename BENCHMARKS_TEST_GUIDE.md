# Benchmarks Feature - Quick Start Guide

## 🚀 How to Test

### 1. Start the Development Server

If not already running:

```bash
cd /Users/stanzin/Desktop/ExtensionShield
make frontend
```

The server should start at `http://localhost:5173`

### 2. Navigate to Research Hub

Go to: **http://localhost:5173/research**

You should see:
- ✅ A new **"Benchmarks"** card (with 📊 icon)
- ✅ Subtitle: "Open, reproducible comparisons across scanners + industry risk trends."
- ✅ CTA button: "View benchmarks →"

### 3. Navigate to Benchmarks Page

Click the Benchmarks card or go directly to: **http://localhost:5173/research/benchmarks**

You should see:

#### Hero Section
- Purple badge: "BENCHMARKS"
- Title: "Benchmarks & Industry Trends"
- Subtitle about transparent metrics

#### Industry Trends Section
- **Chart 1**: "Malicious & Policy-Violating Extensions (Reported)"
  - Red line chart showing rising trend from 2022-2025
  - Hover to see data points with sources
- **Chart 2**: "Credential Theft / Data Exfiltration Incidents"
  - Orange line chart showing rising incidents
  - Hover for details
- **Sources Box**: Lists 5 credible data sources with links

#### ExtensionShield Benchmarking Section
- **Coverage Chart**: Bar chart comparing 9 signal categories
  - Green bars: ExtensionShield
  - Purple bars: Competitor A
  - Blue bars: Competitor B
  - Shows ExtensionShield leads in Governance, Privacy, Evidence
  
- **Divergence Chart**: Scanner disagreement by category
  - 6 extension categories
  - Shows where ExtensionShield detects risks others miss
  
- **Performance Charts**: Two bar charts
  - Median Scan Time (ExtensionShield: 45s)
  - Cache Hit Rate (ExtensionShield: 78%)

#### Why Our Score Differs Card
- Purple gradient background
- 🎯 icon
- Lists 6 unique features:
  - Data collection pattern detection
  - Third-party endpoint analysis
  - Remote code execution patterns
  - ToS/policy violation indicators
  - Permission-purpose alignment checks
  - Evidence chain-of-custody tracking

#### Safer Alternatives Card
- 💡 icon
- API endpoint specification in green badge
- 2 example recommendations:
  - uBlock Origin (Ad Blocker)
  - Bitwarden (Password Manager)
- Each shows: name, category, risk score, reason, key differences
- "Coming soon" note at bottom

#### Methodology Note
- Sample size: 1,247 extensions
- Last updated date
- Yellow TODO note about replacing mock data

## 🎨 Design Check

Verify these design elements:

### Colors
- ✅ ExtensionShield: Green (#22c55e)
- ✅ Competitor A: Purple (#8b5cf6)
- ✅ Competitor B: Blue (#3b82f6)
- ✅ Malicious data trend: Red (#ef4444)
- ✅ Data theft trend: Orange (#f59e0b)
- ✅ Badges: Purple/Green

### Layout
- ✅ Responsive grid (2 columns on desktop, 1 on mobile)
- ✅ Dark theme consistent with ExtensionShield
- ✅ Gradient background (purple/green)
- ✅ Subtle grid pattern overlay
- ✅ Cards with hover effects (lift + glow)

### Charts
- ✅ All charts use Recharts
- ✅ Custom tooltips with dark background
- ✅ Axis labels visible and readable
- ✅ Legend shows all data series
- ✅ Charts are responsive

### Interactive Elements
- ✅ Hover on cards shows green border glow
- ✅ Hover on chart elements shows tooltip
- ✅ Links have arrow icons
- ✅ External links have external link icon

## 🧪 Test Cases

### Test 1: Research Hub Card
1. Navigate to `/research`
2. Verify Benchmarks card appears between Case Studies and Methodology
3. Click "View benchmarks →"
4. Should navigate to `/research/benchmarks`

### Test 2: Page Load
1. Navigate directly to `/research/benchmarks`
2. Should show loading spinner briefly
3. Data should load from `/data/trends.json` and `/data/benchmarks.json`
4. All 5 charts should render

### Test 3: Chart Interactions
1. Hover over line chart data points → tooltip appears
2. Hover over bar charts → tooltip with values
3. Tooltips should show source information

### Test 4: Links
1. Click any source link in Sources Box → opens in new tab
2. All external links should have `target="_blank"` and `rel="noopener noreferrer"`

### Test 5: Responsive Design
1. Resize browser window to mobile size (< 768px)
2. Charts grid should collapse to single column
3. All charts should remain readable
4. X-axis labels should adjust

### Test 6: SEO
1. View page source
2. Verify `<title>` tag: "Benchmarks & Industry Trends | ExtensionShield"
3. Verify meta description is present
4. Verify canonical URL: `/research/benchmarks`

## 🐛 Known Issues / TODO

1. **Data is mock**: Currently using static JSON files
   - TODO: Replace with automated ingestion script
   - TODO: Add real-time API integration

2. **Recommendations API**: Not yet implemented
   - API contract defined in code
   - TODO: Connect to extension database

3. **Benchmarking data**: Representative mock data
   - TODO: Run actual comparative scans
   - TODO: Publish reproducible methodology

## 📱 Browser Compatibility

Test in:
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

## 🔍 Console Checks

Open browser DevTools Console and verify:
- ✅ No errors during page load
- ✅ No 404 errors for data files
- ✅ No React warnings
- ✅ Recharts loads successfully

## 📊 Expected Data

### Malicious Extensions Chart
- Should show 14 data points (Q1 2022 to Q2 2025)
- Values range from 42 to 578
- Rising trend

### Data Theft Chart
- Should show 13 data points
- Values range from 18 to 298
- Steeper rise in recent years

### Coverage Chart
- 9 categories compared
- ExtensionShield should lead in: Permissions (100), Evidence (100), Governance (95), Privacy (90)
- Competitors show 0% for Governance, Privacy, ToS Compliance

### Divergence Chart
- 6 extension categories
- ExtensionShield shows higher disagreement vs competitors (12-32%)
- Competitors agree more with each other (5-9%)

### Performance Charts
- ExtensionShield: 45s scan time, 78% cache hit
- Competitor A: 52s, 65%
- Competitor B: 61s, 58%

## ✅ Success Criteria

The implementation is successful if:
1. ✅ Benchmarks card appears on Research Hub
2. ✅ Benchmarks page loads without errors
3. ✅ All 5 charts render correctly
4. ✅ Data loads from JSON files
5. ✅ Sources box displays with working links
6. ✅ Page is responsive on mobile
7. ✅ Design matches ExtensionShield theme
8. ✅ No linter errors
9. ✅ SEO metadata is correct
10. ✅ TODO comments are in place for future work

---

**Status**: Ready for testing! 🎉

Navigate to http://localhost:5173/research/benchmarks to see the full implementation.

