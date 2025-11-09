/**
 * Types related to constitutional principles and compliance
 */

import { Violation } from './audit.js';

/**
 * Represents compliance status for one constitutional principle
 */
export interface PrincipleCompliance {
  /** Principle identifier (e.g., "principle-1-design-system") */
  principleId: string;
  /** Human-readable name (e.g., "Design System Adherence") */
  principleName: string;
  /** Percentage of checks passed (0-100) */
  compliancePercentage: number;
  /** Total number of checks performed for this principle */
  totalChecks: number;
  /** Number of checks that passed */
  passedChecks: number;
  /** Number of checks that failed */
  failedChecks: number;
  /** List of violations for this principle */
  violations: Violation[];
  /** Weight in overall health score calculation (0-1) */
  weight: number;
}

/**
 * Principle weights for health score calculation
 * Total must equal 1.0
 */
export const PRINCIPLE_WEIGHTS: Record<string, number> = {
  'principle-1-design-system': 0.20,
  'principle-2-type-safety': 0.20,
  'principle-3-component-architecture': 0.20,
  'principle-4-accessibility': 0.10,
  'principle-5-performance': 0.15,
  'principle-6-state-management': 0.10,
  'principle-7-testing-documentation': 0.05,
};

/**
 * Principle metadata
 */
export interface PrincipleMetadata {
  id: string;
  name: string;
  weight: number;
  description: string;
}

/**
 * All constitutional principles with metadata
 */
export const PRINCIPLES: PrincipleMetadata[] = [
  {
    id: 'principle-1-design-system',
    name: 'Design System Adherence',
    weight: 0.20,
    description: 'Critical for dark mode support and UX consistency',
  },
  {
    id: 'principle-2-type-safety',
    name: 'Type Safety',
    weight: 0.20,
    description: 'Prevents runtime errors and improves maintainability',
  },
  {
    id: 'principle-3-component-architecture',
    name: 'Component Architecture',
    weight: 0.20,
    description: 'Prevents crashes and ensures React best practices',
  },
  {
    id: 'principle-4-accessibility',
    name: 'Accessibility',
    weight: 0.10,
    description: 'Important but subset of components',
  },
  {
    id: 'principle-5-performance',
    name: 'Performance',
    weight: 0.15,
    description: 'Affects user experience but gradual degradation',
  },
  {
    id: 'principle-6-state-management',
    name: 'State Management',
    weight: 0.10,
    description: 'Affects reliability but localized impact',
  },
  {
    id: 'principle-7-testing-documentation',
    name: 'Testing & Documentation',
    weight: 0.05,
    description: 'Important but doesn\'t affect runtime behavior',
  },
];
