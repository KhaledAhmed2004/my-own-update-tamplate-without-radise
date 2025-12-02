const fs = require('fs');
const PatternMatcher = require('../utils/pattern-matcher');

/**
 * Architecture Analyzer
 *
 * Checks architectural patterns:
 * - Service layer (no direct queries in controllers)
 * - Middleware order
 * - Route flow validation
 */

class ArchitectureAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];
  }

  analyze(files) {
    this.issues = [];

    this.checkServiceLayer(files);
    this.checkMiddlewareOrder(files);
    this.checkRouteFlow(files);

    return this.issues;
  }

  checkServiceLayer(files) {
    const serviceFiles = files.filter(f => f.name.includes('.service.'));

    for (const file of serviceFiles) {
      const content = fs.readFileSync(file.path, 'utf8');
      const queries = PatternMatcher.findDirectQueries(content);

      for (const query of queries) {
        // Allow direct queries in services, but warn if it's a simple CRUD
        if (['find', 'findOne', 'findById'].includes(query.method)) {
          this.issues.push({
            severity: 'architecture',
            category: 'service-layer',
            file: file.relativePath,
            line: query.line,
            message: `Direct ${query.method}() call in service`,
            impact: 'Reduces testability and reusability',
            fix: `Create ${query.model}.${query.method}Static() model method`,
            seniorSays: `This should be a model static method. Why? Testability and reusability.`,
            teaching: {
              why: 'Model methods can be mocked in tests, services can\'t easily mock direct queries',
              benefits: ['Testable', 'Reusable across services', 'Single source of truth']
            },
            before: `const users = await User.find({ status: 'active' });`,
            after: `// In user.model.ts:\nUserSchema.statics.findActiveUsers = function() {\n  return this.find({ status: 'active' });\n};\n\n// In service:\nconst users = await User.findActiveUsers();`
          });
        }
      }
    }

    // Check controllers for direct DB calls
    const controllerFiles = files.filter(f => f.name.includes('.controller.'));

    for (const file of controllerFiles) {
      const content = fs.readFileSync(file.path, 'utf8');
      const queries = PatternMatcher.findDirectQueries(content);

      if (queries.length > 0) {
        this.issues.push({
          severity: 'architecture',
          category: 'service-layer',
          file: file.relativePath,
          line: queries[0].line,
          message: 'Controller has direct database query',
          impact: 'Violates thin controller pattern',
          fix: 'Move business logic to service layer',
          seniorSays: 'Controllers should be dumb routers. Move this logic to service.',
          before: `export const getUser = catchAsync(async (req, res) => {\n  const user = await User.findById(req.params.id);\n  sendResponse(res, { data: user });\n});`,
          after: `// In controller:\nexport const getUser = catchAsync(async (req, res) => {\n  const user = await UserService.getUserById(req.params.id);\n  sendResponse(res, { data: user });\n});\n\n// In service:\nstatic async getUserById(id) {\n  return await User.findById(id);\n}`
        });
      }
    }
  }

  checkMiddlewareOrder(files) {
    const routeFiles = files.filter(f => f.name.includes('.route.'));

    for (const file of routeFiles) {
      const content = fs.readFileSync(file.path, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if validateRequest comes before auth
        if (line.includes('validateRequest')) {
          let foundAuth = false;
          for (let j = Math.max(0, i - 5); j < i; j++) {
            if (lines[j].includes('auth(')) {
              foundAuth = true;
              break;
            }
          }

          if (!foundAuth && line.includes('.post(') || line.includes('.put(')) {
            // This might be a public route, which is OK
            continue;
          }
        }

        // Check validateRequest after auth (correct order)
        if (line.includes('.post(') || line.includes('.put(') || line.includes('.patch(')) {
          let authLine = -1;
          let validateLine = -1;

          for (let j = i; j < Math.min(i + 10, lines.length); j++) {
            if (lines[j].includes('auth(')) authLine = j;
            if (lines[j].includes('validateRequest')) validateLine = j;
          }

          if (validateLine > 0 && authLine > 0 && validateLine < authLine) {
            this.issues.push({
              severity: 'architecture',
              category: 'middleware-order',
              file: file.relativePath,
              line: validateLine + 1,
              message: 'validateRequest before auth()',
              impact: 'Wastes resources validating malicious input',
              fix: 'Move validateRequest AFTER auth',
              seniorSays: 'Validate AFTER auth. Why parse malicious input before checking if they\'re even allowed?',
              before: `router.post(\n  '/',\n  validateRequest(Schema),\n  auth(),\n  Controller.create\n);`,
              after: `router.post(\n  '/',\n  auth(),\n  validateRequest(Schema),\n  Controller.create\n);`
            });
          }
        }
      }
    }
  }

  checkRouteFlow(files) {
    const routeFiles = files.filter(f => f.name.includes('.route.'));

    for (const file of routeFiles) {
      const content = fs.readFileSync(file.path, 'utf8');
      const missingValidation = PatternMatcher.findMissingValidation(content);

      for (const issue of missingValidation) {
        this.issues.push({
          severity: 'architecture',
          category: 'route-flow',
          file: file.relativePath,
          line: issue.line,
          message: 'POST/PUT route without validateRequest()',
          impact: 'Data entry point without schema validation',
          fix: 'Add validateRequest(ZodSchema) middleware',
          seniorSays: 'This route accepts ANY input. That\'s a SQL injection waiting to happen.',
          before: issue.code,
          after: `router.post(\n  '/',\n  auth(),\n  validateRequest(CreateSchema),\n  Controller.create\n);`
        });
      }
    }
  }
}

module.exports = ArchitectureAnalyzer;
