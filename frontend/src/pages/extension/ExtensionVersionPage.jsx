import React from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import databaseService from "../../services/databaseService";
import "./ExtensionVersionPage.scss";

/**
 * ExtensionVersionPage - Shows the report for a specific build hash
 * Route: /extension/:extensionId/version/:buildHash
 * Uses canonical GET /api/scan/results/:id (versioned by hash not yet supported; shows latest scan).
 */
const ExtensionVersionPage = () => {
  const { extensionId, buildHash } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [report, setReport] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        // Canonical API: GET /api/scan/results/:id (version hash not yet in backend; return latest)
        const data = await databaseService.getScanResult(extensionId);
        if (data) {
          setReport(data);
        } else {
          setError("Report not found for this version.");
        }
      } catch (err) {
        setError("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [extensionId, buildHash]);

  if (loading) {
    return (
      <div className="version-page loading">
        <div className="loading-spinner" />
        <p>Loading report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="version-page error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h2>Report Not Found</h2>
          <p>{error}</p>
          <Link to={`/extension/${extensionId}`} className="back-btn">
            Back to Extension
          </Link>
        </div>
      </div>
    );
  }

  const shortHash = buildHash.slice(0, 12);

  return (
    <>
      <Helmet>
        <title>Version Report {shortHash} | ExtensionShield</title>
        <meta name="description" content={`Detailed security report for extension version ${shortHash}. View findings, evidence, and recommendations.`} />
        <link rel="canonical" href={`https://extensionshield.com/extension/${extensionId}/version/${buildHash}`} />
      </Helmet>

      <div className="version-page">
        <div className="version-bg">
          <div className="bg-gradient" />
        </div>

        <div className="version-content">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <Link to="/scan">Scan</Link>
            <span>/</span>
            <Link to={`/extension/${extensionId}`}>Extension</Link>
            <span>/</span>
            <span>Version {shortHash}</span>
          </nav>

          {/* Header */}
          <header className="version-header">
            <h1>Version Report</h1>
            <div className="build-hash">
              <span className="label">Build Hash:</span>
              <code>{buildHash}</code>
            </div>
          </header>

          {/* Placeholder content */}
          <div className="version-placeholder">
            <p>
              This page will display the full version-specific report once the API endpoint is implemented.
              The report will include all findings, evidence, and recommendations for this exact build.
            </p>
            <Link to={`/extension/${extensionId}`} className="back-link">
              ← Back to Extension Overview
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExtensionVersionPage;

