const fs = require('fs');
const PatternMatcher = require('../utils/pattern-matcher');

/**
 * Over-Engineering Analyzer
 *
 * Detects premature optimization and unnecessary complexity:
 * - Factory patterns for 2 cases
 * - Unused abstractions
 * - YAGNI violations
 */

class OverEngineeringAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];
  }

  analyze(files) {
    this.issues = [];

    this.checkPrematureAbstraction(files);
    this.checkUnnecessaryPatterns(files);

    return this.issues;
  }

  checkPrematureAbstraction(files) {
    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8');
      const abstractions = PatternMatcher.findPrematureAbstraction(content);

      for (const abstraction of abstractions) {
        this.issues.push({
          severity: 'over-engineering',
          category: 'premature-abstraction',
          file: file.relativePath,
          line: abstraction.line,
          message: `${abstraction.pattern} pattern for only ${abstraction.cases} case(s)`,
          impact: `${abstraction.pattern === 'Factory' ? '45' : '30'} lines of unnecessary complexity`,
          fix: `Replace with simple if statement until you have 3+ cases`,
          seniorSays: `You're solving a problem you don't have yet. Start simple. Refactor when you have 3+ cases.`,
          teaching: {
            principle: 'YAGNI - You Aren\'t Gonna Need It',
            when: `Add ${abstraction.pattern} WHEN you have 5+ types or complex logic`,
            why: 'Premature abstraction makes code harder to read and change'
          },
          before: `class UserTypeFactory {\n  static create(type) {\n    switch(type) {\n      case 'admin': return new AdminUser();\n      case 'user': return new RegularUser();\n    }\n  }\n}`,
          after: `const isAdmin = user.role === 'admin';`,
          linesRemoved: abstraction.pattern === 'Factory' ? 42 : 28
        });
      }
    }
  }

  checkUnnecessaryPatterns(files) {
    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8');
      const lines = content.split('\n');

      // Check for singleton where module export works
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('class') && lines[i].includes('Singleton')) {
          this.issues.push({
            severity: 'over-engineering',
            category: 'unnecessary-pattern',
            file: file.relativePath,
            line: i + 1,
            message: 'Singleton pattern where simple module export works',
            impact: 'Unnecessary boilerplate',
            fix: 'Use module.exports = { ... } instead',
            seniorSays: 'JavaScript modules are already singletons. You don\'t need this.',
            before: `class DatabaseSingleton {\n  static instance;\n  static getInstance() {\n    if (!this.instance) this.instance = new DatabaseSingleton();\n    return this.instance;\n  }\n}`,
            after: `const db = createConnection();\nmodule.exports = db;`,
            linesRemoved: 8
          });
        }
      }

      // Check for builder pattern for simple objects
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('class') && lines[i].includes('Builder')) {
          // Count properties
          let propertyCount = 0;
          for (let j = i; j < Math.min(i + 30, lines.length); j++) {
            if (lines[j].includes('this.') && lines[j].includes('=')) {
              propertyCount++;
            }
          }

          if (propertyCount <= 3) {
            this.issues.push({
              severity: 'over-engineering',
              category: 'unnecessary-pattern',
              file: file.relativePath,
              line: i + 1,
              message: `Builder pattern for object with only ${propertyCount} properties`,
              impact: 'Makes simple things complex',
              fix: 'Use object literal or simple constructor',
              seniorSays: 'Builder pattern is for objects with 10+ properties. This is overkill.',
              before: `const user = new UserBuilder()\n  .setName('John')\n  .setEmail('john@example.com')\n  .build();`,
              after: `const user = {\n  name: 'John',\n  email: 'john@example.com'\n};`
            });
          }
        }
      }

      // Check for feature flags with only 1 flag
      if (file.name.includes('feature') || file.name.includes('flag')) {
        let flagCount = 0;
        for (const line of lines) {
          if (line.includes('FEATURE_') || line.includes('FLAG_')) {
            flagCount++;
          }
        }

        if (flagCount === 1) {
          this.issues.push({
            severity: 'over-engineering',
            category: 'unnecessary-pattern',
            file: file.relativePath,
            message: 'Feature flag system with only 1 flag',
            impact: 'Infrastructure overhead for no benefit',
            fix: 'Just delete the old code',
            seniorSays: 'Just delete the old code. Version control is your feature flag.',
            teaching: {
              when: 'Use feature flags for gradual rollouts or A/B testing',
              notFor: 'Single one-time code changes'
            }
          });
        }
      }
    }
  }
}

module.exports = OverEngineeringAnalyzer;
