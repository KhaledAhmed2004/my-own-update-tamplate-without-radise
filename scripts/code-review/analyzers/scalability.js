const fs = require('fs');
const PatternMatcher = require('../utils/pattern-matcher');

class ScalabilityAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];
  }

  analyze(files) {
    this.issues = [];

    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8');

      // Check for N+1 queries
      const n1Issues = PatternMatcher.findN1Queries(content);
      for (const issue of n1Issues) {
        this.issues.push({
          severity: 'scalability',
          category: 'n+1-query',
          file: file.relativePath,
          line: issue.line,
          message: 'Potential N+1 query pattern',
          impact: 'This N+1 query will crash production with 500+ users',
          fix: 'Use aggregation or populate',
          seniorSays: 'This N+1 query will crash production with 500+ users. Use aggregation or populate.',
          before: `for (const user of users) {\n  const tasks = await Task.find({ userId: user.id });\n}`,
          after: `// Use aggregation:\nconst usersWithTasks = await User.aggregate([\n  { $lookup: { from: 'tasks', localField: '_id', foreignField: 'userId', as: 'tasks' } }\n]);`,
          loopCode: issue.loopLine,
          queryCode: issue.queryCode
        });
      }
    }

    return this.issues;
  }
}

module.exports = ScalabilityAnalyzer;
