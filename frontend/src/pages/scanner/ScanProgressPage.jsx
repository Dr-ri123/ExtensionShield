import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import CarAnimation from "../../components/CarAnimation";
import { useScan } from "../../context/ScanContext";
import "./ScanProgressPage.scss";

const ScanProgressPage = () => {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const {
    isScanning,
    scanStage,
    error,
    setError,
    scanResults,
    currentExtensionId,
  } = useScan();

  // If we have results and the scan is complete, redirect to canonical URL
  useEffect(() => {
    if (scanResults && !isScanning && currentExtensionId === scanId) {
      // If we have both extensionId and buildHash, use canonical URL
      if (scanResults.extension_id && scanResults.build_hash) {
        navigate(`/extension/${scanResults.extension_id}/version/${scanResults.build_hash}`, { replace: true });
      } else {
        // Fallback to scan results URL (will then redirect to canonical if possible)
        navigate(`/scan/results/${scanId}`, { replace: true });
      }
    }
  }, [scanResults, isScanning, scanId, currentExtensionId, navigate]);

  // If user navigates directly here without an active scan, show appropriate message
  const hasActiveScan = isScanning && currentExtensionId === scanId;

  return (
    <div className="scan-progress-page">
      <div className="progress-container">
        {/* Header */}
        <div className="progress-header">
          <Link to="/scan" className="back-link">
            ← Back to Scanner
          </Link>
          <h1 className="progress-title">
            {hasActiveScan ? "Analyzing Extension" : "Scan Status"}
          </h1>
          <p className="progress-subtitle">
            Extension ID: <code>{scanId}</code>
          </p>
        </div>

        {/* Active Scan Progress */}
        {hasActiveScan && (
          <CarAnimation isActive={hasActiveScan} />
        )}

        {/* Error State */}
        {error && (
          <div className="error-state">
            <div className="error-icon">❌</div>
            <h2>Scan Failed</h2>
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <Button onClick={() => setError(null)} variant="outline">
                Dismiss
              </Button>
              <Button onClick={() => navigate("/scan")}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* No Active Scan State */}
        {!hasActiveScan && !error && (
          <div className="no-scan-state">
            <div className="no-scan-icon">🔍</div>
            <h2>No Active Scan</h2>
            <p>
              There's no active scan for this extension ID. 
              You can start a new scan or check the scan history.
            </p>
            <div className="no-scan-actions">
              <Button onClick={() => navigate("/scan")} variant="default">
                Start New Scan
              </Button>
              <Button onClick={() => navigate("/scan/history")} variant="outline">
                View History
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanProgressPage;

