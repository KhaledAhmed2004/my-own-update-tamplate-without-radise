const fs = require('fs');

class PragmatismAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];
  }

  analyze(files) {
    this.issues = [];

    // This analyzer provides context-aware feedback
    // It knows when breaking rules is OK

    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8');

      // If it's a one-off script, relax rules
      if (file.relativePath.includes('scripts/') && !file.relativePath.includes('code-review')) {
        // Scripts can have direct queries, console.log, etc.
        continue;
      }

      // If it's in migration folder, different rules apply
      if (file.relativePath.includes('migration')) {
        // Migrations can break normal patterns
        continue;
      }

      // Payment/auth code can be "over-engineered"
      if (file.relativePath.includes('payment') || file.relativePath.includes('auth')) {
        // These are OK to have extra safety checks
        continue;
      }
    }

    return this.issues;
  }

  /**
   * Provide context-aware advice
   */
  getContextAdvice(issue, file) {
    // If it's a one-off analytics query
    if (file.relativePath.includes('analytics') || file.relativePath.includes('report')) {
      return {
        seniorSays: 'Don\'t follow rules blindly. This one-off report doesn\'t need a model method.',
        exception: true
      };
    }

    // If it's internal admin tool
    if (file.relativePath.includes('admin')) {
      return {
        seniorSays: 'Admin dashboards don\'t need the same level of abstraction as public APIs.',
        relaxed: true
      };
    }

    return null;
  }
}

module.exports = PragmatismAnalyzer;
