/**
 * Service Tracer Utility
 *
 * Service files থেকে database operations, helper calls, external API calls trace করে
 */

const fs = require('fs');
const CodeParser = require('./codeParser');

class ServiceTracer {
  constructor() {
    this.parser = new CodeParser();
  }

  /**
   * Service method analyze করে
   *
   * @param {string} serviceFile - Service file path
   * @param {string} methodName - Method name
   * @returns {Object} Method analysis
   */
  traceMethod(serviceFile, methodName) {
    if (!fs.existsSync(serviceFile)) {
      console.warn(`⚠️  Service file not found: ${serviceFile}`);
      return null;
    }

    const content = fs.readFileSync(serviceFile, 'utf-8');
    const methodInfo = this.findMethodDefinition(content, methodName);

    if (!methodInfo) {
      return null;
    }

    return {
      methodName,
      modelOperations: this.extractModelOperations(methodInfo.body),
      helperCalls: this.extractHelperCalls(methodInfo.body),
      serviceToServiceCalls: this.extractServiceCalls(methodInfo.body),
      socketEvents: this.extractSocketEvents(methodInfo.body),
      externalAPICalls: this.extractExternalAPICalls(methodInfo.body),
      queryBuilderUsage: this.extractQueryBuilderUsage(methodInfo.body),
      lineNumber: methodInfo.lineNumber,
    };
  }

  /**
   * Method definition খুঁজে বের করে
   * Supports: const methodName = async (, const methodName = async (params): ReturnType => {
   * Enhanced: Better TypeScript return type handling
   */
  findMethodDefinition(content, methodName) {
    const lines = content.split('\n');

    // Multiple patterns to handle different TypeScript function definitions
    // Order matters - more specific patterns first
    const patterns = [
      // Pattern 1: const methodName = async (params): Promise<Type> => { (TypeScript with Promise return)
      new RegExp(`const\\s+${methodName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*:\\s*Promise\\s*<[^>]+>\\s*=>`),
      // Pattern 2: const methodName = async (params): Type => (TypeScript generic return)
      new RegExp(`const\\s+${methodName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*:\\s*[^=]+\\s*=>`),
      // Pattern 3: const methodName = async ( (simple async arrow)
      new RegExp(`const\\s+${methodName}\\s*=\\s*async\\s*\\(`),
      // Pattern 4: const methodName = (params): Type => { (non-async with return type)
      new RegExp(`const\\s+${methodName}\\s*=\\s*\\([^)]*\\)\\s*:\\s*[^=]+\\s*=>\\s*\\{`),
      // Pattern 5: const methodName = (params) => { (non-async arrow)
      new RegExp(`const\\s+${methodName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
      // Pattern 6: export const methodName = async (params): Type =>
      new RegExp(`export\\s+const\\s+${methodName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*:\\s*[^=]+\\s*=>`),
      // Pattern 7: export const methodName = async (
      new RegExp(`export\\s+const\\s+${methodName}\\s*=\\s*async\\s*\\(`),
      // Pattern 8: function methodName (
      new RegExp(`function\\s+${methodName}\\s*\\(`),
      // Pattern 9: async function methodName (
      new RegExp(`async\\s+function\\s+${methodName}\\s*\\(`),
    ];

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of patterns) {
        if (pattern.test(lines[i])) {
          return {
            methodName,
            lineNumber: i + 1,
            body: this.extractMethodBody(lines, i),
          };
        }
      }
    }

    return null;
  }

  /**
   * Method body extract করে
   */
  extractMethodBody(lines, startLine) {
    let body = '';
    let braceCount = 0;
    let started = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }
      body += line + '\n';
      if (started && braceCount === 0) break;
    }

    return body;
  }

  /**
   * Model operations (Mongoose queries) extract করে
   */
  extractModelOperations(body) {
    const operations = [];
    const patterns = {
      find: /(\w+)\.find\(([^)]*)\)/g,
      findOne: /(\w+)\.findOne\(([^)]*)\)/g,
      findById: /(\w+)\.findById\(([^)]*)\)/g,
      create: /(\w+)\.create\(([^)]*)\)/g,
      updateOne: /(\w+)\.updateOne\(([^)]*)\)/g,
      updateMany: /(\w+)\.updateMany\(([^)]*)\)/g,
      deleteOne: /(\w+)\.deleteOne\(([^)]*)\)/g,
      findByIdAndUpdate: /(\w+)\.findByIdAndUpdate\(([^)]*)\)/g,
      aggregate: /(\w+)\.aggregate\(([^)]*)\)/g,
      countDocuments: /(\w+)\.countDocuments\(([^)]*)\)/g,
      save: /(\w+)\.save\(\)/g,
    };

    Object.entries(patterns).forEach(([operation, pattern]) => {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        operations.push({
          model: match[1],
          operation,
          query: match[2] ? match[2].trim().substring(0, 50) : '',
        });
      }
    });

    return operations;
  }

  /**
   * Helper function calls extract করে
   */
  extractHelperCalls(body) {
    const helpers = [];
    const helperPatterns = {
      jwtHelper: /jwtHelper\.(\w+)\(/g,
      emailHelper: /emailHelper\.(\w+)\(/g,
      isOnline: /isOnline\(/g,
      incrementUnreadCount: /incrementUnreadCount\(/g,
      setUnreadCount: /setUnreadCount\(/g,
      sendNotifications: /sendNotifications\(/g,
    };

    Object.entries(helperPatterns).forEach(([name, pattern]) => {
      if (pattern.test(body)) {
        const matches = body.match(pattern);
        if (matches) {
          helpers.push({
            helper: name,
            calls: matches.length,
          });
        }
      }
    });

    return helpers;
  }

  /**
   * Service-to-service calls extract করে
   */
  extractServiceCalls(body) {
    const calls = [];
    const servicePattern = /(\w+Service)\.(\w+)\(/g;
    let match;

    while ((match = servicePattern.exec(body)) !== null) {
      calls.push({
        service: match[1],
        method: match[2],
      });
    }

    return calls;
  }

  /**
   * Socket.IO events extract করে
   * Enhanced: Room/target information সহ extract করে
   * Fixed: Template literal with parentheses support
   */
  extractSocketEvents(body) {
    const events = [];

    // Pattern 1: io.to('room').emit('EVENT', data) - Room-based emit
    // Fixed: Use ([\s\S]*?) instead of ([^)]+) to handle template literals with parentheses
    // Example: io.to(`chat::${String(payload?.chatId)}`).emit('MESSAGE_SENT', {...})
    const roomEmitPattern = /io\.to\s*\(([\s\S]*?)\)\.emit\s*\(\s*['"`]([^'"`]+)['"`]/g;

    // Pattern 2: io.emit('event::target', data) or socketIo.emit(...) - Direct emit
    const directEmitPattern = /(?:io|socketIo)\.emit\s*\(\s*['"`]([^'"`]+)['"`]/g;

    let match;

    // Extract room-based emits (e.g., io.to('chat::chatId').emit('MESSAGE_SENT', {...}))
    while ((match = roomEmitPattern.exec(body)) !== null) {
      events.push({
        type: 'room-emit',
        room: this.normalizeRoomExpression(match[1]),
        event: match[2],
        rawRoom: match[1],
      });
    }

    // Extract direct emits (e.g., io.emit('get-notification::userId', {...}))
    while ((match = directEmitPattern.exec(body)) !== null) {
      const eventStr = match[1];
      // Skip if already captured by room pattern
      const alreadyCaptured = events.some(e => e.event === eventStr);
      if (!alreadyCaptured) {
        events.push({
          type: eventStr.includes('::') ? 'user-emit' : 'broadcast',
          event: eventStr,
          target: this.extractTargetFromEvent(eventStr),
        });
      }
    }

    return events;
  }

  /**
   * Room expression normalize করে
   * Example: `chat::${String(payload?.chatId)}` → "chat::{chatId}"
   */
  normalizeRoomExpression(rawRoom) {
    // Pattern: Template literal with variable - `chat::${chatId}` or `chat::${String(payload?.chatId)}`
    const templateMatch = rawRoom.match(/[`'"]?([^$`'"]+)\$\{[^}]*?(\w+Id?)[^}]*\}/);
    if (templateMatch) {
      return `${templateMatch[1]}{${templateMatch[2]}}`;
    }

    // Pattern: CHAT_ROOM(chatId) helper function
    const helperMatch = rawRoom.match(/CHAT_ROOM\s*\(\s*(?:String\s*\(\s*)?(\w+)/);
    if (helperMatch) {
      return `chat::{${helperMatch[1]}}`;
    }

    // Pattern: USER_ROOM(userId) helper function
    const userRoomMatch = rawRoom.match(/USER_ROOM\s*\(\s*(?:String\s*\(\s*)?(\w+)/);
    if (userRoomMatch) {
      return `user::{${userRoomMatch[1]}}`;
    }

    // Pattern: String concatenation - 'chat::' + chatId
    const concatMatch = rawRoom.match(/['"]([^'"]+)['"]\s*\+\s*(\w+)/);
    if (concatMatch) {
      return `${concatMatch[1]}{${concatMatch[2]}}`;
    }

    // Clean up quotes and backticks
    return rawRoom.replace(/[`'"]/g, '').trim();
  }

  /**
   * Event string থেকে target extract করে
   * Example: "get-notification::${userId}" → "userId"
   */
  extractTargetFromEvent(eventStr) {
    if (eventStr.includes('::')) {
      const parts = eventStr.split('::');
      // Clean up template literal syntax
      const target = parts[1] || 'dynamic';
      return target.replace(/\$\{|\}/g, '').trim();
    }
    return null;
  }

  /**
   * External API calls extract করে (Stripe, Firebase, etc.)
   */
  extractExternalAPICalls(body) {
    const apis = [];

    // Stripe calls
    if (/stripe\./i.test(body) || /StripeAdapter\./i.test(body)) {
      const stripePattern = /(?:stripe|StripeAdapter)\.(\w+)\(/gi;
      let match;
      while ((match = stripePattern.exec(body)) !== null) {
        apis.push({
          api: 'Stripe',
          method: match[1],
        });
      }
    }

    // Firebase calls
    if (/firebase/i.test(body) || /admin\.messaging/i.test(body)) {
      apis.push({
        api: 'Firebase',
        method: 'send',
      });
    }

    // S3 calls
    if (/s3\./i.test(body) || /S3Client/i.test(body)) {
      apis.push({
        api: 'AWS S3',
        method: 'upload',
      });
    }

    return apis;
  }

  /**
   * QueryBuilder/AggregationBuilder usage extract করে
   */
  extractQueryBuilderUsage(body) {
    const builders = [];

    if (/new\s+QueryBuilder\(/i.test(body)) {
      builders.push({
        type: 'QueryBuilder',
        methods: this.extractBuilderMethods(body, 'QueryBuilder'),
      });
    }

    if (/new\s+AggregationBuilder\(/i.test(body)) {
      builders.push({
        type: 'AggregationBuilder',
        methods: this.extractBuilderMethods(body, 'AggregationBuilder'),
      });
    }

    return builders;
  }

  /**
   * Builder methods extract করে
   */
  extractBuilderMethods(body, builderType) {
    const methods = [];
    const builderMethods = [
      'search',
      'filter',
      'sort',
      'paginate',
      'fields',
      'match',
      'lookup',
      'group',
      'unwind',
    ];

    builderMethods.forEach(method => {
      const pattern = new RegExp(`\\.${method}\\(`, 'g');
      if (pattern.test(body)) {
        methods.push(method);
      }
    });

    return methods;
  }

  /**
   * Complete service file analyze করে
   */
  analyzeService(serviceFile) {
    if (!fs.existsSync(serviceFile)) {
      return { error: 'Service file not found' };
    }

    const exports = this.parser.extractExports(serviceFile);
    const methods = exports.map(exp => exp.name);

    const methodsAnalysis = {};
    methods.forEach(methodName => {
      methodsAnalysis[methodName] = this.traceMethod(serviceFile, methodName);
    });

    return {
      serviceFile,
      methods,
      methodsAnalysis,
      totalMethods: methods.length,
    };
  }
}

module.exports = ServiceTracer;
