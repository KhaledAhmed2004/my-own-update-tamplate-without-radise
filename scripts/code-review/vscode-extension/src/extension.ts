/**
 * Senior Code Reviewer VS Code Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { DiagnosticsProvider } from './diagnostics';
import { StatusBarManager } from './statusBar';
import { ConfigManager } from './config';
import { Logger } from './logger';
import { HoverProvider } from './hover';
import { CodeActionProvider, registerCodeActionCommands } from './codeActions';

let diagnosticsProvider: DiagnosticsProvider;
let statusBarManager: StatusBarManager;
let configManager: ConfigManager;
let logger: Logger;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  logger = new Logger();
  logger.info('Senior Code Reviewer extension activating...');

  // Initialize managers
  configManager = new ConfigManager();
  diagnosticsProvider = new DiagnosticsProvider(configManager, logger);
  statusBarManager = new StatusBarManager();

  // Set debug mode from config
  const config = configManager.getConfig();
  logger.setDebugMode(config.debugMode);

  logger.info(`Extension enabled: ${config.enabled}`);
  logger.info(`Validate on save: ${config.validateOnSave}`);
  logger.info(`Validate on type: ${config.validateOnType}`);

  // Register file save event
  if (config.validateOnSave) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (config.enabled) {
          try {
            await diagnosticsProvider.updateDiagnostics(document);
            updateStatusBar();
          } catch (err) {
            logger.error('Error in save handler:', err as Error);
          }
        }
      })
    );

    logger.debug('Registered onDidSaveTextDocument listener');
  }

  // Register document open event (analyze when file is opened)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && config.enabled && config.validateOnSave) {
        try {
          await diagnosticsProvider.updateDiagnostics(editor.document);
          updateStatusBar();
        } catch (err) {
          logger.error('Error in editor change handler:', err as Error);
        }
      }
    })
  );

  // Register configuration change listener
  context.subscriptions.push(
    configManager.onConfigChange(() => {
      const newConfig = configManager.getConfig();
      logger.setDebugMode(newConfig.debugMode);
      logger.info('Configuration changed, reloading...');

      // Clear and re-analyze all open documents
      diagnosticsProvider.clearAll();
      if (newConfig.enabled && vscode.window.activeTextEditor) {
        diagnosticsProvider.updateDiagnostics(vscode.window.activeTextEditor.document);
        updateStatusBar();
      }
    })
  );

  // Register commands
  registerCommands(context);
  registerCodeActionCommands(context);

  // Register hover provider
  const diagnosticCollection = diagnosticsProvider.getDiagnosticCollection();
  const hoverProvider = new HoverProvider(diagnosticCollection);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      ['typescript', 'javascript'],
      hoverProvider
    )
  );
  logger.debug('Registered hover provider');

  // Register code action provider
  const codeActionProvider = new CodeActionProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      ['typescript', 'javascript'],
      codeActionProvider,
      {
        providedCodeActionKinds: [
          vscode.CodeActionKind.QuickFix,
          vscode.CodeActionKind.RefactorExtract,
        ],
      }
    )
  );
  logger.debug('Registered code action provider');

  // Analyze current file if one is open
  if (vscode.window.activeTextEditor && config.enabled) {
    diagnosticsProvider.updateDiagnostics(vscode.window.activeTextEditor.document);
    updateStatusBar();
  }

  // Add disposables
  context.subscriptions.push(diagnosticsProvider);
  context.subscriptions.push(statusBarManager);
  context.subscriptions.push(logger);

  logger.info('Senior Code Reviewer extension activated successfully!');
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Command: Review Current File
  context.subscriptions.push(
    vscode.commands.registerCommand('seniorCodeReviewer.reviewCurrentFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active file to review');
        return;
      }

      logger.info('Command: Review Current File');
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Senior Code Reviewer',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Analyzing file...' });
          await diagnosticsProvider.updateDiagnostics(editor.document);
          updateStatusBar();
          progress.report({ message: 'Analysis complete!' });
        }
      );
    })
  );

  // Command: Review Entire Workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('seniorCodeReviewer.reviewWorkspace', async () => {
      logger.info('Command: Review Workspace');

      const files = await vscode.workspace.findFiles(
        '**/*.{ts,js}',
        '**/node_modules/**'
      );

      if (files.length === 0) {
        vscode.window.showInformationMessage('No TypeScript/JavaScript files found in workspace');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Senior Code Reviewer',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: `Analyzing ${files.length} files...` });

          let analyzed = 0;
          for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            await diagnosticsProvider.updateDiagnostics(document);

            analyzed++;
            progress.report({
              message: `Analyzed ${analyzed}/${files.length} files...`,
              increment: (100 / files.length),
            });
          }

          updateStatusBar();
          vscode.window.showInformationMessage(
            `Senior Code Reviewer: Analyzed ${files.length} files`
          );
        }
      );
    })
  );

  // Command: Clear Cache
  context.subscriptions.push(
    vscode.commands.registerCommand('seniorCodeReviewer.clearCache', () => {
      logger.info('Command: Clear Cache');
      diagnosticsProvider.clearAll();
      updateStatusBar();
      vscode.window.showInformationMessage('Senior Code Reviewer: Cache cleared');
    })
  );

  // Command: Fix All Issues (placeholder for future implementation)
  context.subscriptions.push(
    vscode.commands.registerCommand('seniorCodeReviewer.fixAllIssues', () => {
      logger.info('Command: Fix All Issues');
      vscode.window.showInformationMessage(
        'Fix All Issues: Coming in next version! Use Quick Fixes (Ctrl+.) for now.'
      );
    })
  );

  logger.debug('Commands registered successfully');
}

/**
 * Update status bar with current diagnostic counts
 */
function updateStatusBar() {
  if (statusBarManager && diagnosticsProvider) {
    const collection = diagnosticsProvider.getDiagnosticCollection();
    statusBarManager.update(collection);
  }
}

/**
 * Extension deactivation
 */
export function deactivate() {
  logger.info('Senior Code Reviewer extension deactivating...');
}
