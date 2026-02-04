/**
 * Utils barrel export
 * 
 * Centralizes all utility exports for clean imports
 */

// Signal mapper utilities
export { 
  calculateCodeSignal,
  calculatePermsSignal,
  calculateIntelSignal,
  calculateAllSignals,
  getRiskLevel,
  getRiskColorClass,
  getSignalColorClass,
  countFindings,
  getTopFindingSummary,
  enrichScanWithSignals,
  SIGNAL_LEVELS,
} from './signalMapper';

// Report types
export type {
  // Raw API types
  RawScanResult,
  RawMetadata,
  RawManifest,
  RawPermissionsAnalysis,
  RawSASTFinding,
  RawSASTResults,
  RawVirusTotalAnalysis,
  RawVTFileResult,
  RawEntropyAnalysis,
  RawEntropyFileResult,
  RawSummary,
  RawEvidenceItem,
  RawToolEvidence,
  RawSignalPack,
  RawFactorScore,
  RawLayerScore,
  RawScoringV2,
  RawGovernanceBundle,
  RawGovernanceDecision,
  // View model types
  ReportViewModel,
  MetaVM,
  ScoresVM,
  ScoreVM,
  ScoreBand,
  Decision,
  FactorsByLayerVM,
  FactorVM,
  KeyFindingVM,
  FindingSeverity,
  PermissionsVM,
  EvidenceItemVM,
} from './reportTypes';

// Normalizer functions
export {
  normalizeScanResult,
  normalizeScanResultSafe,
  createEmptyReportViewModel,
  hasScoring,
  hasScoringV2,
  extractEvidenceItems,
  collectReferencedEvidenceIds,
  validateEvidenceIntegrity,
  isDevelopmentMode,
} from './normalizeScanResult';

