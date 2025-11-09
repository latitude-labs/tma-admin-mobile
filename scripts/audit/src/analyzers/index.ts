/**
 * Base Analyzer interface and exports
 */

import { SourceFile } from 'ts-morph';
import { Violation } from '../types/audit.js';

/**
 * Base interface for all analyzers
 * Each analyzer analyzes source files for violations of a specific constitutional principle
 */
export interface Analyzer {
  /** Principle ID this analyzer checks */
  principleId: string;

  /** Human-readable principle name */
  principleName: string;

  /**
   * Analyze a source file for violations
   * @param sourceFile - The parsed TypeScript source file to analyze
   * @param filePath - Relative path to the file being analyzed
   * @returns Array of violations found in the file
   */
  analyze(sourceFile: SourceFile, filePath: string): Violation[];
}

/**
 * Base analyzer class with common utilities
 */
export abstract class BaseAnalyzer implements Analyzer {
  abstract principleId: string;
  abstract principleName: string;

  /**
   * Analyze a source file - must be implemented by subclasses
   */
  abstract analyze(sourceFile: SourceFile, filePath: string): Violation[];

  /**
   * Create a violation object
   */
  protected createViolation(params: {
    file: string;
    line: number;
    lineEnd?: number;
    column?: number;
    ruleId: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    codeSnippet?: string;
    remediationDescription: string;
    claudeMdReference?: string;
    codeExample?: string;
    estimatedEffort?: string;
  }): Violation {
    return {
      id: `${params.file}:${params.line}:${params.ruleId}`,
      file: params.file,
      line: params.line,
      lineEnd: params.lineEnd,
      column: params.column,
      principleId: this.principleId,
      ruleId: params.ruleId,
      severity: params.severity,
      message: params.message,
      codeSnippet: params.codeSnippet,
      remediation: {
        description: params.remediationDescription,
        claudeMdReference: params.claudeMdReference,
        codeExample: params.codeExample,
        autoFixAvailable: false, // Future feature
        estimatedEffort: params.estimatedEffort,
      },
    };
  }

  /**
   * Check if file should be analyzed based on file type
   */
  protected shouldAnalyze(filePath: string): boolean {
    // By default, analyze all TypeScript and TSX files
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  }
}
