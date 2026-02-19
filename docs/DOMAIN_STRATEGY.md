# Domain strategy: extensionscanner.com, scanextension, scanextensions.com

You own **extensionscanner.com**, **scanextension** (and any TLD you use), and **scanextensions.com**. To rank on the first page for "extension scanner" and related terms while avoiding duplicate content issues, use a **single canonical domain** and redirect the others.

---

## Recommended approach

1. **Canonical domain:** **https://extensionshield.com**  
   - Keep all content, backlinks, and SEO equity on this domain.  
   - The codebase already uses `extensionshield.com` in `frontend/src/utils/seoUtils.js` for canonical URLs and OG tags.

2. **Redirect all other domains to extensionshield.com**  
   - **301 Permanent Redirect** from:
     - `https://extensionscanner.com` → `https://extensionshield.com`
     - `https://www.extensionscanner.com` → `https://extensionshield.com`
     - `https://scanextension.com` (or whatever TLD you use) → `https://extensionshield.com`
     - `https://scanextensions.com` → `https://extensionshield.com`
     - `https://www.scanextensions.com` → `https://extensionshield.com`
   - Where you host DNS (e.g. Cloudflare, Hostinger):
     - Add each domain as an alias or connected domain.
     - Set up 301 redirects (page rule, redirect rule, or “Redirect to URL”) so every path on the alias domain goes to the same path on `https://extensionshield.com` (e.g. `extensionscanner.com/scan` → `extensionshield.com/scan`).

3. **Why not split content across domains?**  
   - Multiple domains with the same or similar content can be seen as duplicate content and dilute rankings.  
   - One strong domain (extensionshield.com) with keyword-rich pages and the exact-match domains 301’ing into it is the standard way to capture “extension scanner” searches while keeping one clear brand and one place for links and signals.

---

## Optional: branded landing (advanced)

If you later want “Extension Scanner” as a product name on a separate domain:

- Keep **extensionshield.com** as the main site (blog, scan tool, enterprise, comparison pages).  
- Use **extensionscanner.com** only as a **single landing page** that 301s to `https://extensionshield.com` (or to `https://extensionshield.com/scan`) after a short “Redirecting to ExtensionShield…” message.  
- Do **not** host full duplicate content on extensionscanner.com; the 301 passes equity to extensionshield.com and avoids duplicate content.

---

## Summary

| Domain | Action |
|--------|--------|
| **extensionshield.com** | Main canonical site (current codebase). |
| **extensionscanner.com** | 301 → extensionshield.com (all paths). |
| **scanextension** (e.g. .com) | 301 → extensionshield.com. |
| **scanextensions.com** | 301 → extensionshield.com. |

No code changes are required for canonical URLs; they already point to extensionshield.com. Configure the 301 redirects at your DNS/hosting provider.
