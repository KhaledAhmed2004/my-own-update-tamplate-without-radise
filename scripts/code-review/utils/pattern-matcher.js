const fs = require('fs');

/**
 * Pattern Matcher Utility
 *
 * Detects code patterns without AST parsing
 * Uses regex and simple string matching for zero dependencies
 */

class PatternMatcher {
  /**
   * Check if file has specific import
   */
  static hasImport(content, importPath) {
    const patterns = [
      new RegExp(`import.*from ['"]${importPath}['"]`, 'g'),
      new RegExp(`require\\(['"]${importPath}['"]\\)`, 'g')
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Get import order
   */
  static getImportOrder(content) {
    const imports = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match import statements
      const importMatch = line.match(/import\s+.*\s+from\s+['"](.+)['"]/);
      if (importMatch) {
        imports.push({
          line: i + 1,
          path: importMatch[1],
          full: line
        });
      }

      // Match require statements
      const requireMatch = line.match(/require\(['"](.+)['"]\)/);
      if (requireMatch) {
        imports.push({
          line: i + 1,
          path: requireMatch[1],
          full: line
        });
      }
    }

    return imports;
  }

  /**
   * Find direct DB queries in file
   */
  static findDirectQueries(content) {
    const queries = [];
    const lines = content.split('\n');

    const queryPatterns = [
      /(\w+Model|\w+)\.(find|findOne|findById|create|updateOne|deleteOne|aggregate)\(/g,
      /await\s+(\w+)\.(find|findOne|findById)/g
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of queryPatterns) {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          queries.push({
            line: i + 1,
            code: line.trim(),
            model: match[1],
            method: match[2] || match[1]
          });
        }
      }
    }

    return queries;
  }

  /**
   * Find hardcoded values
   */
  static findHardcodedValues(content) {
    const hardcoded = [];
    const lines = content.split('\n');

    // Patterns for hardcoded values
    const patterns = {
      time: /(\d+)\s*\*\s*(\d+)/g,  // 3 * 60000
      numbers: /:\s*(\d{4,})/g,      // : 3600000
      strings: /(password|secret|key):\s*['"](.+?)['"]/gi,
      urls: /(http:\/\/|https:\/\/)[\w.-]+/g
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        continue;
      }

      // Check time calculations
      const timeMatches = line.matchAll(patterns.time);
      for (const match of timeMatches) {
        if (parseInt(match[1]) >= 60 || parseInt(match[2]) >= 1000) {
          hardcoded.push({
            line: i + 1,
            type: 'time',
            code: line.trim(),
            value: match[0]
          });
        }
      }

      // Check large numbers
      const numberMatches = line.matchAll(patterns.numbers);
      for (const match of numberMatches) {
        hardcoded.push({
          line: i + 1,
          type: 'number',
          code: line.trim(),
          value: match[1]
        });
      }

      // Check hardcoded secrets
      const secretMatches = line.matchAll(patterns.strings);
      for (const match of secretMatches) {
        if (match[2].length > 5 && !match[2].includes('process.env')) {
          hardcoded.push({
            line: i + 1,
            type: 'secret',
            code: line.trim(),
            key: match[1],
            value: match[2]
          });
        }
      }
    }

    return hardcoded;
  }

  /**
   * Find console.log statements
   */
  static findConsoleLogs(content) {
    const logs = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('console.log') || line.includes('console.error')) {
        logs.push({
          line: i + 1,
          code: line.trim()
        });
      }
    }

    return logs;
  }

  /**
   * Check if function is too complex (simple heuristic)
   */
  static checkComplexity(content, functionName) {
    const lines = content.split('\n');
    let inFunction = false;
    let braceCount = 0;
    let lineCount = 0;
    let ifCount = 0;
    let loopCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if entering function
      if (trimmed.includes(`function ${functionName}`) ||
          trimmed.includes(`${functionName} = `) ||
          trimmed.includes(`const ${functionName}`) ||
          trimmed.includes(`async ${functionName}`)) {
        inFunction = true;
      }

      if (inFunction) {
        lineCount++;

        // Count braces
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        // Count complexity indicators
        if (trimmed.includes('if') || trimmed.includes('switch')) ifCount++;
        if (trimmed.includes('for') || trimmed.includes('while')) loopCount++;

        // Function ended
        if (braceCount === 0 && lineCount > 1) {
          break;
        }
      }
    }

    // Cyclomatic complexity approximation
    const complexity = 1 + ifCount + loopCount;

    return {
      lines: lineCount,
      complexity,
      ifStatements: ifCount,
      loops: loopCount,
      isComplex: complexity > 10 || lineCount > 50
    };
  }

  /**
   * Find missing validation on routes
   */
  static findMissingValidation(content) {
    const issues = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check POST/PUT routes without validateRequest
      if ((line.includes('.post(') || line.includes('.put(') || line.includes('.patch(')) &&
          !line.includes('validateRequest')) {

        // Look ahead for validateRequest in next 5 lines
        let hasValidation = false;
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].includes('validateRequest')) {
            hasValidation = true;
            break;
          }
        }

        if (!hasValidation) {
          issues.push({
            line: i + 1,
            code: line.trim()
          });
        }
      }
    }

    return issues;
  }

  /**
   * Find potential N+1 queries
   */
  static findN1Queries(content) {
    const issues = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for loops with DB queries inside
      if (line.includes('for') || line.includes('forEach') || line.includes('.map(')) {
        // Look ahead for DB queries in next 10 lines
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j];

          if (nextLine.includes('.find') || nextLine.includes('.findOne') ||
              nextLine.includes('.findById')) {
            issues.push({
              line: i + 1,
              loopLine: line.trim(),
              queryLine: j + 1,
              queryCode: nextLine.trim()
            });
            break;
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check for premature abstraction (factory for 2 cases)
   */
  static findPrematureAbstraction(content) {
    const issues = [];
    const lines = content.split('\n');

    // Find factory pattern
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('Factory') || line.includes('Builder') ||
          line.includes('Strategy') || line.includes('Adapter')) {

        // Count how many cases it handles
        let caseCount = 0;
        for (let j = i; j < Math.min(i + 50, lines.length); j++) {
          if (lines[j].includes('case ') || lines[j].includes('if (type ===')) {
            caseCount++;
          }
        }

        if (caseCount <= 2) {
          issues.push({
            line: i + 1,
            pattern: line.includes('Factory') ? 'Factory' :
                     line.includes('Builder') ? 'Builder' :
                     line.includes('Strategy') ? 'Strategy' : 'Adapter',
            cases: caseCount,
            code: line.trim()
          });
        }
      }
    }

    return issues;
  }

  /**
   * Find clever/complex one-liners
   */
  static findCleverCode(content) {
    const issues = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (line.startsWith('//') || line.startsWith('*') || !line) {
        continue;
      }

      // Check for nested ternaries
      const ternaryCount = (line.match(/\?/g) || []).length;
      if (ternaryCount >= 2) {
        issues.push({
          line: i + 1,
          type: 'nested-ternary',
          code: line
        });
      }

      // Check for chained method calls (5+)
      const chainCount = (line.match(/\./g) || []).length;
      if (chainCount >= 5) {
        issues.push({
          line: i + 1,
          type: 'long-chain',
          code: line
        });
      }

      // Check for complex regex
      if (line.includes('RegExp') || line.includes('/') &&
          line.length > 80 && line.includes('[') && line.includes('+')) {
        issues.push({
          line: i + 1,
          type: 'complex-regex',
          code: line
        });
      }
    }

    return issues;
  }

  /**
   * Check if class follows 6-file module pattern
   */
  static checkModulePattern(modulePath) {
    const requiredFiles = [
      'interface.ts',
      'model.ts',
      'controller.ts',
      'service.ts',
      'route.ts',
      'validation.ts'
    ];

    const fs = require('fs');
    const path = require('path');

    const moduleName = path.basename(modulePath);
    const missing = [];

    for (const file of requiredFiles) {
      const fullPath = path.join(modulePath, `${moduleName}.${file}`);
      if (!fs.existsSync(fullPath)) {
        missing.push(file);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Find multi-step database operations
   * Detects functions with 2+ DB write operations
   */
  static findMultiStepOperations(content) {
    const operations = [];
    const lines = content.split('\n');

    // Write operations to look for
    const writePatterns = [
      '.create(',
      '.save(',
      '.update(',
      '.updateOne(',
      '.updateMany(',
      '.findOneAndUpdate(',
      '.findByIdAndUpdate(',
      '.delete',
      '.remove(',
      '.insertOne(',
      '.insertMany('
    ];

    // Track functions and their operations
    let currentFunction = null;
    let functionStartLine = -1;
    let braceCount = 0;
    let operationsInFunction = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
        continue;
      }

      // Detect function start
      if ((trimmed.includes('async') && (trimmed.includes('function') || trimmed.includes('const'))) ||
          (trimmed.includes('export') && trimmed.includes('async'))) {
        currentFunction = trimmed;
        functionStartLine = i + 1;
        braceCount = 0;
        operationsInFunction = [];
      }

      if (currentFunction) {
        // Count braces to track function scope
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        // Check for write operations
        for (const pattern of writePatterns) {
          if (line.includes('await') && line.includes(pattern)) {
            operationsInFunction.push({
              line: i + 1,
              operation: pattern,
              code: trimmed
            });
          }
        }

        // Function ended
        if (braceCount === 0 && operationsInFunction.length >= 2) {
          operations.push({
            functionName: currentFunction,
            startLine: functionStartLine,
            endLine: i + 1,
            operationCount: operationsInFunction.length,
            operations: operationsInFunction
          });

          currentFunction = null;
        } else if (braceCount === 0) {
          currentFunction = null;
        }
      }
    }

    return operations;
  }

  /**
   * Detect payment/money-related operations
   */
  static detectPaymentOperations(content) {
    const paymentOps = [];
    const lines = content.split('\n');

    const moneyKeywords = [
      'stripe',
      'payment',
      'charge',
      'refund',
      'price',
      'amount',
      'money',
      'transaction',
      'invoice',
      'billing',
      'checkout'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
        continue;
      }

      // Check if line has money-related keywords AND database operation
      const hasMoneyKeyword = moneyKeywords.some(keyword => line.includes(keyword));
      const hasDbOperation = trimmed.includes('.create') ||
                            trimmed.includes('.save') ||
                            trimmed.includes('.update') ||
                            trimmed.includes('.findoneandupdate') ||
                            trimmed.includes('.findbyidandupdate');

      if (hasMoneyKeyword && (hasDbOperation || line.includes('await'))) {
        paymentOps.push({
          line: i + 1,
          code: lines[i].trim(),
          keywords: moneyKeywords.filter(k => line.includes(k))
        });
      }
    }

    return paymentOps;
  }

  /**
   * Find database updates inside loops
   */
  static findLoopUpdates(content) {
    const loopUpdates = [];
    const lines = content.split('\n');

    const updatePatterns = [
      '.update(',
      '.updateOne(',
      '.updateMany(',
      '.findOneAndUpdate(',
      '.findByIdAndUpdate(',
      '.save(',
      '.create(',
      '.delete(',
      '.remove('
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
        continue;
      }

      // Detect loop
      if (trimmed.includes('for (') || trimmed.includes('for(') ||
          trimmed.includes('.forEach(') || trimmed.includes('.map(') ||
          trimmed.includes('while (') || trimmed.includes('while(')) {

        // Look ahead for update operations in next 15 lines
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          const nextLine = lines[j];

          for (const pattern of updatePatterns) {
            if (nextLine.includes('await') && nextLine.includes(pattern)) {
              loopUpdates.push({
                loopLine: i + 1,
                loopCode: trimmed,
                queryLine: j + 1,
                queryCode: nextLine.trim()
              });
              break;
            }
          }
        }
      }
    }

    return loopUpdates;
  }
}

module.exports = PatternMatcher;
