/**
 * Route Analyzer Utility
 *
 * Express route files analyze করে endpoints, HTTP methods, middleware chains বের করে
 */

const fs = require('fs');
const path = require('path');
const CodeParser = require('./codeParser');

class RouteAnalyzer {
  constructor() {
    this.parser = new CodeParser();
    this.modulesPath = path.join(process.cwd(), 'src', 'app', 'modules');
  }

  /**
   * সমস্ত modules খুঁজে বের করে
   *
   * @returns {Array} Module names
   */
  getAllModules() {
    if (!fs.existsSync(this.modulesPath)) {
      console.warn('⚠️  Modules directory not found');
      return [];
    }

    return fs
      .readdirSync(this.modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

  /**
   * Specific module এর route file খুঁজে বের করে
   *
   * @param {string} moduleName - Module name
   * @returns {string|null} Route file path
   */
  findRouteFile(moduleName) {
    const possibleNames = [
      `${moduleName}.route.ts`,
      `${moduleName}.routes.ts`,
      `${moduleName}s.route.ts`,
      `${moduleName}s.routes.ts`,
      'routes.ts',
      'route.ts',
    ];

    const modulePath = path.join(this.modulesPath, moduleName);

    for (const fileName of possibleNames) {
      const filePath = path.join(modulePath, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Route file থেকে সমস্ত routes extract করে
   *
   * @param {string} filePath - Route file path
   * @returns {Array} Routes with details
   */
  extractRoutes(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const routes = [];

    // Regex patterns for different route definitions
    const patterns = [
      // router.get('/path', ...)
      /router\.(get|post|put|patch|delete)\s*\(\s*['\"`]([^'\"`]+)['\"`]/g,
      // router.route('/path').get(...)
      /router\.route\s*\(\s*['\"`]([^'\"`]+)['\"`]\s*\)\s*\.\s*(get|post|put|patch|delete)/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1] || match[2];
        const routePath = match[2] || match[1];

        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        // Extract middleware and controller from the same line and following lines
        const middlewareChain = this.extractMiddlewareChain(
          content,
          match.index,
          lineNumber
        );

        routes.push({
          method: method.toUpperCase(),
          path: routePath,
          lineNumber,
          middlewareChain,
          fullLine: this.getFullRouteLine(content, lineNumber),
        });
      }
    });

    // Remove duplicates
    const uniqueRoutes = this.removeDuplicateRoutes(routes);

    return uniqueRoutes;
  }

  /**
   * Route definition থেকে middleware chain extract করে
   * Enhanced: Multi-line routes with complex inline middleware support
   *
   * @param {string} content - File content
   * @param {number} startIndex - Start index of route definition
   * @param {number} lineNumber - Line number
   * @returns {Array} Middleware chain
   */
  extractMiddlewareChain(content, startIndex, lineNumber) {
    const middlewareChain = [];

    // Find the complete route definition by matching parentheses
    // This handles multi-line routes with complex inline middleware
    const routeDef = this.extractCompleteRouteDefinition(content, startIndex);

    // Known middleware patterns
    const middlewarePatterns = {
      auth: /auth\s*\(([^)]*)\)/g,
      validateRequest: /validateRequest\s*\(([^)]*)\)/g,
      fileHandler: /fileHandler\s*\(([^)]*)\)/g,
      fileUploadHandler: /fileUploadHandler\s*\(([^)]*)\)/g,
      rateLimit: /rateLimit\s*\(([^)]*)\)/g,
    };

    // Extract each middleware type
    Object.entries(middlewarePatterns).forEach(([name, pattern]) => {
      const match = pattern.exec(routeDef);
      if (match) {
        middlewareChain.push({
          name,
          args: match[1].trim(),
        });
      }
    });

    // Extract controller - search for pattern throughout entire route definition
    // Pattern: ControllerName.methodName (handles multi-line routes)
    const controllerPattern = /([A-Z][a-zA-Z]+Controller)\.([a-z][a-zA-Z]+)/g;
    let controllerMatch;
    while ((controllerMatch = controllerPattern.exec(routeDef)) !== null) {
      // Take the last controller reference (usually the actual handler, not middleware)
      middlewareChain.push({
        name: 'controller',
        controller: controllerMatch[1],
        method: controllerMatch[2],
      });
    }

    // Remove duplicate controller entries, keep only the last one
    const controllerEntries = middlewareChain.filter(m => m.name === 'controller');
    if (controllerEntries.length > 1) {
      // Keep only the last controller entry
      const lastController = controllerEntries[controllerEntries.length - 1];
      const nonControllerEntries = middlewareChain.filter(m => m.name !== 'controller');
      middlewareChain.length = 0;
      middlewareChain.push(...nonControllerEntries, lastController);
    }

    return middlewareChain;
  }

  /**
   * Complete route definition extract করে by matching parentheses
   * Handles multi-line routes with complex inline middleware
   *
   * @param {string} content - File content
   * @param {number} startIndex - Start index of route definition
   * @returns {string} Complete route definition
   */
  extractCompleteRouteDefinition(content, startIndex) {
    let parenCount = 0;
    let started = false;
    let endIndex = startIndex;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '(') {
        parenCount++;
        started = true;
      } else if (char === ')') {
        parenCount--;
      }

      // Stop when all parentheses are closed
      if (started && parenCount === 0) {
        endIndex = i + 1;
        break;
      }

      // Safety limit: 5000 chars max for a single route
      if (i - startIndex > 5000) {
        endIndex = i;
        break;
      }
    }

    return content.substring(startIndex, endIndex);
  }

  /**
   * Full route definition line বের করে (multi-line support)
   *
   * @param {string} content - File content
   * @param {number} lineNumber - Starting line number
   * @returns {string} Full route definition
   */
  getFullRouteLine(content, lineNumber) {
    const lines = content.split('\n');
    let fullLine = lines[lineNumber - 1] || '';

    // Check if it continues on next lines
    let currentLine = lineNumber;
    while (
      currentLine < lines.length &&
      !fullLine.includes(';') &&
      !fullLine.includes(');')
    ) {
      fullLine += '\n' + (lines[currentLine] || '');
      currentLine++;
    }

    return fullLine.trim();
  }

  /**
   * Duplicate routes remove করে
   *
   * @param {Array} routes - Routes array
   * @returns {Array} Unique routes
   */
  removeDuplicateRoutes(routes) {
    const seen = new Set();
    return routes.filter(route => {
      const key = `${route.method}:${route.path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Module analyze করে complete route information দেয়
   *
   * @param {string} moduleName - Module name
   * @returns {Object} Module route analysis
   */
  analyzeModule(moduleName) {
    const routeFile = this.findRouteFile(moduleName);

    if (!routeFile) {
      return {
        moduleName,
        error: 'Route file not found',
        routes: [],
      };
    }

    const routes = this.extractRoutes(routeFile);

    // Extract imports to find controller and validation files
    const imports = this.parser.extractImports(routeFile);

    return {
      moduleName,
      routeFile,
      routes,
      imports,
      totalRoutes: routes.length,
    };
  }

  /**
   * Specific endpoint খুঁজে বের করে
   *
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} path - Route path
   * @returns {Object|null} Endpoint details
   */
  findEndpoint(method, path) {
    const modules = this.getAllModules();

    for (const moduleName of modules) {
      const analysis = this.analyzeModule(moduleName);

      const route = analysis.routes.find(
        r => r.method === method.toUpperCase() && r.path === path
      );

      if (route) {
        return {
          ...route,
          moduleName,
          routeFile: analysis.routeFile,
        };
      }
    }

    return null;
  }

  /**
   * URL path থেকে module name guess করে
   *
   * @param {string} urlPath - URL path (e.g., /api/v1/auth/login)
   * @returns {string|null} Module name
   */
  guessModuleFromPath(urlPath) {
    // Remove /api/v1/ prefix if exists
    const cleanPath = urlPath.replace(/^\/api\/v\d+\//, '');

    // First segment is usually the module name
    const segments = cleanPath.split('/').filter(Boolean);
    if (segments.length > 0) {
      return segments[0];
    }

    return null;
  }

  /**
   * Controller file খুঁজে বের করে
   *
   * @param {string} moduleName - Module name
   * @returns {string|null} Controller file path
   */
  findControllerFile(moduleName) {
    const possibleNames = [
      `${moduleName}.controller.ts`,
      `${moduleName}s.controller.ts`,
      'controller.ts',
    ];

    const modulePath = path.join(this.modulesPath, moduleName);

    for (const fileName of possibleNames) {
      const filePath = path.join(modulePath, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Service file খুঁজে বের করে
   *
   * @param {string} moduleName - Module name
   * @returns {string|null} Service file path
   */
  findServiceFile(moduleName) {
    const possibleNames = [
      `${moduleName}.service.ts`,
      `${moduleName}s.service.ts`,
      'service.ts',
    ];

    const modulePath = path.join(this.modulesPath, moduleName);

    for (const fileName of possibleNames) {
      const filePath = path.join(modulePath, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Model file খুঁজে বের করে
   *
   * @param {string} moduleName - Module name
   * @returns {string|null} Model file path
   */
  findModelFile(moduleName) {
    const possibleNames = [
      `${moduleName}.model.ts`,
      `${moduleName}s.model.ts`,
      'model.ts',
    ];

    const modulePath = path.join(this.modulesPath, moduleName);

    for (const fileName of possibleNames) {
      const filePath = path.join(modulePath, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Complete module structure analyze করে
   *
   * @param {string} moduleName - Module name
   * @returns {Object} Complete module analysis
   */
  analyzeModuleStructure(moduleName) {
    return {
      moduleName,
      routeFile: this.findRouteFile(moduleName),
      controllerFile: this.findControllerFile(moduleName),
      serviceFile: this.findServiceFile(moduleName),
      modelFile: this.findModelFile(moduleName),
    };
  }

  /**
   * Generate module summary report
   *
   * @returns {Object} Summary of all modules
   */
  generateModuleSummary() {
    const modules = this.getAllModules();
    const summary = {
      totalModules: modules.length,
      modules: [],
      totalRoutes: 0,
    };

    modules.forEach(moduleName => {
      const analysis = this.analyzeModule(moduleName);
      const structure = this.analyzeModuleStructure(moduleName);

      summary.modules.push({
        name: moduleName,
        routes: analysis.totalRoutes,
        files: {
          route: !!structure.routeFile,
          controller: !!structure.controllerFile,
          service: !!structure.serviceFile,
          model: !!structure.modelFile,
        },
      });

      summary.totalRoutes += analysis.totalRoutes;
    });

    return summary;
  }
}

module.exports = RouteAnalyzer;
