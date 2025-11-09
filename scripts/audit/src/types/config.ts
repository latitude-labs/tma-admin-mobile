/**
 * Configuration types for the audit tool
 */

import { Severity } from './audit.js';

/**
 * Configuration used for an audit run
 */
export interface AuditConfig {
  /** Version of constitution to audit against */
  constitutionVersion: string;
  /** Glob patterns for excluded files */
  exclude: string[];
  /** Glob patterns for included files */
  include: string[];
  /** Custom severity assignments per rule */
  severityOverrides?: Record<string, Severity>;
  /** Output formats to generate */
  reportFormats: ReportFormat[];
}

/**
 * Report output formats
 */
export enum ReportFormat {
  Markdown = 'markdown',
  JSON = 'json',
  Console = 'console'
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AuditConfig = {
  constitutionVersion: '1.0.0',
  exclude: [
    'node_modules/**',
    '.expo/**',
    '**/*.test.tsx',
    '**/*.test.ts',
    'constants/Colors.ts',
    'constants/Theme.ts',
    'scripts/**',
    'specs/**',
    '.specify/**',
  ],
  include: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'services/**/*.ts',
    'store/**/*.ts',
    'hooks/**/*.ts',
    'utils/**/*.ts',
  ],
  reportFormats: [ReportFormat.Markdown, ReportFormat.JSON],
};
