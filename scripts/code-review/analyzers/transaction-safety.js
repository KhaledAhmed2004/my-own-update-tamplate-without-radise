/**
 * Transaction Safety Analyzer
 *
 * Detects missing MongoDB transaction handling in multi-step operations
 * Philosophy: Data consistency is critical - multi-step operations need ACID guarantees
 */

const fs = require('fs');
const path = require('path');
const PatternMatcher = require('../utils/pattern-matcher');

class TransactionSafetyAnalyzer {
  constructor() {
    this.issues = [];
  }

  /**
   * Main analysis function
   */
  analyze(files, rootDir) {
    this.issues = [];

    // Filter service files (where business logic lives)
    const serviceFiles = files.filter(f =>
      f.name.endsWith('.service.ts') || f.name.endsWith('.service.js')
    );

    for (const file of serviceFiles) {
      const content = fs.readFileSync(file.path, 'utf8');

      // Check for multi-step operations without transaction
      this.checkMultiStepOperations(file, content);

      // Check payment/money operations
      this.checkPaymentOperations(file, content);

      // Check loop updates
      this.checkLoopUpdates(file, content);

      // Check try-catch blocks without rollback
      this.checkErrorHandlingWithoutRollback(file, content);
    }

    return this.issues;
  }

  /**
   * Check for multiple DB operations without transaction wrapper
   */
  checkMultiStepOperations(file, content) {
    const operations = PatternMatcher.findMultiStepOperations(content);

    for (const op of operations) {
      // Check if withTransaction is used nearby
      const hasTransaction = this.hasTransactionWrapper(content, op.startLine, op.endLine);

      if (!hasTransaction && op.operationCount >= 2) {
        // Determine severity based on file
        const filePath = file.relativePath || file.path || '';
        const isCritical = filePath.includes('payment') ||
                          filePath.includes('order') ||
                          filePath.includes('transaction');

        this.issues.push({
          severity: isCritical ? 'critical' : 'architecture',
          category: 'transaction-safety',
          file: file.relativePath || file.path || 'unknown',
          line: op.startLine,
          message: `${op.operationCount} database operations without transaction wrapper`,
          impact: isCritical
            ? 'CRITICAL: Data inconsistency in production. Money/order data could be corrupted.'
            : 'Multiple operations can leave data in partial state if one fails',
          seniorSays: isCritical
            ? 'This is payment/order code. You MUST use transactions. Production data corruption is not acceptable.'
            : 'Multiple DB operations without transaction = partial updates on error. Use withTransaction().',
          fix: 'Wrap operations in withTransaction() from serviceHelpers',
          before: this.getCodeSnippet(content, op.startLine, op.endLine),
          after: this.generateTransactionExample(op),
          teaching: {
            why: 'Without transactions, if operation 2 fails, operation 1 already succeeded. Data is now inconsistent.',
            benefits: [
              'Atomic: All operations succeed or all fail',
              'Consistent: Data never in partial state',
              'Isolated: Concurrent operations don\'t interfere',
              'Durable: Committed data persists even on crash'
            ]
          }
        });
      }
    }
  }

  /**
   * Check payment/money-related operations
   */
  checkPaymentOperations(file, content) {
    const paymentOps = PatternMatcher.detectPaymentOperations(content);

    for (const op of paymentOps) {
      const hasTransaction = this.hasTransactionWrapper(content, op.line - 5, op.line + 10);

      if (!hasTransaction) {
        this.issues.push({
          severity: 'critical',
          category: 'transaction-safety',
          file: file.relativePath || file.path || 'unknown',
          line: op.line,
          message: 'Payment/money operation without transaction',
          impact: 'CRITICAL: Money could be charged but record not saved, or vice versa. Financial loss!',
          seniorSays: 'You\'re handling MONEY without transactions? That\'s a production incident waiting to happen. Wrap this in withTransaction() immediately.',
          fix: 'Use withTransaction() to ensure Stripe charge and DB save are atomic',
          cwe: 'CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization',
          productionScenario: [
            'User pays via Stripe → Success',
            'Database save fails → Error',
            'Result: Money taken, no record in DB',
            'User complains, support can\'t find payment',
            'Refund manually, reputation damaged'
          ].join('\n')
        });
      }
    }
  }

  /**
   * Check for database updates inside loops
   */
  checkLoopUpdates(file, content) {
    const loopUpdates = PatternMatcher.findLoopUpdates(content);

    for (const loop of loopUpdates) {
      const hasTransaction = this.hasTransactionWrapper(content, loop.loopLine - 5, loop.queryLine + 5);

      if (!hasTransaction) {
        this.issues.push({
          severity: 'architecture',
          category: 'transaction-safety',
          file: file.relativePath || file.path || 'unknown',
          line: loop.loopLine,
          message: 'Database updates in loop without transaction',
          impact: 'If loop iteration 3 fails, iterations 1-2 already updated. Partial state.',
          seniorSays: 'Loop updates without transaction? If it crashes halfway, half your data is updated. That\'s not acceptable.',
          fix: 'Wrap loop in withTransaction() or use bulk operations',
          loopCode: loop.loopCode,
          queryCode: loop.queryCode,
          teaching: {
            why: 'Loops execute sequentially. If iteration 5 fails, iterations 1-4 already modified the database.',
            alternatives: [
              'Use withTransaction() for consistency',
              'Use bulkWrite() for better performance',
              'Use updateMany() if all updates are identical'
            ]
          }
        });
      }
    }
  }

  /**
   * Check try-catch blocks with DB operations but no rollback
   */
  checkErrorHandlingWithoutRollback(file, content) {
    const lines = content.split('\n');
    let inTryCatch = false;
    let tryStartLine = -1;
    let dbOperationsInTry = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect try block start
      if (line.startsWith('try') && line.includes('{')) {
        inTryCatch = true;
        tryStartLine = i + 1;
        dbOperationsInTry = [];
      }

      // Detect DB operations inside try
      if (inTryCatch && !line.startsWith('//') && !line.startsWith('*')) {
        if (line.includes('await') &&
            (line.includes('.create') || line.includes('.save') ||
             line.includes('.update') || line.includes('.findOneAndUpdate') ||
             line.includes('.findByIdAndUpdate'))) {
          dbOperationsInTry.push(i + 1);
        }
      }

      // Detect catch block
      if (inTryCatch && (line.includes('} catch') || line.includes('}catch'))) {
        // Check if catch block has rollback logic
        const catchBlockEnd = this.findCatchBlockEnd(lines, i);
        const catchBlock = lines.slice(i, catchBlockEnd).join('\n');

        const hasRollback = catchBlock.includes('abortTransaction') ||
                           catchBlock.includes('rollback') ||
                           catchBlock.includes('withTransaction');

        // If multiple operations but no rollback → Issue
        if (dbOperationsInTry.length >= 2 && !hasRollback) {
          this.issues.push({
            severity: 'architecture',
            category: 'transaction-safety',
            file: file.relativePath || file.path || 'unknown',
            line: tryStartLine,
            message: `Try-catch with ${dbOperationsInTry.length} DB operations but no rollback handling`,
            impact: 'Error handling exists but doesn\'t undo partial changes. Data can be in inconsistent state.',
            seniorSays: 'You catch errors, but don\'t rollback partial changes. Use withTransaction() for automatic rollback.',
            fix: 'Replace try-catch with withTransaction() for automatic rollback',
            operationLines: dbOperationsInTry
          });
        }

        inTryCatch = false;
      }
    }
  }

  /**
   * Check if withTransaction wrapper is used in given line range
   */
  hasTransactionWrapper(content, startLine, endLine) {
    const lines = content.split('\n');
    const relevantLines = lines.slice(Math.max(0, startLine - 1), endLine);
    const relevantCode = relevantLines.join('\n');

    return relevantCode.includes('withTransaction') ||
           relevantCode.includes('startTransaction') ||
           relevantCode.includes('session');
  }

  /**
   * Find end of catch block
   */
  findCatchBlockEnd(lines, catchStartLine) {
    let braceCount = 0;
    let started = false;

    for (let i = catchStartLine; i < lines.length; i++) {
      const line = lines[i];

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }

    return catchStartLine + 10; // Fallback
  }

  /**
   * Get code snippet for display
   */
  getCodeSnippet(content, startLine, endLine) {
    const lines = content.split('\n');
    const snippet = lines.slice(startLine - 1, Math.min(endLine + 2, lines.length));
    return snippet.join('\n').trim().substring(0, 300) + '...';
  }

  /**
   * Generate transaction example for teaching
   */
  generateTransactionExample(op) {
    return `import { withTransaction } from '@/helpers/serviceHelpers';

export const yourFunction = async (data) => {
  return withTransaction(async (session) => {
    // All operations now atomic
    const result1 = await Model1.create([data], { session });
    const result2 = await Model2.create([data], { session });
    return { result1, result2 };
  }, {
    maxRetries: 3  // Retry transient errors
  });
  // ✅ If any operation fails → automatic rollback!
};`;
  }
}

module.exports = TransactionSafetyAnalyzer;
