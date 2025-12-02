const fs = require('fs');

/**
 * Naming Convention Analyzer
 *
 * Checks for proper naming conventions:
 * - Constants: UPPER_SNAKE_CASE
 * - Classes: PascalCase
 * - Interfaces: I prefix (IUser, IPayment)
 * - Booleans: is/has/can/should prefix
 * - Functions: verb-first (getUser, createOrder)
 * - Arrays: plural names (users, items)
 */
class NamingConventionAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.issues = [];

    // Skip patterns to reduce false positives
    this.skipPatterns = {
      // Common framework types/imports
      frameworkTypes: ['Request', 'Response', 'NextFunction', 'Router', 'Schema', 'Model', 'Document'],
      // Loop variables
      loopVars: ['i', 'j', 'k', 'n', 'x', 'y', 'idx', 'index'],
      // Common abbreviations that are OK
      okAbbreviations: ['id', 'url', 'api', 'db', 'io', 'fs', 'os', 'env', 'err', 'req', 'res', 'ctx'],
      // Skip lines with these patterns
      skipLinePatterns: [
        /^\s*\/\//, // Comments
        /^\s*\*/, // JSDoc
        /^\s*import/, // Imports
        /^\s*export\s+{/, // Re-exports
        /^\s*from\s+['"]/, // From statements
        /=>/,  // Arrow functions (skip for const detection)
        /const\s*{/, // Destructuring
        /^\s*type\s+/, // Type aliases
        /^\s*enum\s+/, // Enums (PascalCase is correct)
      ]
    };
  }

  analyze(files) {
    this.issues = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n');

        this.checkConstants(lines, file);
        this.checkClasses(lines, file);
        this.checkInterfaces(lines, file);
        this.checkBooleans(lines, file);
        this.checkFunctions(lines, file);
        this.checkArrays(lines, file);
      } catch (err) {
        // Skip files that can't be read
        continue;
      }
    }

    return this.issues;
  }

  /**
   * Check constants should be UPPER_SNAKE_CASE
   * Wrong: const MaxRetries = 3;
   * Right: const MAX_RETRIES = 3;
   */
  checkConstants(lines, file) {
    // Pattern: const followed by PascalCase or camelCase with primitive value
    const constPattern = /^\s*(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*[=:]\s*[\d'"]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip if line matches skip patterns
      if (this.shouldSkipLine(line)) continue;

      const match = line.match(constPattern);
      if (match) {
        const constName = match[1];

        // Skip if it's a class instantiation (new Something)
        if (line.includes('new ')) continue;

        // Skip if it's already UPPER_SNAKE_CASE
        if (/^[A-Z][A-Z0-9_]*$/.test(constName)) continue;

        // Skip framework types
        if (this.skipPatterns.frameworkTypes.includes(constName)) continue;

        // This is PascalCase/camelCase constant with primitive value - should be UPPER_SNAKE
        const suggested = this.toUpperSnakeCase(constName);

        this.issues.push({
          severity: 'quality',
          category: 'naming-convention',
          file: file.relativePath,
          line: i + 1,
          message: `Constant '${constName}' should be UPPER_SNAKE_CASE`,
          impact: 'Constants should be immediately recognizable as unchangeable values',
          fix: `Rename to ${suggested}`,
          seniorSays: `Constants should SCREAM. Use ${suggested} so everyone knows it's a constant.`,
          before: line.trim(),
          after: line.trim().replace(constName, suggested)
        });
      }
    }
  }

  /**
   * Check classes should be PascalCase
   * Wrong: class userService {}
   * Right: class UserService {}
   */
  checkClasses(lines, file) {
    const classPattern = /^\s*(?:export\s+)?(?:abstract\s+)?class\s+([a-z][a-zA-Z0-9]*)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.shouldSkipLine(line)) continue;

      const match = line.match(classPattern);
      if (match) {
        const className = match[1];
        const suggested = this.toPascalCase(className);

        this.issues.push({
          severity: 'quality',
          category: 'naming-convention',
          file: file.relativePath,
          line: i + 1,
          message: `Class '${className}' should be PascalCase`,
          impact: 'Classes should start with uppercase to distinguish from instances',
          fix: `Rename to ${suggested}`,
          seniorSays: `Classes are blueprints, instances are things. ${suggested} is the blueprint, ${className} would be an instance.`,
          before: line.trim(),
          after: line.trim().replace(className, suggested)
        });
      }
    }
  }

  /**
   * Check interfaces should have I prefix (configurable)
   * Wrong: interface User {}
   * Right: interface IUser {}
   */
  checkInterfaces(lines, file) {
    // Only check .ts files
    if (!file.path.endsWith('.ts')) return;

    const interfacePattern = /^\s*(?:export\s+)?interface\s+([A-Z][a-zA-Z0-9]*)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.shouldSkipLine(line)) continue;

      const match = line.match(interfacePattern);
      if (match) {
        const interfaceName = match[1];

        // Skip if already starts with I followed by uppercase
        if (/^I[A-Z]/.test(interfaceName)) continue;

        // Skip common patterns that shouldn't have I prefix
        const skipSuffixes = ['Props', 'State', 'Config', 'Options', 'Params', 'Args', 'Result', 'Response', 'Request'];
        if (skipSuffixes.some(suffix => interfaceName.endsWith(suffix))) continue;

        const suggested = 'I' + interfaceName;

        this.issues.push({
          severity: 'quality',
          category: 'naming-convention',
          file: file.relativePath,
          line: i + 1,
          message: `Interface '${interfaceName}' should have 'I' prefix`,
          impact: 'I prefix helps distinguish interfaces from classes at a glance',
          fix: `Rename to ${suggested}`,
          seniorSays: `In this codebase, we use I prefix for interfaces. ${suggested} makes it clear this is a contract, not an implementation.`,
          before: line.trim(),
          after: line.trim().replace(interfaceName, suggested)
        });
      }
    }
  }

  /**
   * Check booleans should have is/has/can/should prefix
   * Wrong: const active = true;
   * Right: const isActive = true;
   */
  checkBooleans(lines, file) {
    // Pattern: const/let followed by name and boolean value or type
    const boolPattern = /^\s*(?:export\s+)?(?:const|let)\s+([a-z][a-zA-Z0-9]*)\s*(?::\s*boolean)?\s*=\s*(true|false)/;
    const boolTypePattern = /^\s*(?:export\s+)?(?:const|let)\s+([a-z][a-zA-Z0-9]*)\s*:\s*boolean/;

    const validPrefixes = ['is', 'has', 'can', 'should', 'will', 'did', 'was', 'were', 'are'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.shouldSkipLine(line)) continue;

      let match = line.match(boolPattern) || line.match(boolTypePattern);
      if (match) {
        const boolName = match[1];

        // Check if already has valid prefix
        if (validPrefixes.some(prefix => boolName.startsWith(prefix) && boolName.length > prefix.length && /[A-Z]/.test(boolName[prefix.length]))) {
          continue;
        }

        // Skip common exceptions
        const exceptions = ['debug', 'verbose', 'enabled', 'disabled', 'loading', 'loaded', 'error', 'success', 'valid', 'invalid'];
        if (exceptions.includes(boolName.toLowerCase())) continue;

        const suggested = 'is' + this.toPascalCase(boolName);

        this.issues.push({
          severity: 'quality',
          category: 'naming-convention',
          file: file.relativePath,
          line: i + 1,
          message: `Boolean '${boolName}' should have is/has/can/should prefix`,
          impact: 'Boolean names should read like yes/no questions',
          fix: `Rename to ${suggested}`,
          seniorSays: `Booleans should answer questions. Is it ${boolName}? Use ${suggested}.`,
          before: line.trim(),
          after: line.trim().replace(new RegExp(`\\b${boolName}\\b`), suggested)
        });
      }
    }
  }

  /**
   * Check functions should start with verbs
   * Wrong: function userData() {}
   * Right: function getUserData() {}
   */
  checkFunctions(lines, file) {
    // Skip controller and service files - they follow different patterns
    if (file.path.includes('.controller.') || file.path.includes('.service.')) return;

    const funcPattern = /^\s*(?:export\s+)?(?:async\s+)?function\s+([a-z][a-zA-Z0-9]*)\s*\(/;
    const arrowFuncPattern = /^\s*(?:export\s+)?const\s+([a-z][a-zA-Z0-9]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/;

    const validVerbs = [
      'get', 'set', 'fetch', 'load', 'save', 'update', 'delete', 'remove', 'create', 'add',
      'find', 'search', 'filter', 'sort', 'map', 'reduce', 'transform', 'convert', 'parse',
      'validate', 'check', 'verify', 'ensure', 'assert', 'test', 'compare',
      'handle', 'process', 'execute', 'run', 'perform', 'do', 'apply',
      'init', 'initialize', 'setup', 'configure', 'build', 'construct', 'make',
      'format', 'render', 'display', 'show', 'hide', 'toggle',
      'send', 'receive', 'emit', 'dispatch', 'notify', 'broadcast',
      'open', 'close', 'start', 'stop', 'pause', 'resume', 'reset',
      'enable', 'disable', 'activate', 'deactivate',
      'register', 'unregister', 'subscribe', 'unsubscribe',
      'on', 'off', 'bind', 'unbind', 'attach', 'detach',
      'log', 'debug', 'trace', 'warn', 'error', 'info',
      'is', 'has', 'can', 'should', 'will' // For boolean-returning functions
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.shouldSkipLine(line)) continue;

      let match = line.match(funcPattern) || line.match(arrowFuncPattern);
      if (match) {
        const funcName = match[1];

        // Check if function starts with a valid verb
        const startsWithVerb = validVerbs.some(verb =>
          funcName.startsWith(verb) &&
          (funcName.length === verb.length || /[A-Z]/.test(funcName[verb.length]))
        );

        if (startsWithVerb) continue;

        // Skip short utility names
        if (funcName.length <= 3) continue;

        // Skip callback-style names
        if (funcName.endsWith('Callback') || funcName.endsWith('Handler')) continue;

        // Suggest a verb based on context
        let suggestedVerb = 'get';
        if (funcName.toLowerCase().includes('user') || funcName.toLowerCase().includes('data')) {
          suggestedVerb = 'get';
        } else if (funcName.toLowerCase().includes('valid') || funcName.toLowerCase().includes('check')) {
          suggestedVerb = 'validate';
        }

        const suggested = suggestedVerb + this.toPascalCase(funcName);

        this.issues.push({
          severity: 'quality',
          category: 'naming-convention',
          file: file.relativePath,
          line: i + 1,
          message: `Function '${funcName}' should start with a verb`,
          impact: 'Function names should describe what they DO, not what they ARE',
          fix: `Consider renaming to ${suggested} or similar verb-first name`,
          seniorSays: `Functions DO things. What does ${funcName} DO? Name it accordingly: ${suggested}, process${this.toPascalCase(funcName)}, etc.`,
          before: line.trim(),
          after: line.trim().replace(funcName, suggested)
        });
      }
    }
  }

  /**
   * Check arrays should have plural names
   * Wrong: const user = []; user.push(...)
   * Right: const users = []; users.push(...)
   */
  checkArrays(lines, file) {
    // Pattern: const/let followed by singular name and array literal or type
    const arrayPattern = /^\s*(?:export\s+)?(?:const|let)\s+([a-z][a-zA-Z0-9]*)\s*(?::\s*[A-Za-z]+\[\])?\s*=\s*\[/;
    const arrayTypePattern = /^\s*(?:export\s+)?(?:const|let)\s+([a-z][a-zA-Z0-9]*)\s*:\s*(?:Array<|[A-Za-z]+\[\])/;

    // Common singular words that should be plural for arrays
    const singularWords = ['user', 'item', 'product', 'order', 'message', 'file', 'image', 'post', 'comment', 'task', 'event', 'error', 'result', 'option', 'value', 'key', 'name', 'id', 'email', 'notification', 'payment', 'transaction'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.shouldSkipLine(line)) continue;

      let match = line.match(arrayPattern) || line.match(arrayTypePattern);
      if (match) {
        const arrayName = match[1];

        // Skip if already plural (ends with 's', 'es', or 'ies')
        if (/s$|es$|ies$/.test(arrayName)) continue;

        // Skip if it's a known abbreviation or short name
        if (this.skipPatterns.okAbbreviations.includes(arrayName.toLowerCase())) continue;

        // Skip if name ends with List, Array, Collection, etc.
        if (/List$|Array$|Collection$|Set$|Map$|Queue$|Stack$/.test(arrayName)) continue;

        // Check if it's a singular word that should be plural
        const lowerName = arrayName.toLowerCase();
        const isSingular = singularWords.some(word => lowerName === word || lowerName.endsWith(word));

        if (!isSingular) continue;

        const suggested = this.pluralize(arrayName);

        this.issues.push({
          severity: 'quality',
          category: 'naming-convention',
          file: file.relativePath,
          line: i + 1,
          message: `Array '${arrayName}' should have a plural name`,
          impact: 'Array names should indicate they contain multiple items',
          fix: `Rename to ${suggested}`,
          seniorSays: `One ${arrayName} or many ${suggested}? Arrays hold many things, name them accordingly.`,
          before: line.trim(),
          after: line.trim().replace(new RegExp(`\\b${arrayName}\\b`), suggested)
        });
      }
    }
  }

  // Helper methods
  shouldSkipLine(line) {
    return this.skipPatterns.skipLinePatterns.some(pattern => pattern.test(line));
  }

  toUpperSnakeCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toUpperCase();
  }

  toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  pluralize(str) {
    if (str.endsWith('y') && !/[aeiou]y$/i.test(str)) {
      return str.slice(0, -1) + 'ies';
    }
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) {
      return str + 'es';
    }
    return str + 's';
  }
}

module.exports = NamingConventionAnalyzer;