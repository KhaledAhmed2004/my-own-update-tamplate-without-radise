#!/usr/bin/env node

const path = require('path');
const FileScanner = require('./utils/file-scanner');
const CriticalRulesAnalyzer = require('./analyzers/critical-rules');
const ArchitectureAnalyzer = require('./analyzers/architecture');
const OverEngineeringAnalyzer = require('./analyzers/over-engineering');
const ReadabilityAnalyzer = require('./analyzers/readability');
const MaintainabilityAnalyzer = require('./analyzers/maintainability');
const SecurityAnalyzer = require('./analyzers/security');
const ScalabilityAnalyzer = require('./analyzers/scalability');
const PragmatismAnalyzer = require('./analyzers/pragmatism');
const TransactionSafetyAnalyzer = require('./analyzers/transaction-safety');
const NamingConventionAnalyzer = require('./analyzers/naming-conventions');
const ConsoleReporter = require('./reporters/console-reporter');

/**
 * Senior Engineer Code Reviewer
 *
 * Main CLI entry point
 * Philosophy: Thorough, practical, pragmatic - like a top 1% senior engineer
 */

class CodeReviewer {
  constructor(options = {}) {
    this.options = {
      rootDir: options.rootDir || process.cwd(),
      module: options.module || null,
      file: options.file || null,
      severity: options.severity || ['critical', 'architecture', 'over-engineering', 'quality'],
      format: options.format || 'console',
      ci: options.ci || false,
      verbose: options.verbose || false,
      ...options
    };

    this.scanner = new FileScanner({ rootDir: this.options.rootDir });
    this.results = {
      critical: [],
      architecture: [],
      overEngineering: [],
      quality: [],
      security: [],
      scalability: [],
      pragmatism: [],
      goodPatterns: [],
      stats: {}
    };
  }

  /**
   * Main review function
   */
  async review() {
    console.log('🎯 Starting code review...\n');

    // Scan files
    const files = this.getFilesToReview();
    console.log(`📂 Found ${files.length} files to review\n`);

    if (files.length === 0) {
      console.log('❌ No files found to review');
      return;
    }

    // Get stats
    this.results.stats = this.scanner.getStats(files);

    // Run analyzers
    console.log('🔍 Running analyzers...\n');
    await this.runAnalyzers(files);

    // Detect good patterns
    this.detectGoodPatterns(files);

    // Generate report
    this.generateReport();

    // CI mode exit code
    if (this.options.ci) {
      const criticalCount = this.results.critical.length;
      if (criticalCount > 0) {
        console.log(`\n❌ CI Mode: Found ${criticalCount} critical issues. Failing build.`);
        process.exit(1);
      } else {
        console.log('\n✅ CI Mode: No critical issues found. Build passing.');
        process.exit(0);
      }
    }
  }

  /**
   * Get files to review based on options
   */
  getFilesToReview() {
    if (this.options.file) {
      // Review specific file
      const fullPath = path.resolve(this.options.rootDir, this.options.file);
      return [{
        path: fullPath,
        relativePath: this.options.file,
        name: path.basename(this.options.file),
        ext: path.extname(this.options.file)
      }];
    }

    if (this.options.module) {
      // Review specific module
      return this.scanner.findInModule(this.options.module);
    }

    // Review all src files
    return this.scanner.scanDirectory('src');
  }

  /**
   * Run all analyzers
   */
  async runAnalyzers(files) {
    const analyzers = [
      { name: 'Critical Rules', analyzer: new CriticalRulesAnalyzer(), key: 'critical' },
      { name: 'Architecture', analyzer: new ArchitectureAnalyzer(), key: 'architecture' },
      { name: 'Transaction Safety', analyzer: new TransactionSafetyAnalyzer(), key: 'transaction' },
      { name: 'Over-Engineering', analyzer: new OverEngineeringAnalyzer(), key: 'overEngineering' },
      { name: 'Readability', analyzer: new ReadabilityAnalyzer(), key: 'quality' },
      { name: 'Maintainability', analyzer: new MaintainabilityAnalyzer(), key: 'quality' },
      { name: 'Security', analyzer: new SecurityAnalyzer(), key: 'security' },
      { name: 'Scalability', analyzer: new ScalabilityAnalyzer(), key: 'scalability' },
      { name: 'Pragmatism', analyzer: new PragmatismAnalyzer(), key: 'pragmatism' },
      { name: 'Naming Conventions', analyzer: new NamingConventionAnalyzer(), key: 'quality' }
    ];

    for (const { name, analyzer, key } of analyzers) {
      if (this.options.verbose) {
        console.log(`  ⏳ Running ${name} analyzer...`);
      }

      const issues = analyzer.analyze(files, this.options.rootDir);

      // Categorize issues
      if (key === 'quality') {
        this.results.quality.push(...issues);
      } else if (key === 'security') {
        this.results.critical.push(...issues);
      } else if (key === 'scalability') {
        this.results.architecture.push(...issues);
      } else if (key === 'transaction') {
        // Transaction issues can be critical or architecture based on severity
        for (const issue of issues) {
          if (issue.severity === 'critical') {
            this.results.critical.push(issue);
          } else {
            this.results.architecture.push(issue);
          }
        }
      } else {
        this.results[key].push(...issues);
      }
    }

    if (this.options.verbose) {
      console.log('');
    }
  }

  /**
   * Detect good patterns (things done right)
   */
  detectGoodPatterns(files) {
    // Find modules with complete 6-file pattern
    const modulesDir = path.join(this.options.rootDir, 'src', 'app', 'modules');
    const fs = require('fs');

    if (fs.existsSync(modulesDir)) {
      const modules = fs.readdirSync(modulesDir, { withFileTypes: true });

      for (const module of modules) {
        if (!module.isDirectory()) continue;

        const modulePath = path.join(modulesDir, module.name);
        const PatternMatcher = require('./utils/pattern-matcher');
        const result = PatternMatcher.checkModulePattern(modulePath);

        if (result.valid) {
          this.results.goodPatterns.push({
            title: `Excellent Module Structure: ${module.name}`,
            file: `src/app/modules/${module.name}/`,
            seniorSays: 'This is textbook architecture. Use this as template for new modules.',
            details: 'Perfect 6-file pattern: interface, model, controller, service, route, validation'
          });
        }
      }
    }

    // Find files using catchAsync properly
    const controllerFiles = files.filter(f => f.name.includes('.controller.'));
    for (const file of controllerFiles) {
      const content = fs.readFileSync(file.path, 'utf8');

      if (content.includes('catchAsync') && content.includes('sendResponse')) {
        this.results.goodPatterns.push({
          title: `Proper Error Handling: ${file.name}`,
          file: file.relativePath,
          seniorSays: 'Clean error handling with catchAsync + sendResponse. This is how it\'s done.',
          details: 'All async controllers wrapped, standardized responses'
        });
      }
    }

    // Limit to top 10
    this.results.goodPatterns = this.results.goodPatterns.slice(0, 10);
  }

  /**
   * Generate report in specified format
   */
  generateReport() {
    if (this.options.format === 'console') {
      const reporter = new ConsoleReporter({
        colorize: !this.options.ci,
        verbose: this.options.verbose
      });
      reporter.report(this.results);
    } else if (this.options.format === 'json') {
      console.log(JSON.stringify(this.results, null, 2));
    } else if (this.options.format === 'html') {
      console.log('📄 HTML report generation coming soon...');
      console.log('💾 For now, use JSON format and convert to HTML manually');
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--module' || args[i] === '-m') {
      options.module = args[i + 1];
      i++;
    } else if (args[i] === '--file' || args[i] === '-f') {
      options.file = args[i + 1];
      i++;
    } else if (args[i] === '--severity' || args[i] === '-s') {
      options.severity = args[i + 1].split(',');
      i++;
    } else if (args[i] === '--format') {
      options.format = args[i + 1];
      i++;
    } else if (args[i] === '--ci') {
      options.ci = true;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      options.verbose = true;
    }
  }

  const reviewer = new CodeReviewer(options);
  await reviewer.review();
}

function showHelp() {
  console.log(`
🎯 Senior Engineer Code Reviewer

Reviews code like a top 1% senior engineer: thorough, practical, pragmatic.

Usage:
  node scripts/code-review/reviewer.js [options]

Options:
  --module, -m <name>      Review specific module (e.g., user, auth)
  --file, -f <path>        Review specific file
  --severity, -s <types>   Filter by severity (critical,architecture,quality)
  --format <type>          Output format: console|json|html (default: console)
  --ci                     CI mode (exit 1 if critical issues found)
  --verbose, -v            Show detailed progress
  --help, -h               Show this help

Examples:
  # Review entire codebase
  node scripts/code-review/reviewer.js

  # Review specific module
  node scripts/code-review/reviewer.js --module user

  # Review specific file
  node scripts/code-review/reviewer.js --file src/app/modules/auth/auth.service.ts

  # Critical issues only
  node scripts/code-review/reviewer.js --severity critical

  # JSON output for CI/CD
  node scripts/code-review/reviewer.js --format json --ci

  # Verbose mode
  node scripts/code-review/reviewer.js --verbose

What it checks:
  🔴 Critical:       Import order, module pattern, error handling
  ⚠️  Architecture:  Service layer, middleware order, route flow
  💡 Over-eng:       Premature abstraction, unnecessary patterns
  🟡 Quality:        Magic numbers, clever code, hardcoded values
  🔒 Security:       Missing validation, hardcoded secrets
  📈 Scalability:    N+1 queries, missing indexes

Philosophy:
  ✅ Pragmatic over perfect
  ✅ Ship working code, not impressive code
  ✅ Simple over clever
  ✅ Production-ready over ideal
`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = CodeReviewer;
