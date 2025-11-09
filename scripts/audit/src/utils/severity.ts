/**
 * Severity classification utility
 * Assigns severity levels to violations based on rule IDs and context
 */

import { Severity } from '../types/audit.js';

/**
 * Rule severity mapping
 * Defines default severity for each rule ID
 */
export const RULE_SEVERITY_MAP: Record<string, Severity> = {
  // Critical: Causes runtime crashes or errors
  'hooks-in-loops': Severity.Critical,
  'hooks-in-map': Severity.Critical,
  'missing-text-fallback': Severity.Critical,
  'undefined-text-render': Severity.Critical,
  'conditional-text-render': Severity.Critical,

  // High: Breaks core functionality or UX
  'missing-use-theme-colors': Severity.High,
  'hardcoded-colors': Severity.High,
  'missing-accessibility-label': Severity.High,
  'broken-theme-support': Severity.High,
  'missing-haptic-feedback': Severity.High,
  'missing-loading-states': Severity.High,
  'any-type-usage': Severity.High,

  // Medium: Maintainability and performance issues
  'missing-use-memo-styles': Severity.Medium,
  'large-component': Severity.Medium,
  'missing-error-handling': Severity.Medium,
  'missing-flatlist-optimization': Severity.Medium,
  'inline-render-functions': Severity.Medium,
  'missing-interface': Severity.Medium,
  'missing-zustand-interface': Severity.Medium,
  'missing-persistence': Severity.Medium,

  // Low: Style inconsistencies and documentation gaps
  'missing-jsdoc': Severity.Low,
  'missing-defensive-coding': Severity.Low,
  'style-inconsistency': Severity.Low,
};

/**
 * Context for violation severity classification
 */
export interface ViolationContext {
  principleId: string;
  ruleId: string;
  file: string;
  isComponentFile?: boolean;
  isHookFile?: boolean;
  isUtilityFile?: boolean;
}

/**
 * Classify severity for a violation
 */
export function classifySeverity(context: ViolationContext, overrides?: Record<string, Severity>): Severity {
  // Check for custom overrides first
  if (overrides && context.ruleId in overrides) {
    return overrides[context.ruleId];
  }

  // Use default severity mapping
  if (context.ruleId in RULE_SEVERITY_MAP) {
    return RULE_SEVERITY_MAP[context.ruleId];
  }

  // Default to medium if rule not found
  console.warn(`Unknown rule ID: ${context.ruleId}, defaulting to Medium severity`);
  return Severity.Medium;
}

/**
 * Get severity display name
 */
export function getSeverityDisplayName(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

/**
 * Get severity emoji for console output
 */
export function getSeverityEmoji(severity: Severity): string {
  switch (severity) {
    case Severity.Critical:
      return '🔴';
    case Severity.High:
      return '🟠';
    case Severity.Medium:
      return '🟡';
    case Severity.Low:
      return '🟢';
    default:
      return '⚪';
  }
}

/**
 * Get severity sort order (for prioritization)
 */
export function getSeverityOrder(severity: Severity): number {
  switch (severity) {
    case Severity.Critical:
      return 1;
    case Severity.High:
      return 2;
    case Severity.Medium:
      return 3;
    case Severity.Low:
      return 4;
    default:
      return 5;
  }
}

/**
 * Compare two severities for sorting (higher severity first)
 */
export function compareSeverity(a: Severity, b: Severity): number {
  return getSeverityOrder(a) - getSeverityOrder(b);
}
