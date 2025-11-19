/**
 * Audit rule definitions
 * Defines all rules for the 7 constitutional principles
 */

import { Severity } from '../types/audit.js';

/**
 * Audit rule definition
 */
export interface AuditRule {
  id: string;
  principleId: string;
  principleName: string;
  description: string;
  severity: Severity;
  remediationTemplate: string;
  claudeMdReference?: string;
}

/**
 * All audit rules organized by principle
 */
export const AUDIT_RULES: Record<string, AuditRule[]> = {
  'principle-1-design-system': [
    {
      id: 'missing-use-theme-colors',
      principleId: 'principle-1-design-system',
      principleName: 'Design System Adherence',
      description: 'Component uses useColorScheme directly instead of useThemeColors hook',
      severity: Severity.High,
      remediationTemplate: 'Replace useColorScheme with useThemeColors hook',
      claudeMdReference: 'CLAUDE.md:349-394',
    },
    {
      id: 'hardcoded-colors',
      principleId: 'principle-1-design-system',
      principleName: 'Design System Adherence',
      description: 'Hardcoded hex color values found instead of theme colors',
      severity: Severity.High,
      remediationTemplate: 'Use palette colors from useThemeColors() instead of hardcoded hex values',
      claudeMdReference: 'CLAUDE.md:349-394',
    },
    {
      id: 'missing-use-memo-styles',
      principleId: 'principle-1-design-system',
      principleName: 'Design System Adherence',
      description: 'Styles created without useMemo, causing unnecessary re-renders',
      severity: Severity.Medium,
      remediationTemplate: 'Wrap style creation in useMemo with palette dependency',
      claudeMdReference: 'CLAUDE.md:349-394',
    },
  ],
  'principle-2-type-safety': [
    {
      id: 'any-type-usage',
      principleId: 'principle-2-type-safety',
      principleName: 'Type Safety',
      description: 'Usage of "any" type bypasses TypeScript safety',
      severity: Severity.High,
      remediationTemplate: 'Replace "any" with specific type or use unknown with type guards',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
    {
      id: 'missing-error-handling',
      principleId: 'principle-2-type-safety',
      principleName: 'Type Safety',
      description: 'Async function missing try-catch error handling',
      severity: Severity.Medium,
      remediationTemplate: 'Add try-catch block to handle potential errors',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
    {
      id: 'missing-interface',
      principleId: 'principle-2-type-safety',
      principleName: 'Type Safety',
      description: 'Component props or function parameters missing TypeScript interface',
      severity: Severity.Medium,
      remediationTemplate: 'Define TypeScript interface for props/parameters',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
  ],
  'principle-3-component-architecture': [
    {
      id: 'hooks-in-loops',
      principleId: 'principle-3-component-architecture',
      principleName: 'Component Architecture',
      description: 'React hooks called inside loops or map functions',
      severity: Severity.Critical,
      remediationTemplate: 'Extract component to call hooks at top level',
      claudeMdReference: 'CLAUDE.md:267-300',
    },
    {
      id: 'missing-text-fallback',
      principleId: 'principle-3-component-architecture',
      principleName: 'Component Architecture',
      description: 'Text component rendering potentially undefined value without fallback',
      severity: Severity.Critical,
      remediationTemplate: 'Add fallback: {value || ""} or use ternary operator',
      claudeMdReference: 'CLAUDE.md:302-348',
    },
    {
      id: 'conditional-text-render',
      principleId: 'principle-3-component-architecture',
      principleName: 'Component Architecture',
      description: 'Using && operator for conditional rendering instead of ternary',
      severity: Severity.Critical,
      remediationTemplate: 'Use ternary operator with explicit null: {condition ? <Component /> : null}',
      claudeMdReference: 'CLAUDE.md:302-348',
    },
    {
      id: 'large-component',
      principleId: 'principle-3-component-architecture',
      principleName: 'Component Architecture',
      description: 'Component exceeds 200 lines - consider breaking down',
      severity: Severity.Medium,
      remediationTemplate: 'Extract smaller components or custom hooks',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
  ],
  'principle-4-accessibility': [
    {
      id: 'missing-accessibility-label',
      principleId: 'principle-4-accessibility',
      principleName: 'Accessibility',
      description: 'Interactive component missing accessibilityLabel',
      severity: Severity.High,
      remediationTemplate: 'Add accessibilityLabel prop for screen readers',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
    {
      id: 'missing-haptic-feedback',
      principleId: 'principle-4-accessibility',
      principleName: 'Accessibility',
      description: 'Button or interactive element missing haptic feedback',
      severity: Severity.High,
      remediationTemplate: 'Add haptic feedback on press using Haptics API',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
    {
      id: 'missing-loading-states',
      principleId: 'principle-4-accessibility',
      principleName: 'Accessibility',
      description: 'Async action missing loading state for user feedback',
      severity: Severity.High,
      remediationTemplate: 'Add loading indicator during async operations',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
  ],
  'principle-5-performance': [
    {
      id: 'missing-flatlist-optimization',
      principleId: 'principle-5-performance',
      principleName: 'Performance',
      description: 'FlatList missing optimization props (keyExtractor, getItemLayout, etc.)',
      severity: Severity.Medium,
      remediationTemplate: 'Add keyExtractor, getItemLayout, and other FlatList optimization props',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
    {
      id: 'inline-render-functions',
      principleId: 'principle-5-performance',
      principleName: 'Performance',
      description: 'Inline function in render causing unnecessary re-renders',
      severity: Severity.Medium,
      remediationTemplate: 'Extract function and wrap with useCallback',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
  ],
  'principle-6-state-management': [
    {
      id: 'missing-zustand-interface',
      principleId: 'principle-6-state-management',
      principleName: 'State Management',
      description: 'Zustand store missing TypeScript interface',
      severity: Severity.Medium,
      remediationTemplate: 'Define TypeScript interface for Zustand store',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
    {
      id: 'missing-persistence',
      principleId: 'principle-6-state-management',
      principleName: 'State Management',
      description: 'Store missing persistence configuration for offline-first approach',
      severity: Severity.Medium,
      remediationTemplate: 'Add persistence middleware to Zustand store',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
  ],
  'principle-7-testing-documentation': [
    {
      id: 'missing-jsdoc',
      principleId: 'principle-7-testing-documentation',
      principleName: 'Testing & Documentation',
      description: 'UI component missing JSDoc documentation',
      severity: Severity.Low,
      remediationTemplate: 'Add JSDoc comment describing component purpose and props',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
    {
      id: 'missing-defensive-coding',
      principleId: 'principle-7-testing-documentation',
      principleName: 'Testing & Documentation',
      description: 'Missing defensive coding patterns (null checks, error boundaries)',
      severity: Severity.Low,
      remediationTemplate: 'Add defensive coding patterns for edge cases',
      claudeMdReference: 'CLAUDE.md:1-50',
    },
  ],
};

/**
 * Get all rules for a specific principle
 */
export function getRulesForPrinciple(principleId: string): AuditRule[] {
  return AUDIT_RULES[principleId] || [];
}

/**
 * Get rule by ID
 */
export function getRuleById(ruleId: string): AuditRule | undefined {
  for (const rules of Object.values(AUDIT_RULES)) {
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      return rule;
    }
  }
  return undefined;
}

/**
 * Get all rule IDs
 */
export function getAllRuleIds(): string[] {
  const ids: string[] = [];
  for (const rules of Object.values(AUDIT_RULES)) {
    ids.push(...rules.map((r) => r.id));
  }
  return ids;
}
