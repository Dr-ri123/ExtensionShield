/**
 * SEO-focused blog posts (long-tail keywords).
 * Each slug is used in route path /blog/:slug and in sitemap.
 */
export const blogPosts = [
  {
    slug: "how-to-check-chrome-extension-permissions",
    title: "How to Check Chrome Extension Permissions Safely",
    description: "Learn how to check chrome extension permissions safely before installing. What to look for, which permissions are risky, and how ExtensionShield helps you audit extension security.",
    date: "2026-02",
    category: "Security",
    sections: [
      {
        heading: "Why checking permissions matters",
        body: "Chrome extensions can request access to your tabs, browsing history, clipboard, and more. Checking chrome extension permissions safely helps you avoid extensions that can read sensitive data or change pages without your knowledge. Use the Chrome Web Store detail page and the extension's permission list, then cross-check with a chrome extension security scanner like ExtensionShield for a full risk assessment."
      },
      {
        heading: "What to look for",
        body: "Look for broad host permissions (e.g. <all_urls>), access to storage or cookies, and optional_host_permissions in Manifest V3. Our chrome extension permissions checker and chrome extension risk score give you a clear picture before you install."
      },
      {
        heading: "Next steps",
        body: "Paste any Chrome Web Store URL into ExtensionShield to get a chrome extension risk score, permission breakdown, and audit chrome extension security report in under a minute."
      }
    ]
  },
  {
    slug: "how-to-audit-chrome-extension-before-installing",
    title: "How to Audit a Chrome Extension Before Installing",
    description: "Step-by-step guide to audit a chrome extension before installing: permissions, risk score, and how to check if a Chrome extension is safe using a browser extension security scanner.",
    date: "2026-02",
    category: "Security",
    sections: [
      {
        heading: "Before you install",
        body: "Auditing a chrome extension before installing reduces the risk of malware, spyware, and privacy violations. Use a browser extension security scanner to get a chrome extension risk score, review requested permissions, and check for known threats. ExtensionShield combines static analysis, VirusTotal, and governance signals so you can check if a Chrome extension is safe."
      },
      {
        heading: "What an audit should cover",
        body: "A good audit covers: permission risk, code quality (SAST), obfuscation, external domains and data exfiltration signals, publisher reputation, and compliance with store policies. Our extension security analysis tool provides all of this in one report."
      },
      {
        heading: "Try it",
        body: "Scan any extension at ExtensionShield for free. You'll get an overall chrome extension risk score plus Security, Privacy, and Governance breakdowns—so you can audit chrome extension security in one place."
      }
    ]
  },
  {
    slug: "enterprise-browser-extension-risk-management",
    title: "Enterprise Browser Extension Risk Management",
    description: "How to run a browser extension risk management program: allowlist policy, compliance monitoring, shadow IT browser extensions, and chrome enterprise extension security with ExtensionShield.",
    date: "2026-02",
    category: "Enterprise",
    sections: [
      {
        heading: "Why enterprises need extension risk management",
        body: "Shadow IT browser extensions—installations outside of IT approval—create compliance and security gaps. A browser extension risk management program with a clear browser extension allowlist policy and extension permissions audit for employees helps you manage chrome extensions in enterprise and reduce exposure to malicious chrome extension campaigns and browser extension spyware."
      },
      {
        heading: "Key components",
        body: "Implement browser extension compliance monitoring, define a browser extension allowlist policy, and use a chrome extension risk score tool to evaluate extensions before allowlisting. Zero trust browser extension security means verifying every extension against your policy and re-scanning when extensions update. ExtensionShield Enterprise supports extension governance and audit-ready reporting."
      },
      {
        heading: "Getting started",
        body: "Request an Enterprise pilot at ExtensionShield for monitoring, allow/block governance, and extension risk assessment at scale. We help IT and security teams with chrome enterprise extension security and extension permissions audit for employees."
      }
    ]
  },
  {
    slug: "how-to-detect-malicious-chrome-extensions",
    title: "How to Detect Malicious Chrome Extensions",
    description: "Signs of malicious chrome extensions, browser extension spyware, and how to detect data exfiltration and extension hijacking. Use a chrome extension security scanner to check if an extension is safe.",
    date: "2026-02",
    category: "Security",
    sections: [
      {
        heading: "Signs of malicious extensions",
        body: "Malicious chrome extension campaigns and browser extension spyware often rely on broad permissions, obfuscated code, or extension hijacked via update. Chrome extension data exfiltration signs include requests to external domains you don't recognize, access to cookies or session storage, and permission combinations that allow reading and sending data. Extension session hijacking cookies is a real risk when extensions have cookie or storage access."
      },
      {
        heading: "How scanners help",
        body: "A chrome extension security scanner that uses SAST, VirusTotal, and permission analysis can flag suspicious patterns before you install. ExtensionShield provides a chrome extension risk score and highlights security, privacy, and governance issues so you can detect malicious chrome extensions and avoid extension hijacked via update scenarios."
      },
      {
        heading: "Stay protected",
        body: "Scan extensions before installing and re-scan after major updates. Use our scan chrome extension for malware workflow to get a report in under a minute and check if a chrome extension is safe."
      }
    ]
  }
];

export const getBlogPostBySlug = (slug) =>
  blogPosts.find((p) => p.slug === slug) || null;
