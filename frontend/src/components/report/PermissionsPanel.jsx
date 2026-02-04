import React, { useState } from 'react';
import './PermissionsPanel.scss';

/**
 * PermissionsPanel - Displays permissions analysis from ReportViewModel
 * 
 * Props from ReportViewModel.permissions:
 * - apiPermissions: string[]
 * - hostPermissions: string[]
 * - highRiskPermissions: string[]
 * - unreasonablePermissions: string[]
 * - broadHostPatterns: string[]
 */
const PermissionsPanel = ({ permissions = {} }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const {
    apiPermissions = [],
    hostPermissions = [],
    highRiskPermissions = [],
    unreasonablePermissions = [],
    broadHostPatterns = []
  } = permissions;

  // Check if any permissions exist
  const hasAnyPermissions = 
    apiPermissions.length > 0 ||
    hostPermissions.length > 0 ||
    highRiskPermissions.length > 0;

  if (!hasAnyPermissions) {
    return null;
  }

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const PermissionChip = ({ name, risk = 'normal' }) => (
    <span className={`permission-chip risk-${risk}`}>
      {name}
    </span>
  );

  return (
    <section className="permissions-panel">
      <h2 className="section-title">
        <span className="title-icon">🔑</span>
        Permissions
      </h2>

      <div className="permissions-content">
        {/* High Risk Permissions - Always show if present */}
        {highRiskPermissions.length > 0 && (
          <div className="permissions-group risk-high">
            <div 
              className="group-header"
              onClick={() => toggleSection('highRisk')}
            >
              <div className="group-label">
                <span className="risk-indicator"></span>
                <span className="group-title">High Risk</span>
                <span className="group-count">{highRiskPermissions.length}</span>
              </div>
              <span className={`expand-icon ${expandedSection === 'highRisk' ? 'expanded' : ''}`}>
                ›
              </span>
            </div>
            <div className={`group-content ${expandedSection === 'highRisk' ? 'expanded' : ''}`}>
              <div className="permissions-chips">
                {highRiskPermissions.map((perm, idx) => (
                  <PermissionChip key={idx} name={perm} risk="high" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Unreasonable Permissions */}
        {unreasonablePermissions.length > 0 && (
          <div className="permissions-group risk-medium">
            <div 
              className="group-header"
              onClick={() => toggleSection('unreasonable')}
            >
              <div className="group-label">
                <span className="risk-indicator"></span>
                <span className="group-title">Potentially Unreasonable</span>
                <span className="group-count">{unreasonablePermissions.length}</span>
              </div>
              <span className={`expand-icon ${expandedSection === 'unreasonable' ? 'expanded' : ''}`}>
                ›
              </span>
            </div>
            <div className={`group-content ${expandedSection === 'unreasonable' ? 'expanded' : ''}`}>
              <div className="permissions-chips">
                {unreasonablePermissions.map((perm, idx) => (
                  <PermissionChip key={idx} name={perm} risk="medium" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Broad Host Patterns */}
        {broadHostPatterns.length > 0 && (
          <div className="permissions-group risk-medium">
            <div 
              className="group-header"
              onClick={() => toggleSection('broadHost')}
            >
              <div className="group-label">
                <span className="risk-indicator"></span>
                <span className="group-title">Broad Host Access</span>
                <span className="group-count">{broadHostPatterns.length}</span>
              </div>
              <span className={`expand-icon ${expandedSection === 'broadHost' ? 'expanded' : ''}`}>
                ›
              </span>
            </div>
            <div className={`group-content ${expandedSection === 'broadHost' ? 'expanded' : ''}`}>
              <div className="permissions-chips">
                {broadHostPatterns.map((perm, idx) => (
                  <PermissionChip key={idx} name={perm} risk="medium" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Permissions */}
        {apiPermissions.length > 0 && (
          <div className="permissions-group">
            <div 
              className="group-header"
              onClick={() => toggleSection('api')}
            >
              <div className="group-label">
                <span className="group-title">API Permissions</span>
                <span className="group-count">{apiPermissions.length}</span>
              </div>
              <span className={`expand-icon ${expandedSection === 'api' ? 'expanded' : ''}`}>
                ›
              </span>
            </div>
            <div className={`group-content ${expandedSection === 'api' ? 'expanded' : ''}`}>
              <div className="permissions-chips">
                {apiPermissions.map((perm, idx) => (
                  <PermissionChip key={idx} name={perm} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Host Permissions */}
        {hostPermissions.length > 0 && (
          <div className="permissions-group">
            <div 
              className="group-header"
              onClick={() => toggleSection('host')}
            >
              <div className="group-label">
                <span className="group-title">Host Permissions</span>
                <span className="group-count">{hostPermissions.length}</span>
              </div>
              <span className={`expand-icon ${expandedSection === 'host' ? 'expanded' : ''}`}>
                ›
              </span>
            </div>
            <div className={`group-content ${expandedSection === 'host' ? 'expanded' : ''}`}>
              <div className="permissions-chips">
                {hostPermissions.slice(0, 10).map((perm, idx) => (
                  <PermissionChip key={idx} name={perm} />
                ))}
                {hostPermissions.length > 10 && (
                  <span className="more-indicator">+{hostPermissions.length - 10} more</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PermissionsPanel;

