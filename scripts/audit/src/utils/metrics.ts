/**
 * Metrics calculation utility
 * Calculates compliance percentages, health scores, and other metrics
 */

import { PrincipleCompliance, PRINCIPLE_WEIGHTS } from '../types/principle.js';
import { SeverityCount, Violation } from '../types/audit.js';

/**
 * Calculate compliance percentage for a principle
 */
export function calculateCompliancePercentage(passedChecks: number, totalChecks: number): number {
  if (totalChecks === 0) {
    return 100; // No checks means fully compliant
  }
  return Math.round((passedChecks / totalChecks) * 100);
}

/**
 * Calculate overall health score from principle compliance
 * Uses weighted average based on principle weights
 */
export function calculateHealthScore(principles: PrincipleCompliance[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const principle of principles) {
    const weight = PRINCIPLE_WEIGHTS[principle.principleId] || 0;
    weightedSum += principle.compliancePercentage * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(weightedSum / totalWeight);
}

/**
 * Calculate severity counts from violations
 */
export function calculateSeverityCounts(violations: Violation[]): SeverityCount {
  const counts: SeverityCount = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: violations.length,
  };

  for (const violation of violations) {
    switch (violation.severity) {
      case 'critical':
        counts.critical++;
        break;
      case 'high':
        counts.high++;
        break;
      case 'medium':
        counts.medium++;
        break;
      case 'low':
        counts.low++;
        break;
    }
  }

  return counts;
}

/**
 * Find principle with lowest compliance
 */
export function findLowestCompliance(principles: PrincipleCompliance[]): string {
  if (principles.length === 0) {
    return 'N/A';
  }

  let lowest = principles[0];
  for (const principle of principles) {
    if (principle.compliancePercentage < lowest.compliancePercentage) {
      lowest = principle;
    }
  }

  return lowest.principleName;
}

/**
 * Find principle with highest compliance
 */
export function findHighestCompliance(principles: PrincipleCompliance[]): string {
  if (principles.length === 0) {
    return 'N/A';
  }

  let highest = principles[0];
  for (const principle of principles) {
    if (principle.compliancePercentage > highest.compliancePercentage) {
      highest = principle;
    }
  }

  return highest.principleName;
}

/**
 * Calculate trend direction based on health score change
 */
export function calculateTrendDirection(healthScoreChange: number): 'improving' | 'declining' | 'stable' {
  if (healthScoreChange > 1) {
    return 'improving';
  } else if (healthScoreChange < -1) {
    return 'declining';
  } else {
    return 'stable';
  }
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value}%`;
}

/**
 * Get health score status emoji
 */
export function getHealthScoreEmoji(score: number): string {
  if (score >= 90) return '🌟'; // Excellent
  if (score >= 75) return '✅';  // Good
  if (score >= 60) return '⚠️';  // Fair
  return '❌'; // Poor
}

/**
 * Get compliance status emoji
 */
export function getComplianceEmoji(percentage: number): string {
  if (percentage >= 90) return '✅';
  if (percentage >= 75) return '⚠️';
  return '❌';
}

/**
 * Get trend emoji
 */
export function getTrendEmoji(trend: 'improving' | 'declining' | 'stable'): string {
  switch (trend) {
    case 'improving':
      return '↗️';
    case 'declining':
      return '↘️';
    case 'stable':
      return '→';
  }
}

/**
 * Calculate per-principle compliance changes
 */
export function calculatePrincipleChanges(
  current: PrincipleCompliance[],
  previous: PrincipleCompliance[]
): Record<string, number> {
  const changes: Record<string, number> = {};

  for (const currentPrinciple of current) {
    const previousPrinciple = previous.find((p) => p.principleId === currentPrinciple.principleId);

    if (previousPrinciple) {
      const change = currentPrinciple.compliancePercentage - previousPrinciple.compliancePercentage;
      changes[currentPrinciple.principleId] = change;
    } else {
      changes[currentPrinciple.principleId] = 0;
    }
  }

  return changes;
}

/**
 * Get health score description
 */
export function getHealthScoreDescription(score: number): string {
  if (score >= 90) return 'Excellent - Minor issues only';
  if (score >= 75) return 'Good - Some violations to address';
  if (score >= 60) return 'Fair - Significant violations present';
  return 'Poor - Critical issues require immediate attention';
}
