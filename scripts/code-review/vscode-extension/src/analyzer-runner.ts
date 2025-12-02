/**
 * Analyzer Runner - Wraps the existing JavaScript CLI code reviewer
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Issue } from './types';

export class AnalyzerRunner {
  private reviewerScriptPath: string;

  constructor() {
    // Absolute path to the reviewer.js script
    this.reviewerScriptPath = 'd:/web projects/marg/my-own-update-tamplate-without-radise/scripts/code-review/reviewer.js';
  }

  /**
   * Run analyzer on a single file
   * @param filePath Absolute path to the file to analyze
   * @returns Array of issues found
   */
  async analyzeFile(filePath: string): Promise<Issue[]> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check if reviewer script exists
      if (!fs.existsSync(this.reviewerScriptPath)) {
        throw new Error(`Reviewer script not found at: ${this.reviewerScriptPath}`);
      }

      // Execute the CLI reviewer script with JSON output
      const command = `node "${this.reviewerScriptPath}" --file "${filePath}" --format json --severity critical architecture over-engineering readability maintainability security scalability pragmatism`;

      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: path.dirname(this.reviewerScriptPath),
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
      });

      // Parse JSON output
      const result = this.parseOutput(output, filePath);
      return result;

    } catch (error) {
      // Handle execution errors
      if (error instanceof Error) {
        // Check if it's a timeout
        if (error.message.includes('timeout')) {
          throw new Error(`Analysis timeout: File too large or complex`);
        }

        // Check if it's a script error
        if (error.message.includes('Command failed')) {
          // Try to extract stderr for better error message
          const stderr = (error as any).stderr?.toString() || '';
          throw new Error(`Analyzer failed: ${stderr || error.message}`);
        }

        throw error;
      }

      throw new Error(`Unknown error during analysis: ${String(error)}`);
    }
  }

  /**
   * Parse analyzer output and convert to Issue format
   */
  private parseOutput(output: string, filePath: string): Issue[] {
    try {
      // The CLI output might be wrapped or have extra text, try to extract JSON
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON found, maybe there are no issues
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Convert CLI output format to extension Issue format
      const issues: Issue[] = [];

      // Process different severity levels
      const severityLevels: Array<keyof typeof parsed> = [
        'critical',
        'architecture',
        'overEngineering',
        'quality'
      ];

      for (const level of severityLevels) {
        const levelIssues = parsed[level] || [];

        if (Array.isArray(levelIssues)) {
          for (const issue of levelIssues) {
            issues.push({
              file: filePath,
              line: issue.line || 1,
              column: issue.column || 0,
              severity: this.mapSeverity(level as string, issue.category),
              category: issue.category || level,
              message: issue.message || 'Unknown issue',
              impact: issue.impact,
              fix: issue.fix,
              code: issue.code,
              teachingMoment: issue.teachingMoment || issue.seniorSays,
              documentation: issue.documentation,
            });
          }
        }
      }

      return issues;
    } catch (error) {
      // If parsing fails, return empty array (no issues)
      console.error('Failed to parse analyzer output:', error);
      return [];
    }
  }

  /**
   * Map CLI severity/category to extension severity
   */
  private mapSeverity(level: string, category?: string): Issue['severity'] {
    // Map based on category first, then fall back to level
    const categoryMap: Record<string, Issue['severity']> = {
      'import-order': 'critical',
      'module-pattern': 'critical',
      'error-handling': 'critical',
      'transaction-safety': 'critical',
      'service-layer': 'architecture',
      'middleware-order': 'architecture',
      'premature-abstraction': 'over-engineering',
      'yagni': 'over-engineering',
      'magic-numbers': 'readability',
      'complexity': 'readability',
      'dry': 'maintainability',
      'console-log': 'maintainability',
      'missing-validation': 'security',
      'hardcoded-secrets': 'security',
      'n-plus-one': 'scalability',
      'missing-index': 'scalability',
    };

    if (category && categoryMap[category]) {
      return categoryMap[category];
    }

    // Fall back to level mapping
    const levelMap: Record<string, Issue['severity']> = {
      'critical': 'critical',
      'architecture': 'architecture',
      'overEngineering': 'over-engineering',
      'over-engineering': 'over-engineering',
      'quality': 'maintainability',
      'readability': 'readability',
      'maintainability': 'maintainability',
      'security': 'security',
      'scalability': 'scalability',
      'pragmatism': 'pragmatism',
    };

    return levelMap[level] || 'maintainability';
  }

  /**
   * Analyze multiple files
   * @param filePaths Array of absolute file paths
   * @returns Map of file path to issues
   */
  async analyzeFiles(filePaths: string[]): Promise<Map<string, Issue[]>> {
    const results = new Map<string, Issue[]>();

    for (const filePath of filePaths) {
      try {
        const issues = await this.analyzeFile(filePath);
        results.set(filePath, issues);
      } catch (error) {
        console.error(`Failed to analyze ${filePath}:`, error);
        results.set(filePath, []); // Empty array on error
      }
    }

    return results;
  }
}
