import React from 'react';
import './ReportScoreCard.scss';

/**
 * ReportScoreCard - Score card for Security/Privacy/Governance
 * 
 * Props from ReportViewModel:
 * - title: string ("Security" | "Privacy" | "Governance")
 * - score: number | null
 * - band: "GOOD" | "WARN" | "BAD" | "NA"
 * - confidence: number | null (0-1)
 * - contributors: FactorVM[] - Top contributing factors to show as chips
 */
const ReportScoreCard = ({ 
  title = 'Score',
  score = null,
  band = 'NA',
  confidence = null,
  contributors = [],
  icon = null
}) => {
  const getBandColor = () => {
    switch (band) {
      case 'GOOD': return '#10B981';
      case 'WARN': return '#F59E0B';
      case 'BAD': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getBandLabel = () => {
    switch (band) {
      case 'GOOD': return 'Good';
      case 'WARN': return 'Review';
      case 'BAD': return 'Bad';
      default: return 'N/A';
    }
  };

  const getBandIcon = () => {
    switch (band) {
      case 'GOOD': return '✓';
      case 'WARN': return '⚡';
      case 'BAD': return '✕';
      default: return '−';
    }
  };

  const getLayerIcon = () => {
    if (icon) return icon;
    switch (title.toLowerCase()) {
      case 'security': return '🛡️';
      case 'privacy': return '🔒';
      case 'governance': return '📋';
      default: return '📊';
    }
  };

  const color = getBandColor();
  const displayScore = score === null ? '--' : Math.round(score);
  const confidencePercent = confidence !== null ? Math.round(confidence * 100) : null;

  // Get top 2 contributors
  const topContributors = contributors
    .filter(f => f && f.name)
    .slice(0, 2);

  return (
    <div className={`report-score-card band-${band.toLowerCase()}`}>
      <div className="score-card-header">
        <span className="score-card-icon">{getLayerIcon()}</span>
        <span className="score-card-title">{title}</span>
      </div>

      <div className="score-card-main">
        <div className="score-value" style={{ color }}>
          {displayScore}
        </div>
        <div className="score-band" style={{ color }}>
          <span className="band-icon">{getBandIcon()}</span>
          <span className="band-text">{getBandLabel()}</span>
        </div>
      </div>

      {/* Confidence indicator */}
      {confidencePercent !== null && (
        <div className="score-confidence">
          <span className="confidence-label">Confidence</span>
          <div className="confidence-bar-container">
            <div 
              className="confidence-bar-fill"
              style={{ 
                width: `${confidencePercent}%`,
                backgroundColor: color
              }}
            />
          </div>
          <span className="confidence-value">{confidencePercent}%</span>
        </div>
      )}

      {/* Top contributors */}
      {topContributors.length > 0 && (
        <div className="score-contributors">
          {topContributors.map((factor, idx) => (
            <span 
              key={idx} 
              className={`contributor-chip severity-${getSeverityClass(factor.severity)}`}
            >
              {factor.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper to classify severity
function getSeverityClass(severity) {
  if (severity >= 0.7) return 'high';
  if (severity >= 0.4) return 'medium';
  return 'low';
}

export default ReportScoreCard;

