const fs = require('fs');
const PatternMatcher = require('../utils/pattern-matcher');

class SecurityAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];
  }

  analyze(files) {
    this.issues = [];

    this.checkValidation(files);
    this.checkHardcodedSecrets(files);

    return this.issues;
  }

  checkValidation(files) {
    const routeFiles = files.filter(f => f.name.includes('.route.'));

    for (const file of routeFiles) {
      const content = fs.readFileSync(file.path, 'utf8');
      const missing = PatternMatcher.findMissingValidation(content);

      for (const issue of missing) {
        this.issues.push({
          severity: 'security',
          category: 'missing-validation',
          file: file.relativePath,
          line: issue.line,
          message: 'Data entry route without validation',
          impact: 'Potential SQL injection, XSS, or data corruption',
          fix: 'Add validateRequest(ZodSchema) middleware',
          seniorSays: 'This route accepts ANY input. That\'s a security vulnerability.',
          before: issue.code,
          after: `router.post(\n  '/',\n  auth(),\n  validateRequest(CreateSchema),\n  Controller.create\n);`,
          cve: 'Similar to CVE-2021-3129 (unvalidated input)'
        });
      }
    }
  }

  checkHardcodedSecrets(files) {
    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf8');
      const hardcoded = PatternMatcher.findHardcodedValues(content);

      for (const item of hardcoded) {
        if (item.type === 'secret') {
          this.issues.push({
            severity: 'security',
            category: 'hardcoded-secret',
            file: file.relativePath,
            line: item.line,
            message: `Hardcoded ${item.key}: "${item.value}"`,
            impact: 'CRITICAL: Secret exposed in code repository',
            fix: 'Move to environment variables',
            seniorSays: 'Hardcoded secrets? That\'s a critical security vulnerability. Use environment variables.',
            before: item.code,
            after: item.code.replace(item.value, `process.env.${item.key.toUpperCase()}`),
            cwe: 'CWE-798: Use of Hard-coded Credentials'
          });
        }
      }
    }
  }
}

module.exports = SecurityAnalyzer;
