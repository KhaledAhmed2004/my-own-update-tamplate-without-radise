const fs = require('fs');
const PatternMatcher = require('../utils/pattern-matcher');

class MaintainabilityAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];
  }

  analyze(files) {
    this.issues = [];

    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8');

      // Check hardcoded values
      const hardcoded = PatternMatcher.findHardcodedValues(content);
      for (const item of hardcoded) {
        if (item.type === 'time') {
          this.issues.push({
            severity: 'maintainability',
            category: 'hardcoded-config',
            file: file.relativePath,
            line: item.line,
            message: `Hardcoded time value: ${item.value}`,
            impact: 'PM changes requirement? Edit 12 files instead of 1',
            fix: 'Extract to config/index.ts',
            seniorSays: 'Extract this to config. When PM asks to change from 3min to 5min, you\'ll edit 1 file, not 12.',
            before: `expireAt: new Date(Date.now() + 3 * 60000)`,
            after: `// In config/index.ts:\nOTP_EXPIRY_MS: 3 * 60 * 1000,\n\n// In code:\nexpireAt: new Date(Date.now() + config.OTP_EXPIRY_MS)`
          });
        }
      }

      // Check console.log
      const logs = PatternMatcher.findConsoleLogs(content);
      for (const log of logs) {
        this.issues.push({
          severity: 'maintainability',
          category: 'logging',
          file: file.relativePath,
          line: log.line,
          message: 'Using console.log instead of logger',
          impact: 'Won\'t help in production when server crashes',
          fix: 'Use logger.info() or logger.error()',
          seniorSays: 'Use logger. Console.log won\'t help in production when server crashes.',
          before: log.code,
          after: log.code.replace('console.log', 'logger.info').replace('console.error', 'logger.error')
        });
      }
    }

    return this.issues;
  }
}

module.exports = MaintainabilityAnalyzer;
