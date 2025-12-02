/**
 * Configuration Manager - Handles extension settings
 */

import * as vscode from 'vscode';
import { ReviewConfig } from './types';
import { CONFIG_SECTION } from './utils/constants';

export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  /**
   * Get current configuration
   */
  getConfig(): ReviewConfig {
    return {
      enabled: this.config.get<boolean>('enabled', true),
      validateOnSave: this.config.get<boolean>('validateOnSave', true),
      validateOnType: this.config.get<boolean>('validateOnType', false),
      severity: this.config.get<string[]>('severity', [
        'critical',
        'architecture',
        'over-engineering',
        'readability',
        'maintainability',
        'security',
        'scalability',
        'pragmatism',
      ]),
      excludePatterns: this.config.get<string[]>('excludePatterns', [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/dist/**',
      ]),
      maxComplexity: this.config.get<number>('maxComplexity', 10),
      maxFunctionLines: this.config.get<number>('maxFunctionLines', 50),
      showGoodPatterns: this.config.get<boolean>('showGoodPatterns', true),
      debugMode: this.config.get<boolean>('debugMode', false),
    };
  }

  /**
   * Reload configuration (call after settings change)
   */
  reload(): void {
    this.config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  /**
   * Check if file should be excluded based on patterns
   */
  shouldExclude(filePath: string): boolean {
    const patterns = this.getConfig().excludePatterns;
    const fileName = filePath.replace(/\\/g, '/'); // Normalize path separators

    for (const pattern of patterns) {
      // Simple glob pattern matching (can be improved with minimatch library)
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');

      const regex = new RegExp(regexPattern);
      if (regex.test(fileName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if severity should be shown
   */
  shouldShowSeverity(severity: string | undefined): boolean {
    if (!severity) return true; // Show if severity is undefined
    const allowedSeverities = this.getConfig().severity;
    return allowedSeverities.includes(severity);
  }

  /**
   * Register configuration change listener
   */
  onConfigChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_SECTION)) {
        this.reload();
        callback();
      }
    });
  }
}
