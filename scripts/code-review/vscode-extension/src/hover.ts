/**
 * Hover Provider - Shows detailed information when hovering over issues
 */

import * as vscode from 'vscode';
import { SEVERITY_ICONS } from './utils/constants';

export class HoverProvider implements vscode.HoverProvider {
  constructor(private diagnosticCollection: vscode.DiagnosticCollection) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    // Get diagnostics for this document
    const diagnostics = this.diagnosticCollection.get(document.uri);
    if (!diagnostics || diagnostics.length === 0) {
      return null;
    }

    // Find diagnostic at current position
    const diagnostic = diagnostics.find((d) => d && d.range && d.range.contains(position));
    if (!diagnostic) {
      return null;
    }

    // Get the stored issue data
    const issue = (diagnostic as any).issue;
    if (!issue) {
      return new vscode.Hover(diagnostic.message);
    }

    // Build hover content
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    // Header with severity icon
    const icon = SEVERITY_ICONS[issue.severity as keyof typeof SEVERITY_ICONS] || '📝';
    markdown.appendMarkdown(`### ${icon} ${this.formatSeverity(issue.severity)}\n\n`);

    // Category
    if (issue.category) {
      markdown.appendMarkdown(`**Category:** \`${issue.category}\`\n\n`);
    }

    // Main message
    markdown.appendMarkdown(`${issue.message}\n\n`);

    // Senior Engineer Says (if available)
    if (issue.teachingMoment) {
      markdown.appendMarkdown(`---\n\n`);
      markdown.appendMarkdown(`**💭 Senior Engineer Says:**\n\n`);
      markdown.appendMarkdown(`> ${issue.teachingMoment}\n\n`);
    }

    // Impact (if available)
    if (issue.impact) {
      markdown.appendMarkdown(`---\n\n`);
      markdown.appendMarkdown(`**⚡ Impact:**\n\n`);
      markdown.appendMarkdown(`${issue.impact}\n\n`);
    }

    // Fix suggestion (if available)
    if (issue.fix) {
      markdown.appendMarkdown(`---\n\n`);
      markdown.appendMarkdown(`**🔧 Fix:**\n\n`);
      markdown.appendMarkdown(`${issue.fix}\n\n`);
    }

    // Code example (if available)
    if (issue.code) {
      markdown.appendMarkdown(`---\n\n`);
      markdown.appendMarkdown(`**📝 Example:**\n\n`);
      markdown.appendCodeblock(issue.code, 'typescript');
      markdown.appendMarkdown(`\n`);
    }

    // Documentation link (if available)
    if (issue.documentation) {
      markdown.appendMarkdown(`---\n\n`);
      markdown.appendMarkdown(`**📚 Documentation:** ${issue.documentation}\n\n`);
    }

    return new vscode.Hover(markdown);
  }

  /**
   * Format severity for display
   */
  private formatSeverity(severity: string): string {
    const map: Record<string, string> = {
      'critical': 'Critical Issue',
      'architecture': 'Architecture Warning',
      'over-engineering': 'Over-engineering',
      'readability': 'Readability',
      'maintainability': 'Maintainability',
      'security': 'Security Issue',
      'scalability': 'Scalability',
      'pragmatism': 'Pragmatic Advice',
    };

    return map[severity] || severity;
  }
}
