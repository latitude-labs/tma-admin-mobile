/**
 * Configuration loader
 * Loads and merges audit configuration from .auditrc.json with defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import { AuditConfig, DEFAULT_CONFIG, ReportFormat } from '../types/config.js';

/**
 * Load audit configuration from .auditrc.json or use defaults
 */
export function loadConfig(configPath?: string): AuditConfig {
  const cwd = process.cwd();
  const defaultConfigPath = path.join(cwd, '.auditrc.json');
  const resolvedPath = configPath || defaultConfigPath;

  // If config file doesn't exist, use defaults
  if (!fs.existsSync(resolvedPath)) {
    console.log('No .auditrc.json found, using default configuration');
    return { ...DEFAULT_CONFIG };
  }

  try {
    const configContent = fs.readFileSync(resolvedPath, 'utf-8');
    const userConfig = JSON.parse(configContent);

    // Merge with defaults
    const mergedConfig: AuditConfig = {
      constitutionVersion: userConfig.constitutionVersion || DEFAULT_CONFIG.constitutionVersion,
      exclude: userConfig.exclude || DEFAULT_CONFIG.exclude,
      include: userConfig.include || DEFAULT_CONFIG.include,
      severityOverrides: userConfig.severityOverrides || {},
      reportFormats: parseReportFormats(userConfig.reportFormats) || DEFAULT_CONFIG.reportFormats,
    };

    return mergedConfig;
  } catch (error) {
    console.error(`Error loading config from ${resolvedPath}:`, error);
    console.log('Falling back to default configuration');
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Parse report formats from config
 */
function parseReportFormats(formats: string[] | undefined): ReportFormat[] | undefined {
  if (!formats) {
    return undefined;
  }

  const validFormats: ReportFormat[] = [];

  for (const format of formats) {
    switch (format.toLowerCase()) {
      case 'markdown':
        validFormats.push(ReportFormat.Markdown);
        break;
      case 'json':
        validFormats.push(ReportFormat.JSON);
        break;
      case 'console':
        validFormats.push(ReportFormat.Console);
        break;
      default:
        console.warn(`Unknown report format: ${format}, skipping`);
    }
  }

  return validFormats;
}

/**
 * Save config to file
 */
export function saveConfig(config: AuditConfig, configPath?: string): void {
  const cwd = process.cwd();
  const defaultConfigPath = path.join(cwd, '.auditrc.json');
  const resolvedPath = configPath || defaultConfigPath;

  try {
    const configContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(resolvedPath, configContent, 'utf-8');
    console.log(`Configuration saved to ${resolvedPath}`);
  } catch (error) {
    console.error(`Error saving config to ${resolvedPath}:`, error);
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: AuditConfig): string[] {
  const errors: string[] = [];

  if (!config.constitutionVersion) {
    errors.push('constitutionVersion is required');
  }

  if (!config.include || config.include.length === 0) {
    errors.push('include patterns must be specified');
  }

  if (!config.exclude) {
    errors.push('exclude patterns must be specified');
  }

  if (!config.reportFormats || config.reportFormats.length === 0) {
    errors.push('at least one report format must be specified');
  }

  return errors;
}
