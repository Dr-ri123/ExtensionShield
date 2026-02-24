import React from "react";
import { Link } from "react-router-dom";
import SEOHead from "../../components/SEOHead";
import RainfallDroplets from "../../components/RainfallDroplets";
import CommunitySpotlightCarousel from "./CommunitySpotlightCarousel";
import { useAuth } from "../../context/AuthContext";
import "./CommunityLandingPage.scss";

/**
 * Community landing page at /community
 * Hero-grid layout: left = headline + subtext + CTA button; right = carousel.
 * Second row: action buttons that open sign-in.
 */
const CommunityLandingPage = () => {
  const { openSignInModal } = useAuth();
  return (
    <>
      <SEOHead
        title="Community | ExtensionShield"
        description="Community reports that improve every scan. Contributors review extensions, reproduce findings, and publish evidence-backed notes. Join the review program."
        pathname="/community"
      />

      <div className="community-landing-page home-page">
        <RainfallDroplets />

        <section className="hero-section" aria-label="Community">
          <div className="hero-grid">
            {/* Left: headline, subtext, CTA (same as homepage hero) */}
            <div className="hero-left">
              <h1 className="hero-title">
                Community reports
                <br />
                that improve every scan
              </h1>
              <p className="hero-dev-body">
                Contributors review extensions, reproduce findings, and publish
                <br />
                evidence-backed notes. This reduces false positives and
                <br />
                strengthens every result.
              </p>
              <div className="hero-developers-cta">
                <Link to="/gsoc/community" className="hero-pro-upload-btn">
                  Join the review program
                </Link>
              </div>
            </div>

            {/* Right: Community Spotlight carousel only */}
            <div className="hero-right community-hero-right-wrap">
              <CommunitySpotlightCarousel />
            </div>
          </div>

          {/* Second row: action buttons in one row – each opens sign-in */}
          <div className="community-hero-links">
            <button type="button" className="community-hero-link" onClick={openSignInModal}>
              Submit a finding
            </button>
            <button type="button" className="community-hero-link" onClick={openSignInModal}>
              Verify a scan
            </button>
            <button type="button" className="community-hero-link" onClick={openSignInModal}>
              Suggest a rule
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default CommunityLandingPage;
