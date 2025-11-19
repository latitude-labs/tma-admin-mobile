# Data Model: Constitution Compliance Audit

**Feature**: Constitution Compliance Audit
**Branch**: 001-constitution-compliance-audit
**Date**: 2025-01-08

## Overview

This document defines the data entities used throughout the audit system, including their fields, relationships, validation rules, and state transitions.

---

## Entity: AuditRun

Represents a single execution of the compliance audit.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (ISO timestamp: YYYY-MM-DD-HHmmss) |
| `timestamp` | Date | Yes | When the audit was executed |
| `constitutionVersion` | string | Yes | Version of constitution audited against (e.g., "1.0.0") |
| `branch` | string | Yes | Git branch name at time of audit |
| `commitHash` | string | Yes | Git commit SHA at time of audit |
| `filesAnalyzed` | number | Yes | Total number of source files analyzed |
| `totalViolations` | number | Yes | Total violations found across all principles |
| `healthScore` | number | Yes | Overall codebase health score (0-100) |
| `principles` | PrincipleCompliance[] | Yes | Compliance results for each of the 7 principles |
| `duration` | number | Yes | Audit execution time in milliseconds |
| `config` | AuditConfig | Yes | Configuration used for this audit run |

### Validation Rules

- `healthScore` must be between 0 and 100
- `principles` array must contain exactly 7 entries (one per principle)
- `filesAnalyzed` must be > 0
- `totalViolations` must equal sum of violations across all principles

### Relationships

- Has many `PrincipleCompliance` (exactly 7)
- Each `PrincipleCompliance` has many `Violation`

---

## Entity: PrincipleCompliance

Represents compliance status for one constitutional principle.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `principleId` | string | Yes | Principle identifier (e.g., "principle-1-design-system") |
| `principleName` | string | Yes | Human-readable name (e.g., "Design System Adherence") |
| `compliancePercentage` | number | Yes | Percentage of checks passed (0-100) |
| `totalChecks` | number | Yes | Total number of checks performed for this principle |
| `passedChecks` | number | Yes | Number of checks that passed |
| `failedChecks` | number | Yes | Number of checks that failed |
| `violations` | Violation[] | Yes | List of violations for this principle |
| `weight` | number | Yes | Weight in overall health score calculation (0-1) |

### Validation Rules

- `compliancePercentage` = (passedChecks / totalChecks) × 100
- `totalChecks` = `passedChecks` + `failedChecks`
- `compliancePercentage` must be between 0 and 100
- `failedChecks` must equal `violations.length`
- Sum of all `weight` values across principles must equal 1.0

### Principle Weights

| Principle | Weight | Rationale |
|-----------|--------|-----------|
| Design System Adherence | 0.20 | Critical for dark mode support and UX consistency |
| Type Safety | 0.20 | Prevents runtime errors and improves maintainability |
| Component Architecture | 0.20 | Prevents crashes and ensures React best practices |
| Accessibility | 0.10 | Important but subset of components |
| Performance | 0.15 | Affects user experience but gradual degradation |
| State Management | 0.10 | Affects reliability but localized impact |
| Testing & Documentation | 0.05 | Important but doesn't affect runtime behavior |

---

## Entity: Violation

Represents a single instance of non-compliance with a constitutional rule.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (generated: `{file}:{line}:{ruleId}`) |
| `file` | string | Yes | Relative file path from repo root (e.g., "components/ui/Button.tsx") |
| `line` | number | Yes | Line number where violation occurs |
| `lineEnd` | number | No | End line number (for multi-line violations) |
| `column` | number | No | Column number (optional, for precision) |
| `principleId` | string | Yes | Which principle this violates |
| `ruleId` | string | Yes | Specific rule violated (e.g., "missing-use-theme-colors") |
| `severity` | Severity | Yes | Critical, High, Medium, or Low |
| `message` | string | Yes | Human-readable description of violation |
| `remediation` | Remediation | Yes | How to fix this violation |
| `codeSnippet` | string | No | Relevant code excerpt (3-5 lines around violation) |

### Validation Rules

- `file` must be a valid relative path
- `line` must be > 0
- If `lineEnd` provided, must be >= `line`
- `severity` must be one of: "critical", "high", "medium", "low"
- `principleId` must match one of the 7 constitutional principles

### Relationships

- Belongs to one `PrincipleCompliance`

---

## Entity: Severity (Enum)

### Values

```typescript
enum Severity {
  Critical = "critical",  // Causes crashes or runtime errors
  High = "high",          // Breaks functionality or UX
  Medium = "medium",      // Maintainability and performance issues
  Low = "low"             // Style and documentation gaps
}
```

### Severity Distribution (Expected)

Based on codebase analysis findings:
- Critical: ~5-10% of violations (hooks in loops, missing text fallbacks)
- High: ~15-20% (accessibility labels, theme issues)
- Medium: ~40-50% (missing memoization, large components)
- Low: ~20-35% (missing JSDoc, minor style issues)

---

## Entity: Remediation

Embedded within Violation, provides guidance for fixing the issue.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Step-by-step fix instructions |
| `claudeMdReference` | string | No | Link to CLAUDE.md section (e.g., "CLAUDE.md:267-300") |
| `codeExample` | string | No | Before/after code example |
| `autoFixAvailable` | boolean | Yes | Whether auto-fix is possible (future feature) |
| `estimatedEffort` | string | No | Time estimate (e.g., "5 minutes", "30 minutes") |

---

## Entity: FileAnalysis

Represents audit results for a single source file.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | Yes | Relative file path |
| `linesOfCode` | number | Yes | Total lines in file |
| `violations` | Violation[] | Yes | All violations in this file |
| `complianceStatus` | ComplianceStatus | Yes | Overall status: Compliant, Violations, or Error |
| `principlesAffected` | string[] | Yes | List of principle IDs with violations in this file |
| `severityBreakdown` | SeverityCount | Yes | Count of violations by severity |

### Validation Rules

- `linesOfCode` must be > 0
- `principlesAffected` must be unique list
- `severityBreakdown` totals must equal `violations.length`

---

## Entity: ComplianceStatus (Enum)

```typescript
enum ComplianceStatus {
  Compliant = "compliant",     // No violations
  Violations = "violations",    // Has violations
  Error = "error"               // Could not analyze (parsing error)
}
```

---

## Entity: SeverityCount

Count of violations by severity level.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `critical` | number | Yes | Count of critical violations |
| `high` | number | Yes | Count of high violations |
| `medium` | number | Yes | Count of medium violations |
| `low` | number | Yes | Count of low violations |
| `total` | number | Yes | Sum of all severity counts |

### Validation Rules

- All counts must be >= 0
- `total` must equal `critical` + `high` + `medium` + `low`

---

## Entity: AuditConfig

Configuration used for an audit run.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `constitutionVersion` | string | Yes | Version of constitution to audit against |
| `exclude` | string[] | Yes | Glob patterns for excluded files |
| `include` | string[] | Yes | Glob patterns for included files |
| `severityOverrides` | Record<string, Severity> | No | Custom severity assignments per rule |
| `reportFormats` | ReportFormat[] | Yes | Output formats to generate |

### Default Values

```typescript
{
  constitutionVersion: "1.0.0",
  exclude: [
    "node_modules/**",
    ".expo/**",
    "**/*.test.tsx",
    "**/*.test.ts",
    "constants/Colors.ts",
    "constants/Theme.ts"
  ],
  include: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "services/**/*.ts",
    "store/**/*.ts",
    "hooks/**/*.ts",
    "utils/**/*.ts"
  ],
  reportFormats: ["markdown", "json"]
}
```

---

## Entity: ReportFormat (Enum)

```typescript
enum ReportFormat {
  Markdown = "markdown",
  JSON = "json",
  Console = "console"
}
```

---

## Entity: AuditReport

Complete output of an audit run.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `auditRun` | AuditRun | Yes | Metadata about the audit execution |
| `summary` | AuditSummary | Yes | Executive summary metrics |
| `principleResults` | PrincipleCompliance[] | Yes | Results for each principle |
| `violationsByFile` | Record<string, FileAnalysis> | Yes | Violations organized by file |
| `violationsBySeverity` | Record<Severity, Violation[]> | Yes | Violations organized by severity |
| `trendData` | TrendData | No | Historical comparison (if previous audits exist) |
| `recommendations` | string[] | Yes | Top prioritized remediation recommendations |

---

## Entity: AuditSummary

Executive summary of audit results.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `healthScore` | number | Yes | Overall score (0-100) |
| `filesAnalyzed` | number | Yes | Total files analyzed |
| `totalViolations` | number | Yes | Total violations found |
| `severityCounts` | SeverityCount | Yes | Violations by severity |
| `topViolatedPrinciple` | string | Yes | Principle with lowest compliance |
| `topCompliantPrinciple` | string | Yes | Principle with highest compliance |

---

## Entity: TrendData

Historical comparison data (only if previous audits exist).

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `previousAudit` | AuditRun | Yes | Previous audit run metadata |
| `healthScoreChange` | number | Yes | Change in health score (e.g., +4, -2) |
| `violationChange` | number | Yes | Change in total violations (e.g., -15, +8) |
| `principleChanges` | Record<string, number> | Yes | Per-principle compliance % change |
| `trend` | TrendDirection | Yes | Overall trend direction |

---

## Entity: TrendDirection (Enum)

```typescript
enum TrendDirection {
  Improving = "improving",    // Health score increased
  Declining = "declining",     // Health score decreased
  Stable = "stable"            // Health score unchanged (±1 point)
}
```

---

## State Transitions

### Audit Run Lifecycle

```
[Start] → [Initializing]
  ↓
[Scanning Files]
  ↓
[Analyzing File 1..N]
  ↓
[Calculating Metrics]
  ↓
[Generating Reports]
  ↓
[Storing History]
  ↓
[Complete]
```

### Violation Detection Flow

```
[Parse File AST]
  ↓
[Run Analyzer 1..7] → [Detect Violations]
  ↓
[Classify Severity]
  ↓
[Generate Remediation]
  ↓
[Attach to Principle]
```

---

## Data Persistence

### File Storage Structure

```
specs/001-constitution-compliance-audit/audit-history/
├── 2025-01-08-103000-feat-style-overhaul.json     # Full AuditReport
├── 2025-01-09-141500-main.json                    # Full AuditReport
└── latest.json                                     # Symlink to most recent
```

### JSON Schema Validation

All persisted AuditReport JSON files must validate against the schema defined in `contracts/audit-report-schema.json`.

---

## Calculated Fields

### Health Score Calculation

```typescript
healthScore = Σ(principleCompliance[i] × principleWeight[i]) for i=1 to 7

Example:
  Design System: 65% × 0.20 = 13
  Type Safety: 89% × 0.20 = 17.8
  Component Arch: 78% × 0.20 = 15.6
  Accessibility: 82% × 0.10 = 8.2
  Performance: 71% × 0.15 = 10.65
  State Mgmt: 85% × 0.10 = 8.5
  Testing/Docs: 60% × 0.05 = 3
  ──────────────────────────
  Health Score = 76.75 ≈ 77/100
```

### Compliance Percentage Calculation

```typescript
compliancePercentage = (passedChecks / totalChecks) × 100

Where:
  totalChecks = number of applicable rules checked for this principle
  passedChecks = checks that found no violations
  failedChecks = checks that found violations (equals violations.length)
```

---

## Example: Complete Data Flow

```typescript
// 1. Initialize audit run
const auditRun: AuditRun = {
  id: "2025-01-08-103000",
  timestamp: new Date("2025-01-08T10:30:00Z"),
  constitutionVersion: "1.0.0",
  branch: "feat/style-overhaul",
  commitHash: "abc123def",
  filesAnalyzed: 52,
  totalViolations: 143,
  healthScore: 72,
  principles: [...],
  duration: 45000,
  config: {...}
};

// 2. Detect violation
const violation: Violation = {
  id: "components/ui/Button.tsx:45:missing-use-theme-colors",
  file: "components/ui/Button.tsx",
  line: 45,
  principleId: "principle-1-design-system",
  ruleId: "missing-use-theme-colors",
  severity: Severity.High,
  message: "Component uses useColorScheme directly instead of useThemeColors hook",
  remediation: {
    description: "Replace useColorScheme with useThemeColors hook",
    claudeMdReference: "CLAUDE.md:349-394",
    codeExample: "...",
    autoFixAvailable: false,
    estimatedEffort: "5 minutes"
  }
};

// 3. Aggregate into principle
const principleCompliance: PrincipleCompliance = {
  principleId: "principle-1-design-system",
  principleName: "Design System Adherence",
  compliancePercentage: 65,
  totalChecks: 156,
  passedChecks: 101,
  failedChecks: 55,
  violations: [violation, ...],
  weight: 0.20
};

// 4. Generate report
const report: AuditReport = {
  auditRun,
  summary: {...},
  principleResults: [principleCompliance, ...],
  violationsByFile: {...},
  violationsBySeverity: {...},
  trendData: {...},
  recommendations: [...]
};
```
