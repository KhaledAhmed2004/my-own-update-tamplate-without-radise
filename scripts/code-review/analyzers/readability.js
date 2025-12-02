const fs = require('fs');
const PatternMatcher = require('../utils/pattern-matcher');

class ReadabilityAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];
  }

  analyze(files) {
    this.issues = [];

    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8');

      // Check for magic numbers
      const hardcoded = PatternMatcher.findHardcodedValues(content);
      for (const item of hardcoded) {
        if (item.type === 'number' && parseInt(item.value) > 100) {
          this.issues.push({
            severity: 'readability',
            category: 'magic-number',
            file: file.relativePath,
            line: item.line,
            message: `Magic number: ${item.value}`,
            impact: 'What does this number mean? Future you won\'t know',
            fix: 'Extract to named constant',
            seniorSays: `What's ${item.value}? Name it properly. Future you will thank you.`,
            before: item.code,
            after: `const MAX_RETRY_ATTEMPTS = ${item.value};\n// ... later:\nif (retries > MAX_RETRY_ATTEMPTS) ...`
          });
        }
      }

      // Check for clever code
      const clever = PatternMatcher.findCleverCode(content);
      for (const item of clever) {
        this.issues.push({
          severity: 'readability',
          category: 'clever-code',
          file: file.relativePath,
          line: item.line,
          message: `${item.type}: Takes 5min to understand`,
          impact: 'Clever code is BAD code',
          fix: 'Break into clear, obvious steps',
          seniorSays: 'Clever code is BAD code. Write boring, obvious code.',
          before: item.code,
          after: item.type === 'nested-ternary'
            ? '// Use if-else instead:\nlet result;\nif (condition1) {\n  result = value1;\n} else if (condition2) {\n  result = value2;\n} else {\n  result = value3;\n}'
            : '// Break into smaller steps with descriptive variable names'
        });
      }
    }

    return this.issues;
  }
}

module.exports = ReadabilityAnalyzer;
