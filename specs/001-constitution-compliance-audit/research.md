# Technical Research: Constitution Compliance Audit

**Feature**: Constitution Compliance Audit
**Branch**: 001-constitution-compliance-audit
**Date**: 2025-01-08

## Purpose

This document captures technical research and decisions for implementing the automated constitution compliance audit tool. Each decision includes rationale and alternatives considered.

---

## Decision 1: TypeScript AST Parser Selection

**Decision**: Use **ts-morph** (Type-Safe TypeScript Compiler Wrapper)

**Rationale**:
- ts-morph provides a simpler, more intuitive API than the raw TypeScript Compiler API
- Built specifically for code analysis and manipulation use cases
- Excellent TypeScript support with type-safe AST traversal
- Active maintenance and good documentation
- Performance is sufficient for our scale (~50 files, 10k LOC)
- Handles JSX/TSX files natively (critical for React Native components)

**Alternatives Considered**:
1. **@typescript-eslint/parser**:
   - Pro: Used by ESLint, battle-tested
   - Con: Designed for linting rules, not general code analysis
   - Con: More complex to extract patterns we need (hooks in loops, style patterns)

2. **TypeScript Compiler API (directly)**:
   - Pro: Most powerful, no abstraction layer
   - Con: Steep learning curve, verbose code
   - Con: Lower-level API requires more boilerplate

3. **babel/parser**:
   - Pro: Fast, widely used
   - Con: Loses TypeScript type information
   - Con: Would need separate type checking

**Implementation Notes**:
- ts-morph wraps the TypeScript Compiler API, providing friendly methods like `getDescendantsOfKind()`, `getType()`, etc.
- Supports querying for specific syntax kinds (JSX, hooks, function calls)
- Can extract line numbers and source locations for violation reporting

---

## Decision 2: Pattern Detection Strategy

**Decision**: **Visitor Pattern with Rule-Based Analyzers**

**Rationale**:
- Each constitutional principle gets its own analyzer module
- Analyzers implement a visitor pattern traversing the AST
- Rules are declarative and testable in isolation
- Easy to add new rules or modify existing ones
- Follows separation of concerns - each analyzer focuses on one principle

**Architecture**:
```typescript
interface Analyzer {
  principle: string;
  analyze(sourceFile: SourceFile): Violation[];
}

class DesignSystemAnalyzer implements Analyzer {
  principle = "Design System Adherence";

  analyze(sourceFile: SourceFile): Violation[] {
    const violations: Violation[] = [];

    // Check for useColorScheme usage
    violations.push(...this.checkColorSchemeUsage(sourceFile));

    // Check for hardcoded hex colors
    violations.push(...this.checkHardcodedColors(sourceFile));

    // Check for useMemo pattern
    violations.push(...this.checkUseMemoPattern(sourceFile));

    return violations;
  }
}
```

**Alternatives Considered**:
1. **Single monolithic analyzer**:
   - Con: Would become massive and hard to maintain
   - Con: Violates single responsibility principle

2. **ESLint rule approach**:
   - Pro: Familiar pattern for linting
   - Con: Overkill for our needs, adds complexity
   - Con: Would require ESLint infrastructure

**Implementation Notes**:
- Each analyzer is independently testable
- Analyzers can share utility functions (AST queries, severity classification)
- Main auditor orchestrates running all analyzers and aggregating results

---

## Decision 3: Severity Classification Logic

**Decision**: **Rule-Based Severity Assignment with Pattern Matching**

**Severity Levels**:

| Level    | Criteria | Examples |
|----------|----------|----------|
| Critical | Causes runtime crashes or errors | Missing text fallbacks, hooks in loops |
| High     | Breaks core functionality or UX | Missing accessibility labels, theme switching issues |
| Medium   | Maintainability and performance issues | Missing memoization, large components (>200 lines) |
| Low      | Style inconsistencies and documentation gaps | Missing JSDoc comments, minor spacing issues |

**Rationale**:
- Severity is determined by impact on users and codebase health
- Critical violations should block PRs or trigger immediate fixes
- Low violations can be addressed incrementally

**Implementation**:
```typescript
function classifySeverity(
  principle: string,
  ruleId: string,
  context: ViolationContext
): Severity {
  // Critical: Runtime errors
  if (ruleId === 'hooks-in-loops' || ruleId === 'missing-text-fallback') {
    return 'critical';
  }

  // High: UX/functionality breaks
  if (ruleId === 'missing-accessibility-label' || ruleId === 'broken-theme') {
    return 'high';
  }

  // Medium: Maintainability
  if (ruleId === 'missing-memo' || ruleId === 'large-component') {
    return 'medium';
  }

  // Low: Documentation
  return 'low';
}
```

**Alternatives Considered**:
1. **User-configurable severity**:
   - Pro: Flexible
   - Con: Adds complexity, requires config management
   - Decision: Keep simple for v1, add configurability later if needed

---

## Decision 4: Report Format and Structure

**Decision**: **Markdown Primary + JSON Secondary**

**Markdown Report Structure**:
```markdown
# Constitution Compliance Audit Report

**Date**: 2025-01-08
**Constitution Version**: 1.0.0
**Codebase Health Score**: 72/100

## Executive Summary
- Total Files Analyzed: 52
- Total Violations: 143
- Critical: 8 | High: 24 | Medium: 67 | Low: 44

## Compliance by Principle
1. Design System Adherence: 65% ❌
2. Type Safety: 89% ✅
3. Component Architecture: 78% ⚠️
...

## Critical Violations (8)
### Principle III: Component Architecture
- **File**: `app/(tabs)/_layout.tsx:45`
  **Severity**: Critical
  **Rule**: Hooks called inside map function
  **Description**: useSharedValue called inside items.map() will cause "Rendered more hooks" error
  **Remediation**: Extract TabIcon to separate component - see CLAUDE.md:267-300

...

## Trend Analysis (if historical data exists)
- Design System: 58% → 65% (+7%) ↗️
- Overall Health: 68 → 72 (+4 points) ↗️
```

**JSON Report** (for CI/CD):
```json
{
  "timestamp": "2025-01-08T10:30:00Z",
  "constitutionVersion": "1.0.0",
  "healthScore": 72,
  "violations": [
    {
      "file": "app/(tabs)/_layout.tsx",
      "line": 45,
      "principle": "Component Architecture",
      "severity": "critical",
      "ruleId": "hooks-in-loops",
      "message": "...",
      "remediation": "..."
    }
  ]
}
```

**Rationale**:
- Markdown is human-readable for code reviews and documentation
- JSON enables CI/CD integration, automated reporting, trend tracking
- Both formats generated from same data model

**Alternatives Considered**:
1. **HTML report**:
   - Pro: Better formatting, interactive
   - Con: Harder to version control, requires viewer

2. **Plain text**:
   - Pro: Simple
   - Con: Limited formatting, harder to scan

---

## Decision 5: Historical Data Storage

**Decision**: **JSON files in `specs/001-constitution-compliance-audit/audit-history/`**

**File Naming**: `YYYY-MM-DD-HHmmss-[branch-name].json`

**Rationale**:
- Simple, no database required
- Version controlled alongside code changes
- Easy to diff between runs
- Lightweight for current scale
- Can migrate to database later if needed

**Storage Structure**:
```
specs/001-constitution-compliance-audit/audit-history/
├── 2025-01-08-103000-feat-style-overhaul.json
├── 2025-01-09-141500-main.json
└── latest.json  # Symlink to most recent
```

**Alternatives Considered**:
1. **SQLite database**:
   - Pro: Better for complex queries, large history
   - Con: Overkill for current needs, requires database management

2. **Git tags with reports**:
   - Pro: Tied to specific commits
   - Con: Harder to query, clutters git tags

---

## Decision 6: Performance Optimization Strategy

**Decision**: **Parallel File Processing with Worker Threads (if needed)**

**Initial Approach**:
- Sequential file processing (simplest)
- Measure performance on real codebase
- Optimize only if exceeding 2-minute target (SC-004)

**Optimization Path (if needed)**:
1. Parse files in parallel using worker threads
2. Share AST cache between analyzers
3. Skip unchanged files (git diff-based)

**Rationale**:
- Premature optimization wastes time
- Current codebase is small (~50 files)
- Node.js single-threaded processing likely sufficient
- Can add parallelization if performance testing shows need

**Performance Targets**:
- Goal: <2 minutes for full audit (SC-004)
- File parsing: ~50-100ms per file
- Analysis: ~10-20ms per file per analyzer
- Estimated total: ~30 seconds (well under target)

---

## Decision 7: Configuration and Exclusions

**Decision**: **`.auditrc.json` for configuration**

**Configuration Schema**:
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
  "severityOverrides": {},
  "reportFormats": ["markdown", "json"]
}
```

**Rationale**:
- Standard JSON config file (like ESLint, Prettier)
- Allows customization without code changes
- Exclusions prevent false positives (Colors.ts has valid hardcoded hex values)
- Include patterns ensure comprehensive coverage

**Alternatives Considered**:
1. **Hardcoded configuration**:
   - Con: Inflexible, requires code changes for adjustments

2. **CLI arguments only**:
   - Con: Verbose command lines, hard to share team settings

---

## Decision 8: Remediation Guidance

**Decision**: **Link to CLAUDE.md sections with code examples**

**Remediation Format**:
```typescript
interface Remediation {
  description: string;
  claudeMdReference?: string;  // e.g., "CLAUDE.md:267-300"
  codeExample?: string;
  autoFixAvailable: boolean;
}
```

**Example**:
```markdown
**Remediation**:
Extract component to follow hooks rules (see CLAUDE.md:267-300)

Example:
\`\`\`typescript
// ❌ Wrong - hooks in map
{items.map(item => {
  const animated = useSharedValue(0);
  return <View />;
})}

// ✅ Correct - extract component
const Item = ({ item }) => {
  const animated = useSharedValue(0);
  return <View />;
};
{items.map(item => <Item key={item.id} item={item} />)}
\`\`\`
```

**Rationale**:
- CLAUDE.md already has comprehensive examples
- Reuse existing documentation rather than duplicate
- Code examples show exact fix pattern
- Future: could implement auto-fix for simple violations

---

## Summary of Technical Stack

**Core Dependencies**:
- `ts-morph`: ^21.0.0 - TypeScript AST parsing
- `glob`: ^10.0.0 - File discovery
- `commander`: ^11.0.0 - CLI argument parsing
- `chalk`: ^5.0.0 - Terminal output coloring
- `markdown-table`: ^3.0.0 - Markdown table generation

**Dev Dependencies**:
- `@types/node`: ^20.0.0
- `typescript`: ^5.9.2
- `tsx`: ^4.0.0 - TypeScript execution

**Project Structure**:
- Language: TypeScript 5.9.2
- Runtime: Node.js 20+
- Output: Markdown + JSON reports
- Storage: File system (JSON)
- Performance: <2 minutes for ~50 files

---

## Next Steps

With research complete, proceed to Phase 1:
1. Create data-model.md defining audit entities
2. Create contracts/ defining report JSON schema
3. Create quickstart.md for running the audit
4. Update agent context with new dependencies
