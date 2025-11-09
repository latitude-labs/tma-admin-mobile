# Quickstart: Constitution Compliance Audit

**Feature**: Constitution Compliance Audit
**Branch**: 001-constitution-compliance-audit
**Version**: 1.0.0

## Overview

The Constitution Compliance Audit tool analyzes the TMA Admin Mobile codebase for compliance with Constitution v1.0.0, detecting violations across 7 principles and generating actionable compliance reports.

---

## Installation

### Prerequisites

- Node.js 20+ installed
- TMA Admin Mobile repository cloned
- Working in repository root directory

### Setup

```bash
# Navigate to audit tool directory
cd scripts/audit

# Install dependencies
npm install

# Build the audit tool (TypeScript compilation)
npm run build
```

**Dependencies Installed**:
- `ts-morph`: TypeScript AST parsing
- `glob`: File pattern matching
- `commander`: CLI argument parsing
- `chalk`: Terminal output formatting
- `markdown-table`: Report generation

---

## Basic Usage

### Run Full Audit

```bash
# From repository root
npm run audit

# Or directly via Node
node scripts/audit/dist/index.js
```

This will:
1. Scan all source files in `app/`, `components/`, `services/`, `store/`, `hooks/`, `utils/`
2. Analyze against all 7 constitutional principles
3. Generate compliance report in Markdown and JSON formats
4. Save historical data for trend tracking
5. Display summary in terminal

**Output Locations**:
- Markdown Report: `specs/001-constitution-compliance-audit/reports/latest.md`
- JSON Report: `specs/001-constitution-compliance-audit/reports/latest.json`
- Historical Data: `specs/001-constitution-compliance-audit/audit-history/[timestamp].json`

---

## Command-Line Options

### Format Selection

```bash
# Generate only Markdown report
npm run audit -- --format markdown

# Generate only JSON report (for CI/CD)
npm run audit -- --format json

# Generate console output only (no files)
npm run audit -- --format console

# Multiple formats
npm run audit -- --format markdown,json,console
```

### Severity Filtering

```bash
# Show only critical violations
npm run audit -- --severity critical

# Show critical and high violations
npm run audit -- --severity critical,high

# All severities (default)
npm run audit
```

### Principle Selection

```bash
# Audit specific principles only
npm run audit -- --principles design-system,type-safety

# Principle IDs:
# - design-system
# - type-safety
# - component-architecture
# - accessibility
# - performance
# - state-management
# - testing-documentation
```

### File Filtering

```bash
# Audit specific directory
npm run audit -- --include "components/**/*.tsx"

# Exclude specific files
npm run audit -- --exclude "**/*.test.tsx"

# Combine multiple patterns
npm run audit -- --include "app/**/*.tsx" --exclude "app/(tabs)/**"
```

### Output Control

```bash
# Specify custom output directory
npm run audit -- --output ./audit-reports

# Verbose mode (show detailed progress)
npm run audit -- --verbose

# Quiet mode (only show summary)
npm run audit -- --quiet
```

---

## Configuration File

Create `.auditrc.json` in repository root to customize defaults:

```json
{
  "constitutionVersion": "1.0.0",
  "exclude": [
    "node_modules/**",
    ".expo/**",
    "**/*.test.tsx",
    "constants/Colors.ts",
    "constants/Theme.ts"
  ],
  "include": [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "services/**/*.ts",
    "store/**/*.ts",
    "hooks/**/*.ts",
    "utils/**/*.ts"
  ],
  "severityOverrides": {
    "missing-jsdoc": "low"
  },
  "reportFormats": ["markdown", "json"]
}
```

**Configuration Precedence**:
1. CLI arguments (highest priority)
2. `.auditrc.json` file
3. Built-in defaults

---

## Reading the Report

### Markdown Report Structure

```markdown
# Constitution Compliance Audit Report

## Executive Summary
├── Health Score: 72/100
├── Files Analyzed: 52
├── Total Violations: 143
└── Severity Breakdown: Critical (8), High (24), Medium (67), Low (44)

## Compliance by Principle
1. Design System Adherence: 65% ❌
2. Type Safety: 89% ✅
3. Component Architecture: 78% ⚠️
...

## Critical Violations
└── [File path:line] Description with remediation

## High Violations
└── ...

## Recommendations
└── Top prioritized fixes
```

### Understanding Health Score

**Health Score Calculation**:
```
Score = Σ(PrincipleCompliance% × PrincipleWeight)

Weights:
- Design System: 20%
- Type Safety: 20%
- Component Architecture: 20%
- Accessibility: 10%
- Performance: 15%
- State Management: 10%
- Testing & Documentation: 5%
```

**Score Interpretation**:
- **90-100**: Excellent - Minor issues only
- **75-89**: Good - Some violations to address
- **60-74**: Fair - Significant violations present
- **Below 60**: Poor - Critical issues require immediate attention

### Severity Levels Explained

| Level | Impact | Action Required |
|-------|--------|-----------------|
| **Critical** | Causes crashes or runtime errors | Fix immediately before merge |
| **High** | Breaks core functionality or UX | Fix in current sprint |
| **Medium** | Maintainability and performance issues | Plan for next sprint |
| **Low** | Style inconsistencies, documentation gaps | Address incrementally |

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/audit.yml
name: Constitution Compliance Audit

on:
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install audit dependencies
        run: |
          cd scripts/audit
          npm install

      - name: Run constitution audit
        run: npm run audit -- --format json

      - name: Check for critical violations
        run: |
          CRITICAL_COUNT=$(jq '.summary.severityCounts.critical' specs/001-constitution-compliance-audit/reports/latest.json)
          if [ "$CRITICAL_COUNT" -gt 0 ]; then
            echo "❌ Found $CRITICAL_COUNT critical violations - blocking merge"
            exit 1
          fi

      - name: Upload audit report
        uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: specs/001-constitution-compliance-audit/reports/latest.json
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh

# Run audit before commit
npm run audit -- --severity critical,high --quiet

# Exit if critical or high violations found
if [ $? -ne 0 ]; then
  echo "❌ Constitution audit found critical or high violations"
  echo "Run 'npm run audit' to see details"
  exit 1
fi
```

---

## Troubleshooting

### Common Issues

**Issue**: "No files found to analyze"
```bash
# Solution: Check include patterns in .auditrc.json
cat .auditrc.json | grep include

# Verify files exist
ls app/**/*.tsx
```

**Issue**: "Parsing error in [file]"
```bash
# Solution: Check TypeScript syntax
npx tsc --noEmit [file]

# Files with parsing errors are reported separately in the audit
```

**Issue**: "Audit taking too long (>2 minutes)"
```bash
# Solution: Reduce scope or check file count
npm run audit -- --include "components/**/*.tsx" --verbose

# Expected: ~30-60 seconds for ~50 files
```

**Issue**: "False positive: Colors.ts flagged for hardcoded colors"
```bash
# Solution: Add to exclude patterns
# In .auditrc.json:
{
  "exclude": [
    "constants/Colors.ts",
    "constants/Theme.ts"
  ]
}
```

---

## Examples

### Example 1: Quick Check Before Commit

```bash
# Check only your changed files
npm run audit -- --include "components/ui/Button.tsx" --severity critical,high

# Review output
# Fix any violations
# Commit
```

### Example 2: Full Codebase Audit

```bash
# Run complete audit with all reports
npm run audit --verbose

# Review markdown report
cat specs/001-constitution-compliance-audit/reports/latest.md

# Check health score trend
cat specs/001-constitution-compliance-audit/reports/latest.md | grep "Health Score"
```

### Example 3: Focus on Specific Principle

```bash
# Audit only Design System compliance
npm run audit -- --principles design-system --format console

# See all violations for Design System principle
```

### Example 4: CI/CD JSON Processing

```bash
# Run audit and extract metrics
npm run audit -- --format json --quiet

# Extract health score using jq
jq '.summary.healthScore' specs/001-constitution-compliance-audit/reports/latest.json

# Get critical violation count
jq '.summary.severityCounts.critical' specs/001-constitution-compliance-audit/reports/latest.json

# List all critical violations
jq '.violationsBySeverity.critical' specs/001-constitution-compliance-audit/reports/latest.json
```

---

## Interpreting Results

### Sample Output

```
╔════════════════════════════════════════════════╗
║   Constitution Compliance Audit Report         ║
╚════════════════════════════════════════════════╝

📊 Health Score: 72/100

📁 Files Analyzed: 52
🔍 Total Violations: 143

Severity Breakdown:
  🔴 Critical:  8
  🟠 High:     24
  🟡 Medium:   67
  🟢 Low:      44

Compliance by Principle:
  ❌ Design System Adherence        65%  (20% weight)
  ✅ Type Safety                    89%  (20% weight)
  ⚠️  Component Architecture         78%  (20% weight)
  ⚠️  Accessibility                  82%  (10% weight)
  ⚠️  Performance                    71%  (15% weight)
  ✅ State Management               85%  (10% weight)
  ⚠️  Testing & Documentation        60%  ( 5% weight)

Top Violations:
  1. components/ui/Button.tsx:45 - Missing useThemeColors hook (High)
  2. app/(tabs)/_layout.tsx:67 - Hooks in map function (Critical)
  3. components/ui/Card.tsx:32 - Missing useMemo for styles (Medium)
  ...

📈 Trend: +4 points from previous audit (Improving ↗️)

💡 Top Recommendations:
  1. Update UI components to use useThemeColors() (affects 15 files)
  2. Extract components to fix hooks-in-loops violations (affects 3 files)
  3. Add useMemo to style creation (affects 22 components)

Full report: specs/001-constitution-compliance-audit/reports/latest.md
```

### Next Steps After Audit

1. **Review Critical Violations**: Address immediately
2. **Plan High Violations**: Add to current sprint
3. **Track Medium/Low**: Backlog for future sprints
4. **Monitor Trends**: Run audit regularly to track improvement

---

## Advanced Usage

### Custom Rules

To add custom audit rules, extend the analyzers:

```typescript
// scripts/audit/src/analyzers/custom.ts
import { Analyzer, Violation } from '../types';

export class CustomAnalyzer implements Analyzer {
  principle = "Custom Checks";

  analyze(sourceFile: SourceFile): Violation[] {
    // Your custom rule logic
    return violations;
  }
}
```

### Programmatic Usage

```typescript
import { Auditor } from './scripts/audit/src/auditor';
import { AuditConfig } from './scripts/audit/src/types';

const config: AuditConfig = {
  constitutionVersion: "1.0.0",
  include: ["app/**/*.tsx"],
  exclude: ["**/*.test.tsx"],
  reportFormats: ["json"]
};

const auditor = new Auditor(config);
const report = await auditor.run();

console.log(`Health Score: ${report.summary.healthScore}`);
```

---

## Support

**Issues**: Report bugs or false positives in repository issues
**Documentation**: See `README.md` in `scripts/audit/`
**Constitution**: `.specify/memory/constitution.md`
**Development Guide**: `CLAUDE.md`

---

## Changelog

### Version 1.0.0 (2025-01-08)
- Initial release
- Support for all 7 constitutional principles
- Markdown and JSON report formats
- Historical trend tracking
- CLI interface with multiple options
- CI/CD integration examples
