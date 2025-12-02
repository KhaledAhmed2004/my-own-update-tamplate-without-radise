/**
 * Code Action Provider - Provides quick fixes for issues
 */

import * as vscode from 'vscode';
import { DIAGNOSTIC_SOURCE } from './utils/constants';

export class CodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const codeActions: vscode.CodeAction[] = [];

    // Filter diagnostics from our extension
    const diagnostics = context.diagnostics.filter(
      (d) => d.source === DIAGNOSTIC_SOURCE
    );

    for (const diagnostic of diagnostics) {
      const issue = (diagnostic as any).issue;
      if (!issue) {
        continue;
      }

      // Generate quick fixes based on category
      switch (issue.category) {
        case 'import-order':
          codeActions.push(this.createImportOrderFix(document, diagnostic, issue));
          break;

        case 'missing-catchAsync':
        case 'error-handling':
          codeActions.push(this.createCatchAsyncFix(document, diagnostic, issue));
          break;

        case 'missing-transaction':
        case 'transaction-safety':
          codeActions.push(this.createTransactionFix(document, diagnostic, issue));
          break;

        case 'console-log':
          codeActions.push(this.createRemoveConsoleLogFix(document, diagnostic, issue));
          break;

        case 'magic-numbers':
          codeActions.push(this.createExtractConstantFix(document, diagnostic, issue));
          break;
      }

      // Always add "Learn more" action
      codeActions.push(this.createLearnMoreAction(issue));
    }

    return codeActions;
  }

  /**
   * Fix import order violations
   */
  private createImportOrderFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    issue: any
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Fix import order',
      vscode.CodeActionKind.QuickFix
    );

    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;

    // TODO: Implement actual import reordering logic
    // For now, just show a message
    fix.command = {
      command: 'seniorCodeReviewer.showImportOrderHelp',
      title: 'Show Import Order Help',
    };

    return fix;
  }

  /**
   * Add catchAsync wrapper
   */
  private createCatchAsyncFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    issue: any
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Wrap with catchAsync',
      vscode.CodeActionKind.QuickFix
    );

    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;

    const edit = new vscode.WorkspaceEdit();

    // Find the function at the diagnostic location
    const line = diagnostic.range.start.line;
    const lineText = document.lineAt(line).text;

    // Simple detection: export const functionName = async (
    const asyncFunctionMatch = lineText.match(/export\s+const\s+(\w+)\s*=\s*async\s*\(/);

    if (asyncFunctionMatch) {
      const functionName = asyncFunctionMatch[1];

      // Find the end of the function (simple heuristic: find matching closing brace)
      let endLine = line;
      let braceCount = 0;
      let started = false;

      for (let i = line; i < Math.min(line + 100, document.lineCount); i++) {
        const text = document.lineAt(i).text;

        for (const char of text) {
          if (char === '{') {
            braceCount++;
            started = true;
          } else if (char === '}') {
            braceCount--;
            if (started && braceCount === 0) {
              endLine = i;
              break;
            }
          }
        }

        if (started && braceCount === 0) {
          break;
        }
      }

      // Wrap the function with catchAsync
      const startPos = new vscode.Position(line, 0);
      const endPos = new vscode.Position(endLine, document.lineAt(endLine).text.length);

      const originalText = document.getText(new vscode.Range(startPos, endPos));

      // Extract the function body
      const functionMatch = originalText.match(/export\s+const\s+\w+\s*=\s*async\s*\((.*?)\)\s*=>\s*\{([\s\S]*)\}/);

      if (functionMatch) {
        const params = functionMatch[1];
        const body = functionMatch[2];

        const newText = `export const ${functionName} = catchAsync(async (${params}) => {${body}});`;

        edit.replace(document.uri, new vscode.Range(startPos, endPos), newText);

        // Add import for catchAsync if not present
        const documentText = document.getText();
        if (!documentText.includes('catchAsync')) {
          const importLine = "import catchAsync from '@/shared/catchAsync';\n";
          edit.insert(document.uri, new vscode.Position(0, 0), importLine);
        }

        fix.edit = edit;
      }
    }

    return fix;
  }

  /**
   * Add transaction wrapper
   */
  private createTransactionFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    issue: any
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Wrap with withTransaction',
      vscode.CodeActionKind.QuickFix
    );

    fix.diagnostics = [diagnostic];

    // TODO: Implement transaction wrapping logic
    // For now, provide guidance
    fix.command = {
      command: 'seniorCodeReviewer.showTransactionHelp',
      title: 'Show Transaction Help',
    };

    return fix;
  }

  /**
   * Remove console.log
   */
  private createRemoveConsoleLogFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    issue: any
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Remove console.log',
      vscode.CodeActionKind.QuickFix
    );

    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;

    const edit = new vscode.WorkspaceEdit();
    edit.delete(document.uri, diagnostic.range);

    fix.edit = edit;

    return fix;
  }

  /**
   * Extract magic number to constant
   */
  private createExtractConstantFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    issue: any
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      'Extract to constant',
      vscode.CodeActionKind.RefactorExtract
    );

    fix.diagnostics = [diagnostic];

    // TODO: Implement constant extraction
    fix.command = {
      command: 'seniorCodeReviewer.showConstantHelp',
      title: 'Show Constant Extraction Help',
    };

    return fix;
  }

  /**
   * Create "Learn More" action
   */
  private createLearnMoreAction(issue: any): vscode.CodeAction {
    const action = new vscode.CodeAction(
      '📚 Learn more about this issue',
      vscode.CodeActionKind.Empty
    );

    action.command = {
      command: 'vscode.open',
      title: 'Learn More',
      arguments: [vscode.Uri.parse('https://github.com/your-repo/docs#' + issue.category)],
    };

    return action;
  }
}

/**
 * Register helper commands for code actions
 */
export function registerCodeActionCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('seniorCodeReviewer.showImportOrderHelp', () => {
      vscode.window.showInformationMessage(
        'Import Order: Mongoose metrics → Auto-label → OpenTelemetry → Patches → Routes\n\nSee CLAUDE.md for details.',
        'Open CLAUDE.md'
      ).then((selection) => {
        if (selection === 'Open CLAUDE.md') {
          vscode.workspace.openTextDocument('CLAUDE.md').then((doc) => {
            vscode.window.showTextDocument(doc);
          });
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('seniorCodeReviewer.showTransactionHelp', () => {
      vscode.window.showInformationMessage(
        'Use withTransaction() for multi-step database operations involving money or critical data.\n\nExample:\nreturn withTransaction(async (session) => {\n  await Order.create([{...}], { session });\n  await Payment.create([{...}], { session });\n});',
        'Learn More'
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('seniorCodeReviewer.showConstantHelp', () => {
      vscode.window.showInformationMessage(
        'Extract magic numbers to named constants for better readability and maintainability.\n\nExample:\nconst MAX_RETRIES = 3;\nconst TIMEOUT_MS = 5000;',
        'Learn More'
      );
    })
  );
}
