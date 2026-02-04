import React from 'react';
import './WhyThisScore.scss';

/**
 * WhyThisScore - Explains the overall score through top contributors
 * Shows the most impactful factors from all layers (Security, Privacy, Governance)
 * 
 * Props from ReportViewModel:
 * - scores: ScoresVM - Contains reasons array
 * - factorsByLayer: FactorsByLayerVM - All factors from all layers
 * - onViewEvidence: (evidenceIds) => void - Callback to view evidence
 */
const WhyThisScore = ({ scores, factorsByLayer, onViewEvidence }) => {
  // Collect all factors from all layers with their layer info
  const allFactors = [
    ...(factorsByLayer?.security || []).map(f => ({ ...f, layer: 'security', layerIcon: '🛡️', layerLabel: 'Security' })),
    ...(factorsByLayer?.privacy || []).map(f => ({ ...f, layer: 'privacy', layerIcon: '🔒', layerLabel: 'Privacy' })),
    ...(factorsByLayer?.governance || []).map(f => ({ ...f, layer: 'governance', layerIcon: '📋', layerLabel: 'Governance' })),
  ];

  // Sort by risk contribution (descending) and take top 5
  const topContributors = allFactors
    .filter(f => f.riskContribution && f.riskContribution > 0)
    .sort((a, b) => (b.riskContribution ?? 0) - (a.riskContribution ?? 0))
    .slice(0, 5);

  const hasContributors = topContributors.length > 0;
  const hasReasons = scores?.reasons && scores.reasons.length > 0;

  // If no data, don't render
  if (!hasContributors && !hasReasons) {
    return null;
  }

  // Get severity class for styling
  const getSeverityClass = (severity) => {
    if (severity >= 0.7) return 'high';
    if (severity >= 0.4) return 'medium';
    return 'low';
  };

  // Get layer color
  const getLayerColor = (layer) => {
    switch (layer) {
      case 'security': return '#3B82F6';
      case 'privacy': return '#8B5CF6';
      case 'governance': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <section className="why-this-score">
      <h2 className="section-heading">
        <span className="heading-icon">💡</span>
        Why This Score?
      </h2>
      <p className="section-description">
        The following factors had the most significant impact on this extension's overall score:
      </p>

      {/* Top Contributing Factors */}
      {hasContributors && (
        <div className="contributors-grid">
          {topContributors.map((factor, idx) => {
            const impact = Math.round((factor.riskContribution ?? 0) * 100);
            const severityPercent = Math.round((factor.severity ?? 0) * 100);
            const confidencePercent = Math.round((factor.confidence ?? 0) * 100);
            const hasEvidence = factor.evidenceIds && factor.evidenceIds.length > 0;
            
            return (
              <div 
                key={idx} 
                className={`contributor-card severity-${getSeverityClass(factor.severity)}`}
                style={{ borderLeftColor: getLayerColor(factor.layer) }}
              >
                <div className="contributor-header">
                  <div className="contributor-layer">
                    <span className="layer-icon">{factor.layerIcon}</span>
                    <span className="layer-name">{factor.layerLabel}</span>
                  </div>
                  <div className="contributor-impact">
                    <span className="impact-value">{impact}%</span>
                    <span className="impact-label">impact</span>
                  </div>
                </div>

                <h3 className="contributor-title">{factor.name}</h3>

                <div className="contributor-metrics">
                  <div className="metric">
                    <span className="metric-label">Severity</span>
                    <div className="metric-bar-container">
                      <div 
                        className={`metric-bar severity-${getSeverityClass(factor.severity)}`}
                        style={{ width: `${severityPercent}%` }}
                      />
                    </div>
                    <span className="metric-value">{severityPercent}%</span>
                  </div>
                  
                  <div className="metric">
                    <span className="metric-label">Confidence</span>
                    <div className="metric-bar-container">
                      <div 
                        className="metric-bar metric-confidence"
                        style={{ 
                          width: `${confidencePercent}%`,
                          backgroundColor: getLayerColor(factor.layer)
                        }}
                      />
                    </div>
                    <span className="metric-value">{confidencePercent}%</span>
                  </div>
                </div>

                {hasEvidence && (
                  <button 
                    className="view-evidence-btn"
                    onClick={() => onViewEvidence(factor.evidenceIds)}
                  >
                    <span className="btn-icon">🔍</span>
                    View Evidence ({factor.evidenceIds.length})
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Reasons */}
      {hasReasons && (
        <div className="decision-reasons">
          <h3 className="reasons-title">Decision Summary</h3>
          <ul className="reasons-list">
            {scores.reasons.map((reason, idx) => (
              <li key={idx} className="reason-item">
                <span className="reason-bullet">▸</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default WhyThisScore;

