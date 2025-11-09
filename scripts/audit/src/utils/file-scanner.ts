/**
 * File scanner utility using glob
 * Handles file discovery with inclusion and exclusion patterns
 */

import { glob } from 'glob';
import * as path from 'path';

/**
 * File scanner for discovering source files to audit
 */
export class FileScanner {
  private includePatterns: string[];
  private excludePatterns: string[];
  private cwd: string;

  constructor(includePatterns: string[], excludePatterns: string[], cwd: string = process.cwd()) {
    this.includePatterns = includePatterns;
    this.excludePatterns = excludePatterns;
    this.cwd = cwd;
  }

  /**
   * Scan for files matching include patterns and not matching exclude patterns
   */
  async scan(): Promise<string[]> {
    const allFiles: Set<string> = new Set();

    // Process each include pattern
    for (const pattern of this.includePatterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.cwd,
          ignore: this.excludePatterns,
          absolute: false,
          nodir: true,
        });

        files.forEach((file) => allFiles.add(file));
      } catch (error) {
        console.error(`Error scanning pattern ${pattern}:`, error);
      }
    }

    // Convert to array and sort for consistent ordering
    const fileList = Array.from(allFiles).sort();

    return fileList;
  }

  /**
   * Scan for files and return absolute paths
   */
  async scanAbsolute(): Promise<string[]> {
    const relativeFiles = await this.scan();
    return relativeFiles.map((file) => path.resolve(this.cwd, file));
  }

  /**
   * Check if a file should be excluded
   */
  shouldExclude(filePath: string): boolean {
    const relativePath = path.relative(this.cwd, filePath);

    for (const pattern of this.excludePatterns) {
      // Simple pattern matching - could be enhanced with minimatch if needed
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a file matches an include pattern
   */
  shouldInclude(filePath: string): boolean {
    const relativePath = path.relative(this.cwd, filePath);

    for (const pattern of this.includePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching for glob patterns
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Get file extension
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Check if file is TypeScript/TSX
   */
  static isTypeScriptFile(filePath: string): boolean {
    const ext = this.getExtension(filePath);
    return ['.ts', '.tsx'].includes(ext);
  }

  /**
   * Get relative path from cwd
   */
  getRelativePath(filePath: string): string {
    return path.relative(this.cwd, filePath);
  }
}
