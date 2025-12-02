const fs = require('fs');
const path = require('path');
const PatternMatcher = require('../utils/pattern-matcher');

/**
 * Critical Rules Analyzer
 *
 * Checks show-stopper issues that will break the system:
 * - Import order violations
 * - Module pattern compliance
 * - Error handling patterns
 * - Documentation compliance
 */

class CriticalRulesAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];
  }

  analyze(files, rootDir) {
    this.issues = [];

    // Check import order in critical files
    this.checkImportOrder(files, rootDir);

    // Check module pattern compliance
    this.checkModulePattern(rootDir);

    // Check error handling
    this.checkErrorHandling(files);

    return this.issues;
  }

  /**
   * Check critical import order in app.ts
   */
  checkImportOrder(files, rootDir) {
    const appFile = files.find(f => f.name === 'app.ts' && f.relativeDir === 'src');

    if (!appFile) {
      return;
    }

    const content = fs.readFileSync(appFile.path, 'utf8');
    const imports = PatternMatcher.getImportOrder(content);

    // Critical import order
    const criticalImports = [
      { path: './app/logging/mongooseMetrics', name: 'mongooseMetrics' },
      { path: './app/logging/autoLabelBootstrap', name: 'autoLabelBootstrap' },
      { path: './app/logging/opentelemetry', name: 'opentelemetry' },
      { path: './routes', name: 'routes' }
    ];

    const found = {};
    for (const imp of imports) {
      for (const critical of criticalImports) {
        if (imp.path.includes(critical.path)) {
          found[critical.name] = imp.line;
        }
      }
    }

    // Check order
    if (found.mongooseMetrics && found.routes &&
        found.mongooseMetrics > found.routes) {
      this.issues.push({
        severity: 'critical',
        category: 'import-order',
        file: appFile.relativePath,
        line: found.mongooseMetrics,
        message: 'mongooseMetrics imported AFTER routes',
        impact: 'This will break your entire logging system in production',
        fix: `Move mongooseMetrics import to line ${found.routes - 1} (before routes)`,
        seniorSays: 'This will break your entire logging system in production. Move it NOW.',
        before: `import router from './routes';\nimport './app/logging/mongooseMetrics';`,
        after: `import './app/logging/mongooseMetrics';\nimport router from './routes';`,
        documentation: 'See CLAUDE.md "Critical Architecture Concepts" section'
      });
    }

    if (found.autoLabelBootstrap && found.routes &&
        found.autoLabelBootstrap > found.routes) {
      this.issues.push({
        severity: 'critical',
        category: 'import-order',
        file: appFile.relativePath,
        line: found.autoLabelBootstrap,
        message: 'autoLabelBootstrap imported AFTER routes',
        impact: 'Auto-labeling won\'t work, missing spans in traces',
        fix: `Move autoLabelBootstrap import before routes import`,
        seniorSays: 'Auto-labeling must run BEFORE routes are loaded. Otherwise no automatic instrumentation.',
        documentation: 'See CLAUDE.md "Critical Architecture Concepts" section'
      });
    }

    if (found.opentelemetry && found.routes &&
        found.opentelemetry > found.routes) {
      this.issues.push({
        severity: 'critical',
        category: 'import-order',
        file: appFile.relativePath,
        line: found.opentelemetry,
        message: 'OpenTelemetry imported AFTER routes',
        impact: 'No tracing for your routes',
        fix: `Move opentelemetry import before routes import`,
        seniorSays: 'OpenTelemetry SDK must initialize before instrumented code runs.',
        documentation: 'See CLAUDE.md "Critical Architecture Concepts" section'
      });
    }
  }

  /**
   * Check module pattern compliance
   */
  checkModulePattern(rootDir) {
    const modulesDir = path.join(rootDir, 'src', 'app', 'modules');

    if (!fs.existsSync(modulesDir)) {
      return;
    }

    const modules = fs.readdirSync(modulesDir, { withFileTypes: true });

    for (const module of modules) {
      if (!module.isDirectory()) continue;

      const modulePath = path.join(modulesDir, module.name);
      const result = PatternMatcher.checkModulePattern(modulePath);

      if (!result.valid) {
        this.issues.push({
          severity: 'critical',
          category: 'module-pattern',
          file: `src/app/modules/${module.name}/`,
          message: `Missing required files: ${result.missing.join(', ')}`,
          impact: 'Violates 6-file module pattern, inconsistent architecture',
          fix: `Create missing files: ${result.missing.map(f => `${module.name}.${f}`).join(', ')}`,
          seniorSays: result.missing.includes('validation.ts')
            ? 'Missing validation? That\'s a security vulnerability waiting to happen.'
            : 'Follow the 6-file pattern. Future you will thank you for consistency.',
          documentation: 'See CLAUDE.md "Module Pattern" section',
          requiredFiles: [
            `${module.name}.interface.ts`,
            `${module.name}.model.ts`,
            `${module.name}.controller.ts`,
            `${module.name}.service.ts`,
            `${module.name}.route.ts`,
            `${module.name}.validation.ts`
          ],
          missing: result.missing
        });
      }
    }
  }

  /**
   * Check error handling patterns
   */
  checkErrorHandling(files) {
    const controllerFiles = files.filter(f =>
      f.name.endsWith('.controller.ts') || f.name.endsWith('.controller.js')
    );

    for (const file of controllerFiles) {
      const content = fs.readFileSync(file.path, 'utf8');
      const lines = content.split('\n');

      let hasAsyncFunction = false;
      let hasCatchAsync = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for async functions
        if (line.includes('async') && (line.includes('function') || line.includes('const') || line.includes('export'))) {
          hasAsyncFunction = true;

          // Look for catchAsync wrapper
          const prevLines = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
          if (prevLines.includes('catchAsync')) {
            hasCatchAsync = true;
          }
        }
      }

      if (hasAsyncFunction && !hasCatchAsync) {
        this.issues.push({
          severity: 'critical',
          category: 'error-handling',
          file: file.relativePath,
          message: 'Async controller without catchAsync wrapper',
          impact: 'Uncaught promise rejections will crash your server',
          fix: 'Wrap async controllers with catchAsync()',
          seniorSays: 'Uncaught promise rejections will crash your server. Use catchAsync.',
          before: `export const getUser = async (req, res) => {\n  const user = await UserService.getUser(req.params.id);\n};`,
          after: `export const getUser = catchAsync(async (req, res) => {\n  const user = await UserService.getUser(req.params.id);\n  sendResponse(res, { data: user });\n});`,
          documentation: 'See CLAUDE.md "Error Handling Pattern" section'
        });
      }

      // Check for generic Error throwing
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('throw new Error(')) {
          this.issues.push({
            severity: 'critical',
            category: 'error-handling',
            file: file.relativePath,
            line: i + 1,
            message: 'Using generic Error instead of ApiError',
            impact: 'Error won\'t be properly formatted for API response',
            fix: 'Use ApiError(statusCode, message) instead',
            seniorSays: 'Generic Error breaks your error handling flow. Use ApiError.',
            before: `throw new Error('User not found');`,
            after: `throw new ApiError(404, 'User not found');`,
            documentation: 'See CLAUDE.md "Error Handling Pattern" section'
          });
        }
      }
    }
  }
}

module.exports = CriticalRulesAnalyzer;
