/**
 * Controller Tracer Utility
 *
 * Controller files থেকে methods trace করে এবং তারা কোন service methods call করে তা বের করে
 */

const fs = require('fs');
const path = require('path');
const CodeParser = require('./codeParser');

class ControllerTracer {
  constructor() {
    this.parser = new CodeParser();
  }

  /**
   * Controller method analyze করে
   *
   * @param {string} controllerFile - Controller file path
   * @param {string} methodName - Method name to trace
   * @returns {Object} Method details
   */
  traceMethod(controllerFile, methodName) {
    if (!fs.existsSync(controllerFile)) {
      console.warn(`⚠️  Controller file not found: ${controllerFile}`);
      return null;
    }

    const content = fs.readFileSync(controllerFile, 'utf-8');

    // Find the method definition
    const methodInfo = this.findMethodDefinition(content, methodName);
    if (!methodInfo) {
      return null;
    }

    // Extract service calls from the method
    const serviceCalls = this.extractServiceCalls(controllerFile, methodInfo);

    // Extract sendResponse calls
    const responseData = this.extractResponseData(methodInfo.body);

    // Extract request data extraction
    const requestData = this.extractRequestData(methodInfo.body);

    // Check if wrapped with catchAsync
    const wrappedWithCatchAsync = this.isWrappedWithCatchAsync(
      content,
      methodName
    );

    return {
      methodName,
      serviceCalls,
      responseData,
      requestData,
      wrappedWithCatchAsync,
      lineNumber: methodInfo.lineNumber,
      async: methodInfo.async,
    };
  }

  /**
   * Method definition খুঁজে বের করে
   * Enhanced: TypeScript type annotations support (Request, Response types)
   *
   * @param {string} content - File content
   * @param {string} methodName - Method name
   * @returns {Object|null} Method information
   */
  findMethodDefinition(content, methodName) {
    const lines = content.split('\n');

    // Patterns for different method definitions
    // Enhanced to handle TypeScript type annotations like (req: Request, res: Response)
    const patterns = [
      // const methodName = catchAsync(async (req: Request, res: Response) => {
      // Handles TypeScript types in parameters
      new RegExp(
        `const\\s+${methodName}\\s*=\\s*catchAsync\\s*\\(\\s*async\\s*\\([^)]*\\)\\s*=>`
      ),
      // const methodName = catchAsync(async (req, res) => { (no types)
      new RegExp(
        `const\\s+${methodName}\\s*=\\s*catchAsync\\s*\\(\\s*async\\s*\\(`
      ),
      // const methodName = async (req: Request, res: Response) => {
      new RegExp(`const\\s+${methodName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>`),
      // const methodName = async (req, res) => {
      new RegExp(`const\\s+${methodName}\\s*=\\s*async\\s*\\(`),
      // const methodName = (req: Request, res: Response) => {
      new RegExp(`const\\s+${methodName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
      // const methodName = (req, res) => {
      new RegExp(`const\\s+${methodName}\\s*=\\s*\\(`),
      // export const methodName = catchAsync(async (req: Request, res: Response) => {
      new RegExp(
        `export\\s+const\\s+${methodName}\\s*=\\s*catchAsync\\s*\\(\\s*async\\s*\\([^)]*\\)\\s*=>`
      ),
      // export const methodName = catchAsync(async (req, res) => {
      new RegExp(
        `export\\s+const\\s+${methodName}\\s*=\\s*catchAsync\\s*\\(\\s*async\\s*\\(`
      ),
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of patterns) {
        if (pattern.test(line)) {
          // Extract method body
          const body = this.extractMethodBody(lines, i);

          return {
            methodName,
            lineNumber: i + 1,
            async: line.includes('async'),
            body,
          };
        }
      }
    }

    return null;
  }

  /**
   * Method body extract করে
   *
   * @param {Array} lines - File lines
   * @param {number} startLine - Start line index
   * @returns {string} Method body
   */
  extractMethodBody(lines, startLine) {
    let body = '';
    let braceCount = 0;
    let started = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      // Count braces
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      body += line + '\n';

      // Stop when all braces are closed
      if (started && braceCount === 0) {
        break;
      }
    }

    return body;
  }

  /**
   * Service calls extract করে
   *
   * @param {string} controllerFile - Controller file path
   * @param {Object} methodInfo - Method information
   * @returns {Array} Service calls
   */
  extractServiceCalls(controllerFile, methodInfo) {
    const serviceCalls = [];

    // Pattern: ServiceName.methodName(...)
    const serviceCallPattern = /([A-Z][a-zA-Z]+Service)\.([a-z][a-zA-Z]+)\s*\(/g;

    let match;
    while ((match = serviceCallPattern.exec(methodInfo.body)) !== null) {
      const serviceName = match[1];
      const methodName = match[2];

      // Find which file this service is imported from
      const imports = this.parser.extractImports(controllerFile);
      const serviceImport = imports.find(imp =>
        imp.specifiers.some(spec => spec.local === serviceName)
      );

      serviceCalls.push({
        serviceName,
        methodName,
        importPath: serviceImport ? serviceImport.source : null,
      });
    }

    return serviceCalls;
  }

  /**
   * sendResponse call থেকে response structure extract করে
   *
   * @param {string} body - Method body
   * @returns {Object|null} Response data
   */
  extractResponseData(body) {
    // Pattern: sendResponse(res, {...})
    const sendResponsePattern = /sendResponse\s*\(\s*res\s*,\s*\{([^}]+)\}/s;
    const match = body.match(sendResponsePattern);

    if (!match) {
      return null;
    }

    const responseContent = match[1];

    // Extract properties
    const properties = {};

    // Extract success
    const successMatch = responseContent.match(/success\s*:\s*(\w+)/);
    if (successMatch) {
      properties.success = successMatch[1];
    }

    // Extract statusCode
    const statusCodeMatch = responseContent.match(
      /statusCode\s*:\s*(\d+|StatusCodes\.\w+)/
    );
    if (statusCodeMatch) {
      properties.statusCode = statusCodeMatch[1];
    }

    // Extract message
    const messageMatch = responseContent.match(
      /message\s*:\s*['\"]([^'\"]+)['\"]/
    );
    if (messageMatch) {
      properties.message = messageMatch[1];
    }

    // Extract data reference
    const dataMatch = responseContent.match(/data\s*:\s*(\w+)/);
    if (dataMatch) {
      properties.data = dataMatch[1];
    }

    return properties;
  }

  /**
   * Request data extraction patterns খুঁজে বের করে
   *
   * @param {string} body - Method body
   * @returns {Object} Request data extraction info
   */
  extractRequestData(body) {
    const requestData = {
      fromBody: [],
      fromParams: [],
      fromQuery: [],
      fromUser: false,
      fromFiles: false,
    };

    // req.body destructuring
    const bodyPattern = /const\s+\{([^}]+)\}\s*=\s*req\.body/g;
    let match;
    while ((match = bodyPattern.exec(body)) !== null) {
      const fields = match[1]
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);
      requestData.fromBody.push(...fields);
    }

    // req.params
    const paramsPattern = /req\.params\.(\w+)/g;
    while ((match = paramsPattern.exec(body)) !== null) {
      requestData.fromParams.push(match[1]);
    }

    // req.query
    const queryPattern = /req\.query/g;
    if (queryPattern.test(body)) {
      requestData.fromQuery.push('query');
    }

    // req.user
    if (/req\.user/.test(body)) {
      requestData.fromUser = true;
    }

    // req.files
    if (/req\.files?/.test(body)) {
      requestData.fromFiles = true;
    }

    return requestData;
  }

  /**
   * Check if method is wrapped with catchAsync
   *
   * @param {string} content - File content
   * @param {string} methodName - Method name
   * @returns {boolean} Is wrapped
   */
  isWrappedWithCatchAsync(content, methodName) {
    const pattern = new RegExp(
      `const\\s+${methodName}\\s*=\\s*catchAsync\\s*\\(`
    );
    return pattern.test(content);
  }

  /**
   * Controller file থেকে সমস্ত exported methods খুঁজে বের করে
   *
   * @param {string} controllerFile - Controller file path
   * @returns {Array} Method names
   */
  getAllMethods(controllerFile) {
    const exports = this.parser.extractExports(controllerFile);
    return exports
      .filter(exp => exp.type === 'variable' || exp.type === 'function')
      .map(exp => exp.name);
  }

  /**
   * Controller থেকে imports বের করে
   *
   * @param {string} controllerFile - Controller file path
   * @returns {Object} Categorized imports
   */
  analyzeImports(controllerFile) {
    const imports = this.parser.extractImports(controllerFile);

    const categorized = {
      services: [],
      helpers: [],
      middleware: [],
      shared: [],
      external: [],
    };

    imports.forEach(imp => {
      if (imp.source.includes('service')) {
        categorized.services.push(imp);
      } else if (imp.source.includes('helper')) {
        categorized.helpers.push(imp);
      } else if (imp.source.includes('middleware')) {
        categorized.middleware.push(imp);
      } else if (imp.source.includes('shared')) {
        categorized.shared.push(imp);
      } else if (!imp.source.startsWith('.')) {
        categorized.external.push(imp);
      }
    });

    return categorized;
  }

  /**
   * Complete controller analysis
   *
   * @param {string} controllerFile - Controller file path
   * @returns {Object} Complete analysis
   */
  analyzeController(controllerFile) {
    if (!fs.existsSync(controllerFile)) {
      return {
        error: 'Controller file not found',
      };
    }

    const methods = this.getAllMethods(controllerFile);
    const imports = this.analyzeImports(controllerFile);

    const methodsAnalysis = {};
    methods.forEach(methodName => {
      methodsAnalysis[methodName] = this.traceMethod(
        controllerFile,
        methodName
      );
    });

    return {
      controllerFile,
      methods,
      methodsAnalysis,
      imports,
      totalMethods: methods.length,
    };
  }

  /**
   * Helper: Get service file path from import
   *
   * @param {string} controllerFile - Controller file path
   * @param {string} importPath - Import path
   * @returns {string|null} Resolved service file path
   */
  resolveServiceFile(controllerFile, importPath) {
    if (!importPath) return null;

    if (importPath.startsWith('.')) {
      return this.parser.resolveImportPath(controllerFile, importPath);
    }

    return null;
  }

  /**
   * Helper: Extract error handling patterns
   *
   * @param {string} body - Method body
   * @returns {Array} Error handling info
   */
  extractErrorHandling(body) {
    const errors = [];

    // try-catch blocks
    if (/try\s*\{/.test(body)) {
      errors.push({ type: 'try-catch', present: true });
    }

    // ApiError throws
    const apiErrorPattern = /throw\s+new\s+ApiError\s*\(\s*(\d+)\s*,\s*['\"]([^'\"]+)['\"]/g;
    let match;
    while ((match = apiErrorPattern.exec(body)) !== null) {
      errors.push({
        type: 'ApiError',
        statusCode: match[1],
        message: match[2],
      });
    }

    // if conditions that return error
    const ifErrorPattern = /if\s*\(.*\)\s*\{[\s\S]*?throw/g;
    const ifMatches = body.match(ifErrorPattern);
    if (ifMatches) {
      errors.push({
        type: 'conditional-error',
        count: ifMatches.length,
      });
    }

    return errors;
  }
}

module.exports = ControllerTracer;
