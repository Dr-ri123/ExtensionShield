import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./HoneyCaseStudyPage.scss";

const HoneyCaseStudyPage = () => {
  return (
    <>
      <Helmet>
        <title>Honey Extension Scam Case Study | ExtensionShield</title>
        <meta name="description" content="In-depth analysis of how PayPal's Honey extension hijacked affiliate links, tracked shopping behavior, and deceived 17 million users." />
        <link rel="canonical" href="https://extensionshield.com/research/case-studies/honey" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "The Honey Extension Scam: A Case Study",
            "description": "How PayPal's Honey extension hijacked affiliate links and deceived 17 million users",
            "author": {
              "@type": "Organization",
              "name": "ExtensionShield"
            },
            "datePublished": "2024-12-01",
            "publisher": {
              "@type": "Organization",
              "name": "ExtensionShield"
            }
          })}
        </script>
      </Helmet>

      <div className="honey-case-study-page">
        <div className="honey-bg">
          <div className="bg-gradient" />
        </div>

        <div className="honey-content">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <Link to="/research">Research</Link>
            <span>/</span>
            <Link to="/research/case-studies">Case Studies</Link>
            <span>/</span>
            <span>Honey</span>
          </nav>

          {/* Header */}
          <header className="honey-header">
            <div className="honey-meta">
              <span className="severity-badge high">HIGH RISK</span>
              <span className="category-badge">Affiliate Fraud</span>
              <span className="date-badge">Exposed December 2024</span>
            </div>
            <h1>The Honey Extension Scam</h1>
            <p className="honey-subtitle">17 Million Users. $4 Billion Acquisition. One Big Lie.</p>
          </header>

          {/* Stats */}
          <div className="honey-stats">
            <div className="stat">
              <span className="stat-value">17M+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat">
              <span className="stat-value">$4B</span>
              <span className="stat-label">PayPal Paid</span>
            </div>
            <div className="stat danger">
              <span className="stat-value">$0</span>
              <span className="stat-label">Real Savings</span>
            </div>
          </div>

          {/* Content */}
          <article className="honey-article">
            <section>
              <h2>What Honey Promised</h2>
              <p>
                Honey marketed itself as a free browser extension that automatically finds and applies 
                the best coupon codes at checkout. With celebrity endorsements and viral marketing, 
                it accumulated over 17 million users who trusted it to save them money.
              </p>
            </section>

            <section>
              <h2>What Honey Actually Did</h2>
              <div className="findings-grid">
                <div className="finding-card">
                  <div className="finding-icon">🔗</div>
                  <h3>Affiliate Link Hijacking</h3>
                  <p>
                    Silently overwrote creator affiliate codes with Honey's own. Content creators 
                    who recommended products got nothing—Honey took their commissions.
                  </p>
                </div>
                <div className="finding-card">
                  <div className="finding-icon">👁️</div>
                  <h3>Shopping Surveillance</h3>
                  <p>
                    Tracked every page view, cart addition, and purchase. This data was sold to 
                    retailers who used it for price discrimination.
                  </p>
                </div>
                <div className="finding-card">
                  <div className="finding-icon">🎭</div>
                  <h3>Fake "Best" Coupons</h3>
                  <p>
                    The dramatic "searching for coupons" animation was theater. Honey often showed 
                    worse deals than publicly available codes.
                  </p>
                </div>
                <div className="finding-card">
                  <div className="finding-icon">💰</div>
                  <h3>Retailer Kickbacks</h3>
                  <p>
                    Retailers paid Honey to suppress better deals. You got "Honey's best price" 
                    rather than the actual best price.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2>The Aftermath</h2>
              <p>
                After MegaLag's exposé in December 2024, Honey faced widespread backlash. Content 
                creators discovered years of stolen commissions. Users realized their "savings" 
                were often illusory. Yet Honey continues to operate, backed by PayPal's $4 billion 
                investment.
              </p>
            </section>

            <section>
              <h2>Lessons Learned</h2>
              <ul className="lessons-list">
                <li>
                  <strong>Star ratings mean nothing.</strong> Honey had 4.9 stars and millions of 
                  reviews—all while actively harming users.
                </li>
                <li>
                  <strong>Free products aren't free.</strong> When you're not paying, you're the 
                  product being sold.
                </li>
                <li>
                  <strong>Permissions matter.</strong> "Read and change all your data on all 
                  websites" should be a red flag.
                </li>
                <li>
                  <strong>Trust the code, not the marketing.</strong> Static analysis would have 
                  caught Honey's affiliate hijacking years ago.
                </li>
              </ul>
            </section>
          </article>

          {/* CTA */}
          <div className="honey-cta">
            <h3>Protect Yourself</h3>
            <p>Scan any extension before installing. Know what you're really adding to your browser.</p>
            <Link to="/scan" className="cta-button">
              Scan an Extension
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default HoneyCaseStudyPage;

