import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { TrendChart, CoverageChart, SourcesBox } from "../../components/benchmarks";
import "./BenchmarksPage.scss";

const BenchmarksPage = () => {
  const [trendsData, setTrendsData] = useState(null);
  const [benchmarksData, setBenchmarksData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [trendsRes, benchmarksRes] = await Promise.all([
          fetch('/data/trends.json'),
          fetch('/data/benchmarks.json')
        ]);

        if (!trendsRes.ok || !benchmarksRes.ok) {
          throw new Error('Failed to load data');
        }

        const trends = await trendsRes.json();
        const benchmarks = await benchmarksRes.json();

        setTrendsData(trends);
        setBenchmarksData(benchmarks);
        setLoading(false);
      } catch (err) {
        console.error('Error loading benchmark data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="benchmarks-page">
        <div className="benchmarks-content">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading benchmark data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="benchmarks-page">
        <div className="benchmarks-content">
          <div className="error-state">
            <p>Error loading data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Benchmarks & Methodology | ExtensionShield</title>
        <meta name="description" content="Coverage, performance, and governance/privacy signals — transparently documented. ExtensionShield scores beyond security into privacy and compliance signals." />
        <link rel="canonical" href="https://extensionaudit.com/research/benchmarks" />
      </Helmet>

      <div className="benchmarks-page">
        <div className="benchmarks-bg">
          <div className="bg-gradient" />
          <div className="bg-grid" />
        </div>

        <div className="benchmarks-content">
          {/* Hero Section */}
          <header className="benchmarks-header">
            <span className="benchmarks-badge">Benchmarks</span>
            <h1>Benchmarks & Methodology</h1>
            <p>
              Coverage, performance, and governance/privacy signals — transparently documented. ExtensionShield scores beyond security into privacy and compliance signals.
            </p>
          </header>

          {/* Industry Trends Section */}
          <section className="trends-section">
            <div className="section-header">
              <h2>Industry Trends</h2>
              <p>Rising threats in browser extensions</p>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <TrendChart 
                  data={trendsData.maliciousExtensions}
                  dataKey="Malicious Extensions"
                  title="Reported extension enforcement & security advisories (selected sources)"
                  color="#ef4444"
                />
              </div>

              <div className="chart-card">
                <TrendChart 
                  data={trendsData.dataTheftIncidents}
                  dataKey="Data Theft Incidents"
                  title="Reported extension-related data exposure incidents (public reports)"
                  color="#f59e0b"
                />
              </div>
            </div>

            <div className="trends-disclaimer">
              <p>Compiled from public reporting; not a complete measure of all incidents.</p>
            </div>

            <SourcesBox sources={trendsData.sources} />
          </section>

          {/* ExtensionShield Benchmarking Section */}
          <section className="benchmarks-section">
            <div className="section-header">
              <h2>Scanner Coverage Comparison</h2>
              <p>Comparing supported signals across tools; results may differ by methodology.</p>
            </div>

            {/* Coverage */}
            <div className="chart-card large">
              <CoverageChart data={benchmarksData.coverage} />
            </div>

            {/* Why Our Score Differs - Simplified */}
            <div className="differentiator-card-simple">
              <h3>🎯 Why ExtensionShield Scores Differ</h3>
              <p>We do everything from user reviews to SAST, VirusTotal checks, and compliance analysis:</p>
              <div className="key-features">
                <span>• User Reviews Analysis</span>
                <span>• SAST (Static Analysis)</span>
                <span>• VirusTotal Integration</span>
                <span>• Data Collection Patterns</span>
                <span>• Third-Party Endpoints</span>
                <span>• Remote Code Execution</span>
                <span>• ToS/Policy Violations</span>
                <span>• Permission Alignment</span>
                <span>• Evidence Chain Tracking</span>
                <span>• Compliance Checks</span>
              </div>
            </div>

            {/* Safer Alternatives - Simplified */}
            <div className="alternatives-card-simple">
              <h3>💡 Safer Alternative Recommendations</h3>
              <p>When risk is high, we recommend better extensions in the same category. Free, always.</p>
              
              <div className="examples-grid-simple">
                {benchmarksData.differentiators.safer_alternatives.example_recommendations.map((rec, index) => (
                  <div key={index} className="example-card-simple">
                    <div className="example-header-simple">
                      <h4>{rec.name}</h4>
                      <span className="category-badge">{rec.category}</span>
                      <span className="score-badge">Risk: {rec.risk_score}</span>
                    </div>
                    <p className="reason-simple">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default BenchmarksPage;

