/**
 * Status Bar Manager - Shows issue counts in status bar
 */

import * as vscode from 'vscode';
import { SEVERITY_ICONS } from './utils/constants';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBarItem.command = 'workbench.actions.view.problems';
    this.statusBarItem.tooltip = 'Click to open Problems panel';
    this.statusBarItem.show();
  }

  /**
   * Update status bar with issue counts
   */
  update(diagnosticCollection: vscode.DiagnosticCollection): void {
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    // Count diagnostics by severity
    try {
      diagnosticCollection.forEach((uri, diagnostics) => {
        if (!diagnostics) return;
        for (const diagnostic of diagnostics) {
          if (!diagnostic || !diagnostic.range) continue;
          switch (diagnostic.severity) {
          case vscode.DiagnosticSeverity.Error:
            criticalCount++;
            break;
          case vscode.DiagnosticSeverity.Warning:
            warningCount++;
            break;
          case vscode.DiagnosticSeverity.Information:
          case vscode.DiagnosticSeverity.Hint:
            infoCount++;
            break;
        }
        }
      });
    } catch (err) {
      console.error('Error counting diagnostics:', err);
    }

    // Build status bar text
    const parts: string[] = ['🎯 Code Review:'];

    if (criticalCount > 0) {
      parts.push(`${criticalCount} ${SEVERITY_ICONS.critical}`);
    }

    if (warningCount > 0) {
      parts.push(`${warningCount} ${SEVERITY_ICONS.architecture}`);
    }

    if (infoCount > 0) {
      parts.push(`${infoCount} ${SEVERITY_ICONS['over-engineering']}`);
    }

    if (criticalCount === 0 && warningCount === 0 && infoCount === 0) {
      parts.push('✓ No issues');
      this.statusBarItem.backgroundColor = undefined;
    } else if (criticalCount > 0) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (warningCount > 0) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.backgroundColor = undefined;
    }

    this.statusBarItem.text = parts.join(' ');

    // Update tooltip
    const tooltipParts: string[] = ['Senior Code Reviewer'];
    if (criticalCount > 0) {
      tooltipParts.push(`${criticalCount} critical issues`);
    }
    if (warningCount > 0) {
      tooltipParts.push(`${warningCount} warnings`);
    }
    if (infoCount > 0) {
      tooltipParts.push(`${infoCount} suggestions`);
    }
    tooltipParts.push('Click to open Problems panel');

    this.statusBarItem.tooltip = tooltipParts.join('\n');
  }

  /**
   * Show the status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide the status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
