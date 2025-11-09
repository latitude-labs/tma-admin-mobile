/**
 * Core audit types and interfaces
 */

import { PrincipleCompliance } from './principle.js';
import { AuditConfig } from './config.js';

/**
 * Represents a single execution of the compliance audit
 */
export interface AuditRun {
  /** Unique identifier (ISO timestamp: YYYY-MM-DD-HHmmss) */
  id: string;
  /** When the audit was executed */
  timestamp: Date;
  /** Version of constitution audited against (e.g., "1.0.0") */
  constitutionVersion: string;
  /** Git branch name at time of audit */
  branch: string;
  /** Git commit SHA at time of audit */
  commitHash: string;
  /** Total number of source files analyzed */
  filesAnalyzed: number;
  /** Total violations found across all principles */
  totalViolations: number;
  /** Overall codebase health score (0-100) */
  healthScore: number;
  /** Compliance results for each of the 7 principles */
  principles: PrincipleCompliance[];
  /** Audit execution time in milliseconds */
  duration: number;
  /** Configuration used for this audit run */
  config: AuditConfig;
}

/**
 * Represents a single instance of non-compliance with a constitutional rule
 */
export interface Violation {
  /** Unique identifier (generated: {file}:{line}:{ruleId}) */
  id: string;
  /** Relative file path from repo root */
  file: string;
  /** Line number where violation occurs */
  line: number;
  /** End line number (for multi-line violations) */
  lineEnd?: number;
  /** Column number (optional, for precision) */
  column?: number;
  /** Which principle this violates */
  principleId: string;
  /** Specific rule violated */
  ruleId: string;
  /** Severity level */
  severity: Severity;
  /** Human-readable description of violation */
  message: string;
  /** How to fix this violation */
  remediation: Remediation;
  /** Relevant code excerpt (3-5 lines around violation) */
  codeSnippet?: string;
}

/**
 * Severity levels for violations
 */
export enum Severity {
  Critical = 'critical', // Causes crashes or runtime errors
  High = 'high',         // Breaks functionality or UX
  Medium = 'medium',     // Maintainability and performance issues
  Low = 'low'            // Style and documentation gaps
}

/**
 * Remediation guidance embedded within Violation
 */
export interface Remediation {
  /** Step-by-step fix instructions */
  description: string;
  /** Link to CLAUDE.md section (e.g., "CLAUDE.md:267-300") */
  claudeMdReference?: string;
  /** Before/after code example */
  codeExample?: string;
  /** Whether auto-fix is possible (future feature) */
  autoFixAvailable: boolean;
  /** Time estimate (e.g., "5 minutes", "30 minutes") */
  estimatedEffort?: string;
}

/**
 * Represents audit results for a single source file
 */
export interface FileAnalysis {
  /** Relative file path */
  file: string;
  /** Total lines in file */
  linesOfCode: number;
  /** All violations in this file */
  violations: Violation[];
  /** Overall status */
  complianceStatus: ComplianceStatus;
  /** List of principle IDs with violations in this file */
  principlesAffected: string[];
  /** Count of violations by severity */
  severityBreakdown: SeverityCount;
}

/**
 * Compliance status for a file
 */
export enum ComplianceStatus {
  Compliant = 'compliant',   // No violations
  Violations = 'violations',  // Has violations
  Error = 'error'             // Could not analyze (parsing error)
}

/**
 * Count of violations by severity level
 */
export interface SeverityCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

/**
 * Complete output of an audit run
 */
export interface AuditReport {
  /** Metadata about the audit execution */
  auditRun: AuditRun;
  /** Executive summary metrics */
  summary: AuditSummary;
  /** Results for each principle */
  principleResults: PrincipleCompliance[];
  /** Violations organized by file */
  violationsByFile: Record<string, FileAnalysis>;
  /** Violations organized by severity */
  violationsBySeverity: Record<Severity, Violation[]>;
  /** Historical comparison (if previous audits exist) */
  trendData?: TrendData;
  /** Top prioritized remediation recommendations */
  recommendations: string[];
}

/**
 * Executive summary of audit results
 */
export interface AuditSummary {
  /** Overall score (0-100) */
  healthScore: number;
  /** Total files analyzed */
  filesAnalyzed: number;
  /** Total violations found */
  totalViolations: number;
  /** Violations by severity */
  severityCounts: SeverityCount;
  /** Principle with lowest compliance */
  topViolatedPrinciple: string;
  /** Principle with highest compliance */
  topCompliantPrinciple: string;
}

/**
 * Historical comparison data (only if previous audits exist)
 */
export interface TrendData {
  /** Previous audit run metadata */
  previousAudit: AuditRun;
  /** Change in health score (e.g., +4, -2) */
  healthScoreChange: number;
  /** Change in total violations (e.g., -15, +8) */
  violationChange: number;
  /** Per-principle compliance % change */
  principleChanges: Record<string, number>;
  /** Overall trend direction */
  trend: TrendDirection;
}

/**
 * Overall trend direction
 */
export enum TrendDirection {
  Improving = 'improving',  // Health score increased
  Declining = 'declining',   // Health score decreased
  Stable = 'stable'          // Health score unchanged (±1 point)
}
