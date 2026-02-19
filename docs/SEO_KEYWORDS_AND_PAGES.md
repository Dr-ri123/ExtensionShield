# SEO Keywords → Page Mapping

Use this as the single source of truth for which page targets which keywords. All canonical URLs use **https://extensionshield.com**. Domains extensionscanner.com, scanextension, scanextensions.com should 301 redirect here (see [DOMAIN_STRATEGY.md](./DOMAIN_STRATEGY.md)).

---

## 1. Money keywords (highest intent)

| Keyword | Primary page | Notes |
|--------|--------------|--------|
| chrome extension security scanner | `/`, `index.html` | Home title + description |
| browser extension security scanner | `/`, `/scan` | Home + Scan page |
| scan chrome extension for malware | `/scan` | Scanner page title/description |
| chrome extension risk score | `/scan`, `/research/methodology` | Scan + methodology |
| chrome extension permissions checker | `/scan`, `/glossary` | Scan page, glossary |
| audit chrome extension security | `/scan`, `/enterprise` | Scan + Enterprise |
| chrome extension privacy scanner | `/`, `/scan` | Home + Scan |
| browser extension security audit | `/scan`, `/enterprise` | Scan + Enterprise |
| check if a chrome extension is safe | `/scan` | Scan page |
| extension security analysis tool | `/`, `/scan` | Home + Scan |
| extension risk assessment | `/scan`, `/enterprise`, `/research/methodology` | Multiple |
| extension governance / compliance (enterprise) | `/enterprise` | Enterprise page |

---

## 2. Long-tail blog keywords

| Keyword | Blog route | Purpose |
|--------|------------|---------|
| how to check chrome extension permissions safely | `/blog/how-to-check-chrome-extension-permissions` | Long-tail post |
| what chrome extension permissions are dangerous | `/blog/dangerous-chrome-extension-permissions` | Long-tail post |
| why extensions need broad host permissions | `/blog/why-extensions-need-broad-host-permissions` | Long-tail post |
| how to detect malicious chrome extensions | `/blog/how-to-detect-malicious-chrome-extensions` | Long-tail post |
| chrome extension data exfiltration signs | `/blog/chrome-extension-data-exfiltration-signs` | Long-tail post |
| chrome extension content security policy explained | `/blog/content-security-policy-chrome-extensions` | Long-tail post |
| manifest v3 security implications | `/blog/manifest-v3-security-implications` | Long-tail post |
| web accessible resources security risk chrome extension | `/blog/web-accessible-resources-security-risk` | Long-tail post |
| externally connectable domains chrome extension risk | `/blog/externally-connectable-domains-risk` | Long-tail post |
| content scripts security risks | `/blog/content-scripts-security-risks` | Long-tail post |
| how to audit a chrome extension before installing | `/blog/how-to-audit-chrome-extension-before-installing` | Long-tail post |
| enterprise browser extension risk management | `/blog/enterprise-browser-extension-risk-management` | Long-tail post |

---

## 3. Enterprise / IT admin keywords

| Keyword | Primary page |
|--------|--------------|
| browser extension allowlist policy | `/enterprise` |
| manage chrome extensions in enterprise | `/enterprise` |
| browser extension compliance monitoring | `/enterprise` |
| shadow IT browser extensions | `/enterprise`, `/blog/enterprise-browser-extension-risk-management` |
| browser extension risk management program | `/enterprise` |
| extension permissions audit for employees | `/enterprise` |
| chrome enterprise extension security | `/enterprise` |
| zero trust browser extension security | `/enterprise` |

---

## 4. Comparison keywords

| Keyword | Page |
|--------|------|
| ExtensionShield vs CRXcavator | `/compare/crxcavator` |
| ExtensionShield vs CRXplorer | `/compare/crxplorer` |
| ExtensionShield vs ExtensionAuditor | `/compare/extension-auditor` |
| best chrome extension security scanner | `/compare` (best scanner page) |
| crxcavator alternatives | `/compare`, `/compare/crxcavator` |
| chrome extension risk score tool | `/scan`, `/compare` |

---

## 5. News-driven keywords

Target with blog posts and case studies when incidents occur (e.g. ShadyPanda-type campaigns):

| Keyword | Page / content |
|--------|-----------------|
| malicious chrome extension campaign | `/research/case-studies`, `/blog` |
| browser extension spyware | `/research`, `/blog/how-to-detect-malicious-chrome-extensions` |
| extension hijacked via update | Blog post (create when timely) |
| extension session hijacking cookies | Blog post (create when timely) |

Keep case studies (PDF converters, fake ad blockers, Honey) updated; add new posts when news breaks.

---

## Sitemap and canonical

- All indexable pages have `seo` in `routes.jsx` and appear in `sitemap.xml`.
- Canonical domain: **https://extensionshield.com** (see `frontend/src/utils/seoUtils.js`).
- Run `npm run generate:sitemap` after adding new routes.
