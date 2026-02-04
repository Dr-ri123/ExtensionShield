import React from 'react';
import './ExecutiveSummary.scss';

/**
 * ExecutiveSummary - Displays executive summary section
 * 
 * Props:
 * - summary: string | null - Summary text from ViewModel
 * - reasons: string[] - Decision reasons from scoring
 */
const ExecutiveSummary = ({ summary = null, reasons = [] }) => {
  // Don't render if no content
  if (!summary && (!reasons || reasons.length === 0)) {
    return null;
  }

  return (
    <section className="executive-summary">
      <h2 className="section-title">
        <span className="title-icon">📝</span>
        Executive Summary
      </h2>

      <div className="summary-content">
        {summary && (
          <p className="summary-text">{summary}</p>
        )}

        {reasons && reasons.length > 0 && (
          <div className="decision-reasons">
            <h4 className="reasons-title">Decision Factors</h4>
            <ul className="reasons-list">
              {reasons.map((reason, idx) => (
                <li key={idx} className="reason-item">
                  <span className="reason-bullet">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default ExecutiveSummary;

