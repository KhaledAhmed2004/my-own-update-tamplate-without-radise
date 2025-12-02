/**
 * Diagnostics Provider - Manages code diagnostics (squiggly lines and Problems panel)
 */

import * as vscode from 'vscode';
import { Issue } from './types';
import { DIAGNOSTIC_SOURCE, SEVERITY_MAP } from './utils/constants';
import { AnalyzerRunner } from './analyzer-runner';
import { ConfigManager } from './config';
import { Logger } from './logger';

export class DiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private analyzer: AnalyzerRunner;
  private config: ConfigManager;
  private logger: Logger;

  constructor(config: ConfigManager, logger: Logger) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
    this.analyzer = new AnalyzerRunner();
    this.config = config;
    this.logger = logger;
  }

  /**
   * Update diagnostics for a document
   */
  async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
    const cfg = this.config.getConfig();

    // Check if extension is enabled
    if (!cfg.enabled) {
      this.logger.debug('Extension disabled, skipping diagnostics');
      return;
    }

    // Check if file should be excluded
    if (this.config.shouldExclude(document.uri.fsPath)) {
      this.logger.debug(`File excluded by pattern: ${document.uri.fsPath}`);
      return;
    }

    // Only analyze TypeScript and JavaScript files
    if (document.languageId !== 'typescript' && document.languageId !== 'javascript') {
      return;
    }

    try {
      this.logger.info(`Analyzing file: ${document.uri.fsPath}`);
      const startTime = Date.now();

      // Run analyzer
      const issues = await this.analyzer.analyzeFile(document.uri.fsPath);

      const duration = Date.now() - startTime;
      this.logger.info(`Analysis complete in ${duration}ms - Found ${issues.length} issues`);

      // Convert issues to VS Code diagnostics
      let diagnostics: vscode.Diagnostic[] = [];
      try {
        diagnostics = this.issuesToDiagnostics(issues, document);
        this.logger.debug(`Converted to ${diagnostics.length} VS Code diagnostics`);
      } catch (convertError) {
        this.logger.error(`Error converting issues to diagnostics:`, convertError as Error);
        diagnostics = [];
      }

      // Update the diagnostic collection
      try {
        this.logger.info(`Processing ${diagnostics.length} diagnostics...`);

        // Create fresh diagnostic objects to avoid any reference issues
        const cleanDiagnostics: vscode.Diagnostic[] = [];

        for (let i = 0; i < diagnostics.length; i++) {
          const d = diagnostics[i];
          if (!d || !d.range || !d.message) {
            this.logger.debug(`Skipping invalid diagnostic at index ${i}`);
            continue;
          }

          try {
            // Create a completely new diagnostic object
            const newDiag = new vscode.Diagnostic(
              new vscode.Range(
                d.range.start.line,
                d.range.start.character,
                d.range.end.line,
                d.range.end.character
              ),
              d.message,
              d.severity
            );
            newDiag.source = d.source;
            newDiag.code = d.code;

            cleanDiagnostics.push(newDiag);
          } catch (createErr) {
            this.logger.debug(`Error creating diagnostic at index ${i}: ${createErr}`);
          }
        }

        this.logger.info(`Created ${cleanDiagnostics.length} clean diagnostics`);

        // Clear and set
        this.diagnosticCollection.clear();

        if (cleanDiagnostics.length > 0) {
          this.diagnosticCollection.set(document.uri, cleanDiagnostics);
          this.logger.info(`Set ${cleanDiagnostics.length} diagnostics for ${document.uri.fsPath}`);
        }
      } catch (setError) {
        this.logger.error(`Error setting diagnostics:`, setError as Error);
      }

    } catch (error) {
      this.logger.error(`Failed to analyze file: ${document.uri.fsPath}`, error as Error);

      // Show error to user (only for critical errors)
      if (error instanceof Error && error.message.includes('not found')) {
        vscode.window.showErrorMessage(
          `Senior Code Reviewer: ${error.message}`
        );
      }
    }
  }

  /**
   * Convert analyzer issues to VS Code diagnostics
   */
  private issuesToDiagnostics(issues: Issue[], document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    if (!issues || !Array.isArray(issues)) {
      return diagnostics;
    }

    for (const issue of issues) {
      try {
        // Skip issues without valid data
        if (!issue || !issue.message) {
          continue;
        }

        // Check if this severity should be shown
        if (!this.config.shouldShowSeverity(issue.severity)) {
          continue;
        }

        // Create range for the diagnostic - handle undefined/null line
        const line = Math.max(0, (issue.line || 1) - 1); // VS Code is 0-indexed, default to line 1
        const col = issue.column || 0;

        // Get the full line to determine the range
        let range: vscode.Range;
        try {
          // Make sure line is within document bounds
          const maxLine = Math.max(0, document.lineCount - 1);
          const safeLine = Math.min(Math.max(0, line), maxLine);
          const lineText = document.lineAt(safeLine).text;
          const endCol = Math.max(1, lineText.length);
          range = new vscode.Range(safeLine, Math.min(col, endCol), safeLine, endCol);
        } catch {
          // If line is out of bounds, use a safe default
          range = new vscode.Range(0, 0, 0, 1);
        }

        // Map severity to VS Code severity
        const severity = this.mapSeverity(issue.severity);

        // Create diagnostic
        const diagnostic = new vscode.Diagnostic(
          range,
          issue.message || 'Unknown issue',
          severity
        );

        // Add additional information
        diagnostic.source = DIAGNOSTIC_SOURCE;
        diagnostic.code = issue.category || 'unknown';

        // Add related information if available
        if (issue.impact || issue.fix) {
          const relatedInfo: string[] = [];
          if (issue.impact) {
            relatedInfo.push(`Impact: ${issue.impact}`);
          }
          if (issue.fix) {
            relatedInfo.push(`Fix: ${issue.fix}`);
          }
          // Store in diagnostic for hover/quick fix use
          (diagnostic as any).relatedInformation = relatedInfo;
        }

        // Store the full issue for quick fixes and hover
        (diagnostic as any).issue = issue;

        diagnostics.push(diagnostic);
      } catch (err) {
        // Skip this issue if any error occurs
        console.error('Error processing issue:', err);
        continue;
      }
    }

    return diagnostics;
  }

  /**
   * Map issue severity to VS Code diagnostic severity
   */
  private mapSeverity(severity: string): vscode.DiagnosticSeverity {
    const severityType = SEVERITY_MAP[severity as keyof typeof SEVERITY_MAP] || 'info';

    switch (severityType) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  /**
   * Clear diagnostics for a document
   */
  clear(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Clear all diagnostics
   */
  clearAll(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Get diagnostic collection (for status bar)
   */
  getDiagnosticCollection(): vscode.DiagnosticCollection {
    return this.diagnosticCollection;
  }

  /**
   * Dispose the diagnostic collection
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
