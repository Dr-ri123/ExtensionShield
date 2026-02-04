import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import EnhancedUrlInput from "../../components/EnhancedUrlInput";
import { useScan } from "../../context/ScanContext";
import databaseService from "../../services/databaseService";
import "./ScannerPage.scss";

const ScannerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    url,
    setUrl,
    isScanning,
    error,
    setError,
    scanHistory,
    startScan,
    handleFileUpload,
    loadScanHistory,
    loadScanFromHistory,
  } = useScan();

  const [allScans, setAllScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load all scans on mount
  useEffect(() => {
    const loadScans = async () => {
      setLoading(true);
      try {
        const history = await databaseService.getRecentScans(100);
        // Fetch full details for each scan to get metadata
        const scansWithMetadata = await Promise.all(
          history.map(async (scan) => {
            try {
              const fullResult = await databaseService.getScanResult(
                scan.extension_id || scan.extensionId
              );
              
              // Parse metadata if it's a string (JSON)
              let metadata = {};
              if (fullResult?.metadata) {
                if (typeof fullResult.metadata === 'string') {
                  try {
                    metadata = JSON.parse(fullResult.metadata);
                  } catch (e) {
                    metadata = fullResult.metadata;
                  }
                } else {
                  metadata = fullResult.metadata;
                }
              }
              
              return {
                ...scan,
                extension_name: scan.extension_name || scan.extensionName || metadata?.title || scan.extension_id || scan.extensionId,
                extension_id: scan.extension_id || scan.extensionId,
                version: scan.version || metadata?.version || fullResult?.manifest?.version || "N/A",
                timestamp: scan.timestamp,
                // Extract metadata if available
                user_count: metadata?.user_count || metadata?.userCount || null,
                rating: metadata?.rating_value || metadata?.rating || null,
                rating_count: metadata?.rating_count || metadata?.ratings_count || metadata?.ratingCount || null,
                logo: metadata?.logo || null,
              };
            } catch (err) {
              console.error(`Error loading metadata for ${scan.extension_id}:`, err);
              return {
                ...scan,
                extension_name: scan.extension_name || scan.extensionName || scan.extension_id || scan.extensionId,
                extension_id: scan.extension_id || scan.extensionId,
                version: scan.version || "N/A",
                timestamp: scan.timestamp,
                user_count: null,
                rating: null,
                rating_count: null,
                logo: null,
              };
            }
          })
        );
        setAllScans(scansWithMetadata);
      } catch (error) {
        console.error("Failed to load scans:", error);
      } finally {
        setLoading(false);
      }
    };
    loadScans();
  }, []);

  // Handle prefilled URL from homepage
  useEffect(() => {
    if (location.state?.prefillUrl) {
      setUrl(location.state.prefillUrl);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setUrl]);

  const handleScanClick = async () => {
    if (!url.trim()) {
      setError("Please enter a Chrome Web Store URL");
      return;
    }
    await startScan(url);
    // Reload scans after new scan
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // Format user count
  const formatUserCount = (count) => {
    if (!count) return "-";
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "-";
    const now = new Date();
    const scanTime = new Date(timestamp);
    const diffMs = now - scanTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return scanTime.toLocaleDateString();
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort and paginate data
  const sortedAndPaginatedScans = useMemo(() => {
    let sorted = [...allScans];

    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle null/undefined values
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Handle different data types
        if (sortConfig.key === 'extension_name') {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        } else if (sortConfig.key === 'timestamp') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (typeof aVal === 'string') {
          // Try to parse as number
          const aNum = parseFloat(aVal);
          const bNum = parseFloat(bVal);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            aVal = aNum;
            bVal = bNum;
          }
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    return sorted.slice(startIndex, startIndex + rowsPerPage);
  }, [allScans, sortConfig, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(allScans.length / rowsPerPage);

  return (
    <div className="scanner-page">
      <section className="scanner-hero">
        {/* Background */}
        <div className="scanner-bg">
          <div className="bg-gradient" />
          <div className="bg-grid" />
        </div>

        {/* Main Content */}
        <div className="scanner-content">
          {/* Header */}
          <div className="scanner-header">
            <h1>Extension Scanner</h1>
            <p>Analyze any Chrome extension for security threats and compliance issues</p>
          </div>

          {/* Scan Input Box */}
          <div className="scan-input-wrapper">
            <EnhancedUrlInput
              value={url}
              onChange={setUrl}
              onScan={handleScanClick}
              onFileUpload={handleFileUpload}
              isScanning={isScanning}
            />
          </div>

          {/* Error Message */}
          {error && !error.includes("✅") && !error.includes("🔄") && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}
        </div>

        {/* Extensions Table */}
        <div className="extensions-table-container">
          <div className="table-header-section">
            <h2>Recently Scanned Extensions</h2>
            {loading && <div className="loading-indicator">Loading...</div>}
          </div>

          {!loading && allScans.length > 0 && (
            <>
              <div className="table-wrapper">
                <table className="extensions-table">
                  <thead>
                    <tr>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('extension_name')}
                      >
                        <div className="th-content">
                          <svg className="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Extension
                          {sortConfig.key === 'extension_name' && (
                            <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('user_count')}
                      >
                        <div className="th-content">
                          <svg className="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          Users
                          {sortConfig.key === 'user_count' && (
                            <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('rating')}
                      >
                        <div className="th-content">
                          <svg className="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Rating
                          {sortConfig.key === 'rating' && (
                            <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('rating_count')}
                      >
                        <div className="th-content">
                          <svg className="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          Reviews
                          {sortConfig.key === 'rating_count' && (
                            <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('version')}
                      >
                        <div className="th-content">
                          Version
                          {sortConfig.key === 'version' && (
                            <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="th-content">
                          Scanned
                          {sortConfig.key === 'timestamp' && (
                            <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndPaginatedScans.map((scan, index) => (
                      <tr key={scan.extension_id || index}>
                        <td className="extension-cell">
                          <div className="extension-info">
                            {scan.logo ? (
                              <img 
                                src={scan.logo} 
                                alt={scan.extension_name}
                                className="extension-icon"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="extension-icon-fallback"
                              style={{ display: scan.logo ? 'none' : 'flex' }}
                            >
                              {scan.extension_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="extension-name">{scan.extension_name || scan.extension_id}</span>
                          </div>
                        </td>
                        <td>{formatUserCount(scan.user_count)}</td>
                        <td>
                          {scan.rating != null ? (
                            <span className="rating-value">{parseFloat(scan.rating).toFixed(1)}</span>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                        </td>
                        <td>
                          {scan.rating_count != null ? (
                            <span>{scan.rating_count}</span>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                        </td>
                        <td>{scan.version || "-"}</td>
                        <td className="scanned-time">{formatTimeAgo(scan.timestamp)}</td>
                        <td>
                          <button 
                            className="action-btn"
                            onClick={() => navigate(`/scanner/results/${scan.extension_id}`)}
                            title="View details"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, allScans.length)} of {allScans.length} rows
                </div>
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                    </svg>
                  </button>
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                    </svg>
                  </button>
                </div>
                <div className="pagination-rows">
                  <label>Rows per page:</label>
                  <select 
                    value={rowsPerPage} 
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {!loading && allScans.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No extensions scanned yet</h3>
              <p>Start by scanning your first Chrome extension above</p>
            </div>
          )}
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="scanner-footer">
        <p>
          All uploads are processed securely and deleted after 24 hours.
          <a href="#privacy"> Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
};

export default ScannerPage;
