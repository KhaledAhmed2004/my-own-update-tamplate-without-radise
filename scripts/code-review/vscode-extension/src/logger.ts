/**
 * Logger - Output channel for extension logging
 */

import * as vscode from 'vscode';
import { EXTENSION_NAME } from './utils/constants';

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private debugMode: boolean = false;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
  }

  /**
   * Set debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Log info message
   */
  info(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[INFO ${timestamp}] ${message}`);
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[WARN ${timestamp}] ${message}`);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[ERROR ${timestamp}] ${message}`);

    if (error) {
      this.outputChannel.appendLine(`  ${error.message}`);
      if (this.debugMode && error.stack) {
        this.outputChannel.appendLine(`  Stack: ${error.stack}`);
      }
    }
  }

  /**
   * Log debug message (only in debug mode)
   */
  debug(message: string): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      this.outputChannel.appendLine(`[DEBUG ${timestamp}] ${message}`);
    }
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Clear the output channel
   */
  clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Dispose the output channel
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}
