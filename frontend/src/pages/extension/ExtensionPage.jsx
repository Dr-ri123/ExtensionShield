import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { normalizeExtensionId } from "../../utils/extensionId";
import databaseService from "../../services/databaseService";
import "./ExtensionPage.scss";

/**
 * ExtensionPage - Shows the latest overview for an extension
 * Route: /extension/:extensionId
 * 
 * This page displays the most recent scan results for an extension,
 * including score, summary, and key findings. Users can click through
 * to view specific version reports.
 */
const ExtensionPage = () => {
  const { extensionId: rawExtensionId } = useParams();
  const navigate = useNavigate();
  
  // Normalize extension ID from URL params
  const extensionId = normalizeExtensionId(rawExtensionId || '');
  
  const [loading, setLoading] = React.useState(true);
  const [extension, setExtension] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Show error if extension ID is invalid
    if (!extensionId) {
      setError("Invalid extension ID format. Extension IDs must be exactly 32 characters (a-p).");
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    // Fetch extension data from API
    const fetchExtension = async () => {
      try {
        setLoading(true);
        
        // Safety timeout
        const safetyTimeout = setTimeout(() => {
          if (isMounted) {
            setLoading(false);
          }
        }, 3000);

        // Request timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        );
        
        // Canonical API: GET /api/scan/results/:id (single source of truth)
        const data = await Promise.race([
          databaseService.getScanResult(extensionId),
          timeoutPromise
        ]);
        if (data === undefined || data === null) {
          if (isMounted) {
            setError("Extension not found. It may not have been scanned yet.");
          }
          return;
        }
        if (isMounted) {
          setExtension(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load extension data. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchExtension();

    return () => {
      isMounted = false;
    };
  }, [extensionId]);

  if (loading) {
    return (
      <div className="extension-page loading">
        <div className="loading-spinner" />
        <p>Loading extension data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="extension-page error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h2>Extension Not Found</h2>
          <p>{error}</p>
          <Link to="/scan" className="scan-btn">
            Scan an Extension
          </Link>
        </div>
      </div>
    );
  }

  // Placeholder for when API returns data
  const extensionName = extension?.name || `Extension ${extensionId}`;
  const riskLevel = extension?.risk_level || "Unknown";
  const score = extension?.score ?? "N/A";

  return (
    <>
      <Helmet>
        <title>{extensionName} Security Report | ExtensionShield</title>
        <meta name="description" content={`Security analysis and risk assessment for ${extensionName}. View permission analysis, threat detection, and governance recommendations.`} />
        <link rel="canonical" href={`https://extensionshield.com/extension/${extensionId}`} />
      </Helmet>

      <div className="extension-page">
        <div className="extension-bg">
          <div className="bg-gradient" />
        </div>

        <div className="extension-content">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <Link to="/scan">Scan</Link>
            <span>/</span>
            <span>Extension Report</span>
          </nav>

          {/* Header */}
          <header className="extension-header">
            <div className="extension-icon">🔌</div>
            <div className="extension-info">
              <h1>{extensionName}</h1>
              <p className="extension-id">ID: {extensionId}</p>
            </div>
            <div className={`risk-badge ${riskLevel.toLowerCase()}`}>
              {riskLevel} Risk
            </div>
          </header>

          {/* Score Card */}
          <div className="score-card">
            <div className="score-value">{score}</div>
            <div className="score-label">Security Score</div>
          </div>

          {/* Actions */}
          <div className="extension-actions">
            <Link to={`/extension/${extensionId}/versions`} className="action-btn secondary">
              View All Versions
            </Link>
            <Link to={`/extension/${extensionId}/evidence`} className="action-btn secondary">
              View Evidence
            </Link>
            <button className="action-btn primary" onClick={() => navigate("/scan")}>
              Rescan Extension
            </button>
          </div>

          {/* Placeholder content */}
          <div className="extension-placeholder">
            <p>
              This page will display the full security report once the extension has been analyzed.
              Use the scanner to analyze this extension.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExtensionPage;

