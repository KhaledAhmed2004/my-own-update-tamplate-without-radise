/**
 * Code Parser Utility
 *
 * TypeScript/JavaScript code parse করার জন্য @babel/parser ব্যবহার করে
 * AST (Abstract Syntax Tree) তৈরি করে এবং code analysis করে
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

class CodeParser {
  constructor() {
    this.parserOptions = {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'asyncGenerators',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
    };
  }

  /**
   * File থেকে code read করে AST তৈরি করে
   *
   * @param {string} filePath - File path
   * @returns {Object} AST object
   */
  parseFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}`);
        return null;
      }

      const code = fs.readFileSync(filePath, 'utf-8');
      return this.parseCode(code);
    } catch (error) {
      console.error(`❌ Error parsing file ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Code string থেকে AST তৈরি করে
   *
   * @param {string} code - Source code string
   * @returns {Object} AST object
   */
  parseCode(code) {
    try {
      return parser.parse(code, this.parserOptions);
    } catch (error) {
      console.error('❌ Error parsing code:', error.message);
      return null;
    }
  }

  /**
   * File থেকে সমস্ত imports extract করে
   *
   * @param {string} filePath - File path
   * @returns {Array} Import statements
   */
  extractImports(filePath) {
    const ast = this.parseFile(filePath);
    if (!ast) return [];

    const imports = [];

    traverse(ast, {
      ImportDeclaration(path) {
        const importInfo = {
          source: path.node.source.value,
          specifiers: [],
          type: 'import',
        };

        path.node.specifiers.forEach(specifier => {
          if (specifier.type === 'ImportDefaultSpecifier') {
            importInfo.specifiers.push({
              local: specifier.local.name,
              imported: 'default',
              type: 'default',
            });
          } else if (specifier.type === 'ImportSpecifier') {
            importInfo.specifiers.push({
              local: specifier.local.name,
              imported: specifier.imported.name,
              type: 'named',
            });
          } else if (specifier.type === 'ImportNamespaceSpecifier') {
            importInfo.specifiers.push({
              local: specifier.local.name,
              imported: '*',
              type: 'namespace',
            });
          }
        });

        imports.push(importInfo);
      },

      // CommonJS require statements
      VariableDeclarator(path) {
        if (
          path.node.init &&
          path.node.init.type === 'CallExpression' &&
          path.node.init.callee.name === 'require'
        ) {
          const source = path.node.init.arguments[0]?.value;
          if (source) {
            imports.push({
              source,
              specifiers: [
                {
                  local: path.node.id.name,
                  imported: 'default',
                  type: 'require',
                },
              ],
              type: 'require',
            });
          }
        }
      },
    });

    return imports;
  }

  /**
   * File থেকে সমস্ত function/method calls extract করে
   *
   * @param {string} filePath - File path
   * @param {string} targetFunction - Specific function name (optional)
   * @returns {Array} Function calls
   */
  extractFunctionCalls(filePath, targetFunction = null) {
    const ast = this.parseFile(filePath);
    if (!ast) return [];

    const calls = [];

    traverse(ast, {
      CallExpression(path) {
        const call = {
          name: null,
          object: null,
          arguments: [],
          line: path.node.loc?.start.line,
        };

        // Handle different call types
        if (path.node.callee.type === 'Identifier') {
          // Simple function call: functionName()
          call.name = path.node.callee.name;
        } else if (path.node.callee.type === 'MemberExpression') {
          // Method call: object.method()
          call.object = path.node.callee.object.name;
          call.name = path.node.callee.property.name;
        }

        // Extract arguments
        path.node.arguments.forEach(arg => {
          if (arg.type === 'Identifier') {
            call.arguments.push({ type: 'variable', value: arg.name });
          } else if (arg.type === 'StringLiteral') {
            call.arguments.push({ type: 'string', value: arg.value });
          } else if (arg.type === 'NumericLiteral') {
            call.arguments.push({ type: 'number', value: arg.value });
          } else if (arg.type === 'ObjectExpression') {
            call.arguments.push({ type: 'object', value: '{...}' });
          } else if (arg.type === 'ArrayExpression') {
            call.arguments.push({ type: 'array', value: '[...]' });
          } else if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
            call.arguments.push({ type: 'function', value: '() => {...}' });
          }
        });

        // Filter by target function if specified
        if (!targetFunction || call.name === targetFunction) {
          calls.push(call);
        }
      },
    });

    return calls;
  }

  /**
   * File থেকে সমস্ত exported functions/classes extract করে
   *
   * @param {string} filePath - File path
   * @returns {Array} Exports
   */
  extractExports(filePath) {
    const ast = this.parseFile(filePath);
    if (!ast) return [];

    const exports = [];

    traverse(ast, {
      // Named exports: export const foo = ...
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          if (path.node.declaration.type === 'VariableDeclaration') {
            path.node.declaration.declarations.forEach(decl => {
              exports.push({
                name: decl.id.name,
                type: 'variable',
                kind: 'named',
              });
            });
          } else if (path.node.declaration.type === 'FunctionDeclaration') {
            exports.push({
              name: path.node.declaration.id.name,
              type: 'function',
              kind: 'named',
            });
          } else if (path.node.declaration.type === 'ClassDeclaration') {
            exports.push({
              name: path.node.declaration.id.name,
              type: 'class',
              kind: 'named',
            });
          }
        }
      },

      // Default exports: export default ...
      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration;
        let name = 'default';

        if (declaration.type === 'Identifier') {
          name = declaration.name;
        } else if (declaration.type === 'FunctionDeclaration') {
          name = declaration.id?.name || 'default';
        } else if (declaration.type === 'ClassDeclaration') {
          name = declaration.id?.name || 'default';
        }

        exports.push({
          name,
          type: declaration.type.toLowerCase().replace('declaration', ''),
          kind: 'default',
        });
      },

      // CommonJS: module.exports = ...
      AssignmentExpression(path) {
        if (
          path.node.left.type === 'MemberExpression' &&
          path.node.left.object.name === 'module' &&
          path.node.left.property.name === 'exports'
        ) {
          exports.push({
            name: 'module.exports',
            type: 'commonjs',
            kind: 'default',
          });
        }
      },
    });

    return exports;
  }

  /**
   * Class থেকে সমস্ত methods extract করে
   *
   * @param {string} filePath - File path
   * @param {string} className - Class name (optional)
   * @returns {Array} Methods
   */
  extractClassMethods(filePath, className = null) {
    const ast = this.parseFile(filePath);
    if (!ast) return [];

    const methods = [];

    traverse(ast, {
      ClassDeclaration(path) {
        const currentClassName = path.node.id.name;

        // Filter by class name if specified
        if (className && currentClassName !== className) {
          return;
        }

        path.node.body.body.forEach(member => {
          if (member.type === 'ClassMethod') {
            methods.push({
              className: currentClassName,
              name: member.key.name,
              kind: member.kind, // 'constructor', 'method', 'get', 'set'
              static: member.static,
              async: member.async,
              params: member.params.map(param => param.name || '...'),
              line: member.loc?.start.line,
            });
          }
        });
      },
    });

    return methods;
  }

  /**
   * Mongoose model operations খুঁজে বের করে
   *
   * @param {string} filePath - File path
   * @returns {Array} Model operations
   */
  extractModelOperations(filePath) {
    const ast = this.parseFile(filePath);
    if (!ast) return [];

    const operations = [];
    const modelOperations = [
      'find',
      'findOne',
      'findById',
      'create',
      'insertMany',
      'updateOne',
      'updateMany',
      'findByIdAndUpdate',
      'findOneAndUpdate',
      'deleteOne',
      'deleteMany',
      'findByIdAndDelete',
      'findOneAndDelete',
      'countDocuments',
      'aggregate',
      'exists',
      'save',
    ];

    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.type === 'MemberExpression') {
          const methodName = path.node.callee.property.name;

          if (modelOperations.includes(methodName)) {
            operations.push({
              model: path.node.callee.object.name,
              operation: methodName,
              line: path.node.loc?.start.line,
            });
          }
        }
      },
    });

    return operations;
  }

  /**
   * Socket.IO emit/on calls খুঁজে বের করে
   *
   * @param {string} filePath - File path
   * @returns {Array} Socket events
   */
  extractSocketEvents(filePath) {
    const ast = this.parseFile(filePath);
    if (!ast) return [];

    const events = [];

    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.type === 'MemberExpression') {
          const methodName = path.node.callee.property.name;

          if (['emit', 'on', 'to'].includes(methodName)) {
            const eventName = path.node.arguments[0]?.value;

            events.push({
              type: methodName,
              event: eventName || 'unknown',
              object: path.node.callee.object.name,
              line: path.node.loc?.start.line,
            });
          }
        }
      },
    });

    return events;
  }

  /**
   * Middleware calls খুঁজে বের করে (auth, validateRequest, etc.)
   *
   * @param {string} filePath - File path
   * @returns {Array} Middleware calls
   */
  extractMiddlewareCalls(filePath) {
    const ast = this.parseFile(filePath);
    if (!ast) return [];

    const middlewares = [];
    const knownMiddlewares = [
      'auth',
      'validateRequest',
      'fileHandler',
      'fileUploadHandler',
      'rateLimit',
      'catchAsync',
    ];

    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.type === 'Identifier') {
          const name = path.node.callee.name;

          if (knownMiddlewares.includes(name)) {
            middlewares.push({
              name,
              arguments: path.node.arguments.map(arg => {
                if (arg.type === 'Identifier') return arg.name;
                if (arg.type === 'StringLiteral') return arg.value;
                return '...';
              }),
              line: path.node.loc?.start.line,
            });
          }
        }
      },
    });

    return middlewares;
  }

  /**
   * Helper utility: Resolve relative import path to absolute
   *
   * @param {string} fromFile - Current file path
   * @param {string} importPath - Import path from code
   * @returns {string} Resolved absolute path
   */
  resolveImportPath(fromFile, importPath) {
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromFile);
      let resolved = path.resolve(dir, importPath);

      // Try adding .ts, .js extensions
      const extensions = ['.ts', '.js', '/index.ts', '/index.js'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }

      return resolved;
    }

    return importPath; // External package
  }
}

module.exports = CodeParser;
