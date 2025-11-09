---

description: "Task list for constitution compliance audit feature"
---

# Tasks: Constitution Compliance Audit

**Input**: Design documents from `/specs/001-constitution-compliance-audit/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not included as testing infrastructure is not yet established per constitution Future Infrastructure section.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `scripts/audit/src/` for audit tool source code
- **Documentation**: `specs/001-constitution-compliance-audit/`
- All paths relative to repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create scripts/audit directory structure (src/, types/, analyzers/, utils/, reporters/, config/)
- [ ] T002 Initialize package.json in scripts/audit with dependencies (ts-morph@^21.0.0, glob@^10.0.0, commander@^11.0.0, chalk@^5.0.0, markdown-table@^3.0.0)
- [ ] T003 [P] Configure TypeScript compiler in scripts/audit/tsconfig.json (strict mode, ES2022 target, Node20 module resolution)
- [ ] T004 [P] Create .auditrc.json configuration file in repository root with default exclusion patterns
- [ ] T005 [P] Create specs/001-constitution-compliance-audit/audit-history directory for historical data storage

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Define TypeScript interfaces in scripts/audit/src/types/audit.ts (AuditRun, Violation, Remediation, FileAnalysis)
- [ ] T007 [P] Define TypeScript interfaces in scripts/audit/src/types/principle.ts (PrincipleCompliance, Severity enum, ComplianceStatus enum)
- [ ] T008 [P] Define TypeScript interfaces in scripts/audit/src/types/config.ts (AuditConfig, ReportFormat enum, SeverityCount)
- [ ] T009 Implement AST parser utility in scripts/audit/src/utils/ast-parser.ts using ts-morph (Project initialization, source file loading, AST traversal helpers)
- [ ] T010 Implement file scanner utility in scripts/audit/src/utils/file-scanner.ts using glob (pattern matching, exclusion handling, file discovery)
- [ ] T011 [P] Implement severity classification utility in scripts/audit/src/utils/severity.ts (rule-based severity assignment logic per research.md Decision 3)
- [ ] T012 [P] Implement metrics calculation utility in scripts/audit/src/utils/metrics.ts (compliance percentage, health score weighted calculation per data-model.md)
- [ ] T013 Create configuration loader in scripts/audit/src/config/exclusions.ts (load .auditrc.json, merge with defaults, handle precedence)
- [ ] T014 Define audit rules in scripts/audit/src/config/rules.ts (rule IDs, descriptions, severity mappings for all 7 principles)
- [ ] T015 Create base Analyzer interface in scripts/audit/src/analyzers/index.ts (analyze method signature, principle property, violation detection contract)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Comprehensive Compliance Assessment (Priority: P1) 🎯 MVP

**Goal**: Analyze all source files against 7 principles, report violations with file paths/line numbers/severity, calculate compliance metrics and health score

**Independent Test**: Run audit against current codebase, verify all 7 principles are analyzed with violation reports including file:line, severity, and metrics. Complete compliance report can be reviewed independently.

### Implementation for User Story 1

- [ ] T016 [P] [US1] Implement Design System analyzer in scripts/audit/src/analyzers/design-system.ts (detect useColorScheme vs useThemeColors, hardcoded hex colors, missing useMemo for styles)
- [ ] T017 [P] [US1] Implement Type Safety analyzer in scripts/audit/src/analyzers/type-safety.ts (detect 'any' type usage, missing error handling in async functions, missing TypeScript interfaces)
- [ ] T018 [P] [US1] Implement Component Architecture analyzer in scripts/audit/src/analyzers/component-arch.ts (detect hooks in map/loops, missing text fallbacks, components >200 lines)
- [ ] T019 [P] [US1] Implement Accessibility analyzer in scripts/audit/src/analyzers/accessibility.ts (detect missing accessibility labels, missing haptic feedback, missing loading states)
- [ ] T020 [P] [US1] Implement Performance analyzer in scripts/audit/src/analyzers/performance.ts (detect missing useMemo for styles, FlatList without optimization props, inline functions in render)
- [ ] T021 [P] [US1] Implement State Management analyzer in scripts/audit/src/analyzers/state-mgmt.ts (detect Zustand store violations: missing interfaces, loading/error states, persistence)
- [ ] T022 [P] [US1] Implement Testing & Documentation analyzer in scripts/audit/src/analyzers/testing-docs.ts (detect missing JSDoc on UI components, missing defensive coding patterns)
- [ ] T023 [US1] Create main Auditor orchestrator in scripts/audit/src/auditor.ts (coordinate file scanning, run all 7 analyzers, aggregate violations, calculate metrics)
- [ ] T024 [US1] Implement Markdown report generator in scripts/audit/src/reporters/markdown.ts (generate structured report per quickstart.md format, organize by principle and severity)
- [ ] T025 [P] [US1] Implement JSON report generator in scripts/audit/src/reporters/json.ts (generate JSON output per contracts/audit-report-schema.json)
- [ ] T026 [P] [US1] Implement console reporter in scripts/audit/src/reporters/console.ts (terminal output with chalk coloring, summary metrics, violation counts)
- [ ] T027 [US1] Create CLI entry point in scripts/audit/src/index.ts (commander setup, argument parsing, orchestrate audit execution, handle output formats)
- [ ] T028 [US1] Add npm scripts to scripts/audit/package.json (build, audit commands)
- [ ] T029 [US1] Add npm script to root package.json (npm run audit pointing to scripts/audit)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - audit runs and generates comprehensive compliance reports

---

## Phase 4: User Story 2 - Severity-Based Prioritization (Priority: P2)

**Goal**: Categorize violations by severity (critical/high/medium/low), enable filtering/sorting by severity in reports

**Independent Test**: Review generated report, verify each violation has appropriate severity rating, confirm violations can be filtered by severity

### Implementation for User Story 2

- [ ] T030 [US2] Enhance severity classifier in scripts/audit/src/utils/severity.ts (implement refined severity assignment rules per data-model.md severity distribution)
- [ ] T031 [US2] Update Markdown reporter in scripts/audit/src/reporters/markdown.ts (add severity-based sections: Critical, High, Medium, Low with violation grouping)
- [ ] T032 [P] [US2] Update JSON reporter in scripts/audit/src/reporters/json.ts (add violationsBySeverity field to report structure)
- [ ] T033 [P] [US2] Update console reporter in scripts/audit/src/reporters/console.ts (add severity breakdown with color coding: red=critical, orange=high, yellow=medium, green=low)
- [ ] T034 [US2] Add severity filtering to CLI in scripts/audit/src/index.ts (--severity flag accepting critical,high,medium,low)
- [ ] T035 [US2] Generate remediation guidance in violation reports (link to CLAUDE.md sections per research.md Decision 8, include code examples where applicable)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - violations are severity-categorized and filterable

---

## Phase 5: User Story 3 - Compliance Trend Tracking (Priority: P3)

**Goal**: Track compliance metrics over time, show percentage changes per principle, identify improvement direction

**Independent Test**: Run audit multiple times, compare compliance percentages and health scores, verify trend data is accurate

### Implementation for User Story 3

- [ ] T036 [P] [US3] Implement historical data storage in scripts/audit/src/utils/history.ts (save audit results to specs/001-constitution-compliance-audit/audit-history/[timestamp].json)
- [ ] T037 [US3] Implement historical data loading in scripts/audit/src/utils/history.ts (load previous audit, parse results, identify latest baseline)
- [ ] T038 [US3] Implement trend calculation in scripts/audit/src/utils/metrics.ts (compare current vs previous audit, calculate percentage changes, determine trend direction)
- [ ] T039 [US3] Update Markdown reporter in scripts/audit/src/reporters/markdown.ts (add Trend Analysis section showing principle-by-principle changes with arrows)
- [ ] T040 [P] [US3] Update JSON reporter in scripts/audit/src/reporters/json.ts (add trendData field with previousAuditId, healthScoreChange, violationChange, principleChanges)
- [ ] T041 [P] [US3] Update console reporter in scripts/audit/src/reporters/console.ts (show health score trend with arrows: ↗️ improving, ↘️ declining, → stable)
- [ ] T042 [US3] Add audit run metadata tracking in scripts/audit/src/auditor.ts (capture git branch, commit hash, timestamp, constitution version)

**Checkpoint**: All user stories should now be independently functional - full audit with trend tracking over time

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T043 [P] Create README.md in scripts/audit/ (installation, usage examples, configuration options, CI/CD integration)
- [ ] T044 [P] Add error handling and defensive coding throughout analyzers (graceful parsing errors, file read failures, malformed AST handling)
- [ ] T045 Add JSDoc comments to all public interfaces and classes (audit.ts, principle.ts, analyzers, reporters)
- [ ] T046 [P] Optimize performance if needed (parallel file processing, AST caching, skip unchanged files based on git diff)
- [ ] T047 Create .gitignore entry for scripts/audit/dist and audit-history/*.json (except .gitkeep)
- [ ] T048 Validate quickstart.md instructions by running through all examples

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 reporters but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1/US2 with historical tracking but independently testable

### Within Each User Story

- Analyzers (T016-T022) can run in parallel - all different files
- Reporters (T024-T026) can run in parallel - all different files
- Main Auditor (T023) depends on analyzers being complete
- CLI (T027) depends on Auditor and reporters being complete
- Npm scripts (T028-T029) are final integration step

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All 7 analyzers for User Story 1 (T016-T022) can run in parallel
- All 3 reporters for User Story 1 (T024-T026) can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all analyzers together (T016-T022):
Task: "Implement Design System analyzer in scripts/audit/src/analyzers/design-system.ts"
Task: "Implement Type Safety analyzer in scripts/audit/src/analyzers/type-safety.ts"
Task: "Implement Component Architecture analyzer in scripts/audit/src/analyzers/component-arch.ts"
Task: "Implement Accessibility analyzer in scripts/audit/src/analyzers/accessibility.ts"
Task: "Implement Performance analyzer in scripts/audit/src/analyzers/performance.ts"
Task: "Implement State Management analyzer in scripts/audit/src/analyzers/state-mgmt.ts"
Task: "Implement Testing & Documentation analyzer in scripts/audit/src/analyzers/testing-docs.ts"

# After analyzers complete, launch all reporters together (T024-T026):
Task: "Implement Markdown report generator in scripts/audit/src/reporters/markdown.ts"
Task: "Implement JSON report generator in scripts/audit/src/reporters/json.ts"
Task: "Implement console reporter in scripts/audit/src/reporters/console.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T015) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T016-T029)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Run: `npm run audit`
   - Verify: Report generated with all 7 principles analyzed
   - Verify: Violations show file:line, severity, metrics
   - Verify: Health score calculated correctly
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
   - Deliverable: Basic audit with comprehensive compliance assessment
3. Add User Story 2 → Test independently → Deploy/Demo
   - Deliverable: Severity-based prioritization added
4. Add User Story 3 → Test independently → Deploy/Demo
   - Deliverable: Historical trend tracking added
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (analyzers + basic reporting)
   - Developer B: User Story 2 (severity enhancements)
   - Developer C: User Story 3 (trend tracking)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Summary

**Total Tasks**: 48
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 10 tasks
- Phase 3 (User Story 1 - P1): 14 tasks
- Phase 4 (User Story 2 - P2): 6 tasks
- Phase 5 (User Story 3 - P3): 7 tasks
- Phase 6 (Polish): 6 tasks

**Parallel Opportunities**:
- Setup: 3 tasks can run in parallel (T003-T005)
- Foundational: 6 tasks can run in parallel (T007-T008, T011-T012, after T006)
- User Story 1: 7 analyzers in parallel (T016-T022), then 2 reporters in parallel (T025-T026)
- User Story 2: 2 tasks can run in parallel (T032-T033)
- User Story 3: 3 tasks can run in parallel (T036, T040-T041)
- Polish: 3 tasks can run in parallel (T043-T044, T047)

**MVP Scope** (Recommended First Delivery):
- Phase 1: Setup (5 tasks)
- Phase 2: Foundational (10 tasks)
- Phase 3: User Story 1 (14 tasks)
- **Total for MVP**: 29 tasks

**Estimated Effort**:
- Setup: ~1-2 hours
- Foundational: ~4-6 hours
- User Story 1: ~12-16 hours
- User Story 2: ~3-4 hours
- User Story 3: ~4-6 hours
- Polish: ~2-3 hours
- **Total**: ~26-37 hours (3-5 days for single developer)
