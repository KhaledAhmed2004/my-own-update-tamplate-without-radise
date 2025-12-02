const fs = require('fs');
const path = require('path');

/**
 * Route Comment Analyzer
 *
 * Analyzes route files to detect missing comments and suggests meaningful descriptions.
 *
 * Usage:
 *   node scripts/postman/analyze-routes.js                 # Analyze all modules
 *   node scripts/postman/analyze-routes.js auth            # Analyze specific module
 *   node scripts/postman/analyze-routes.js --suggest       # Show suggestions only
 *   node scripts/postman/analyze-routes.js --fix           # Auto-add comments
 *   node scripts/postman/analyze-routes.js auth --fix      # Fix specific module
 */

class RouteCommentAnalyzer {
  constructor() {
    this.stats = {
      totalRoutes: 0,
      withComments: 0,
      missingComments: 0,
      fixed: 0,
    };
    this.findings = [];
  }

  /**
   * Main analysis method
   */
  async analyze(moduleName = null, options = {}) {
    try {
      console.log('🔍 Starting route comment analysis...\n');

      const modules = moduleName
        ? [moduleName]
        : await this.getAllModules();

      if (modules.length === 0) {
        console.log('❌ No modules found to analyze');
        return;
      }

      for (const module of modules) {
        await this.analyzeModule(module, options);
      }

      this.generateReport();

      if (options.fix && this.stats.fixed > 0) {
        console.log(
          `\n✅ Successfully added ${this.stats.fixed} comments to route files!`
        );
      }
    } catch (error) {
      console.error('❌ Error during analysis:', error.message);
    }
  }

  /**
   * Get all available modules
   */
  async getAllModules() {
    const modulesPath = path.join(process.cwd(), 'src', 'app', 'modules');
    if (!fs.existsSync(modulesPath)) {
      return [];
    }

    return fs
      .readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

  /**
   * Analyze a specific module
   */
  async analyzeModule(moduleName, options) {
    const routeFile = this.findRouteFile(moduleName);

    if (!routeFile) {
      console.log(`⚠️  Module '${moduleName}': No route file found`);
      return;
    }

    const content = fs.readFileSync(routeFile, 'utf8');
    const routes = this.parseRoutes(content);

    const moduleFindings = {
      moduleName,
      routeFile,
      withComments: [],
      missingComments: [],
    };

    routes.forEach(route => {
      this.stats.totalRoutes++;

      if (route.hasComment) {
        this.stats.withComments++;
        moduleFindings.withComments.push(route);
      } else {
        this.stats.missingComments++;
        const suggestion = this.generateSuggestion(route, moduleName);
        moduleFindings.missingComments.push({ ...route, suggestion });
      }
    });

    this.findings.push(moduleFindings);

    // Auto-fix if requested
    if (options.fix && moduleFindings.missingComments.length > 0) {
      await this.fixRouteFile(routeFile, moduleFindings.missingComments);
    }
  }

  /**
   * Find route file for a module
   */
  findRouteFile(moduleName) {
    const possibleNames = [
      `${moduleName}.route.ts`,
      `${moduleName}.routes.ts`,
      `${moduleName}s.route.ts`,
      'routes.ts',
      'route.ts',
    ];

    const modulePath = path.join(
      process.cwd(),
      'src',
      'app',
      'modules',
      moduleName
    );

    for (const fileName of possibleNames) {
      const filePath = path.join(modulePath, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Parse routes from file content
   */
  parseRoutes(content) {
    const lines = content.split('\n');
    const routes = [];

    // Match router method calls
    const routeRegex =
      /router\.(get|post|put|patch|delete)\s*\(\s*['\"`]([^'\"`]+)['\"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const [fullMatch, method, routePath] = match;

      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      // Check for preceding comment
      let hasComment = false;
      let commentText = null;

      for (let i = lineNumber - 2; i >= Math.max(0, lineNumber - 5); i--) {
        const line = lines[i]?.trim() || '';

        // Stop if we hit another route
        if (line.startsWith('router.')) {
          break;
        }

        // Check for comment
        if (line.startsWith('//')) {
          hasComment = true;
          commentText = line.replace('//', '').trim();
          break;
        } else if (line.startsWith('/*') || line.startsWith('*')) {
          hasComment = true;
          commentText = line.replace(/^\/\*|\*\/|\*/g, '').trim();
          if (commentText) break;
        }
      }

      routes.push({
        method: method.toUpperCase(),
        path: routePath,
        lineNumber,
        hasComment,
        commentText,
        fullMatch,
      });
    }

    return routes;
  }

  /**
   * Generate smart comment suggestion
   */
  generateSuggestion(route, moduleName) {
    const { method, path } = route;

    // Module-specific patterns
    const modulePatterns = {
      chat: {
        '/:otherUserId': method === 'POST' ? 'Create Chat' : null,
        '/': method === 'GET' ? 'Get User Chats' : null,
      },
      message: {
        '/': method === 'POST' ? 'Send Message' : null,
        '/:id': method === 'GET' ? 'Get Messages' : null,
      },
    };

    // Check module-specific patterns first
    if (modulePatterns[moduleName] && modulePatterns[moduleName][path]) {
      return modulePatterns[moduleName][path];
    }

    // Special patterns for common endpoints
    const patterns = {
      // Auth patterns
      '/login': 'User Login',
      '/register': 'User Registration',
      '/logout': 'User Logout',
      '/refresh-token': 'Refresh Access Token',
      '/forget-password': 'Request Password Reset',
      '/reset-password': 'Reset Password',
      '/change-password': 'Change Password',
      '/verify-email': 'Verify Email Address',
      '/resend-verify-email': 'Resend Email Verification',

      // Google OAuth
      '/google': 'Google OAuth Login',
      '/google/callback': 'Google OAuth Callback',

      // Profile patterns
      '/profile': 'Get User Profile',
      '/me': 'Get Current User',

      // Common CRUD patterns
      '/': method === 'GET' ? 'Get All' : method === 'POST' ? 'Create' : null,
    };

    // Check exact path match
    if (patterns[path]) {
      return patterns[path];
    }

    // Path parameter patterns
    if (path.includes(':id')) {
      if (method === 'GET') return 'Get by ID';
      if (method === 'PUT' || method === 'PATCH') return 'Update by ID';
      if (method === 'DELETE') return 'Delete by ID';
    }

    // Block/Unblock patterns
    if (path.includes('/block')) return 'Block User';
    if (path.includes('/unblock')) return 'Unblock User';

    // File upload patterns
    if (
      path.includes('/upload') ||
      path.includes('/avatar') ||
      path.includes('/picture')
    ) {
      return 'Upload File';
    }

    // Payment patterns
    if (path.includes('/payment')) {
      if (method === 'POST') return 'Create Payment';
      if (method === 'GET') return 'Get Payment';
    }

    if (path.includes('/refund')) return 'Process Refund';
    if (path.includes('/webhook')) return 'Handle Webhook';

    // Chat/Message patterns
    if (path.includes('/send')) return 'Send Message';
    if (path.includes('/read')) return 'Mark as Read';
    if (path.includes('/unread')) return 'Get Unread Messages';

    // Notification patterns
    if (path.includes('/notification')) {
      if (method === 'GET') return 'Get Notifications';
      if (method === 'PATCH' && path.includes('/read'))
        return 'Mark Notification as Read';
    }

    // Bookmark patterns
    if (path.includes('/bookmark')) {
      if (method === 'POST') return 'Toggle Bookmark';
      if (method === 'GET') return 'Get Bookmarks';
    }

    // Generic fallback based on path structure
    const pathParts = path
      .split('/')
      .filter(p => p && !p.startsWith(':'))
      .map(p =>
        p
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      );

    if (pathParts.length > 0) {
      const action = {
        GET: 'Get',
        POST: 'Create',
        PUT: 'Update',
        PATCH: 'Update',
        DELETE: 'Delete',
      }[method];

      return `${action} ${pathParts.join(' ')}`;
    }

    // Ultimate fallback
    return `${method} ${path}`;
  }

  /**
   * Auto-fix route file by adding comments
   */
  async fixRouteFile(routeFile, missingComments) {
    // Create backup first
    const backupPath = routeFile.replace('.ts', `.backup-${Date.now()}.ts`);
    fs.copyFileSync(routeFile, backupPath);
    console.log(`📦 Backup created: ${path.basename(backupPath)}`);

    let content = fs.readFileSync(routeFile, 'utf8');
    const lines = content.split('\n');

    // Sort by line number (descending) to avoid offset issues
    const sorted = [...missingComments].sort(
      (a, b) => b.lineNumber - a.lineNumber
    );

    let addedCount = 0;

    sorted.forEach(({ lineNumber, suggestion }) => {
      const targetLine = lineNumber - 1; // Convert to 0-based index
      const routeLine = lines[targetLine];

      // Get indentation from route line
      const indentMatch = routeLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';

      // Insert comment above route
      const commentLine = `${indent}// ${suggestion}`;
      lines.splice(targetLine, 0, commentLine);
      addedCount++;
    });

    // Write back to file
    fs.writeFileSync(routeFile, lines.join('\n'), 'utf8');
    this.stats.fixed += addedCount;

    console.log(`✅ Added ${addedCount} comments to ${path.basename(routeFile)}`);
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    console.log('\n📊 Route Comment Analysis Report\n');
    console.log('='.repeat(60));

    this.findings.forEach(finding => {
      const { moduleName, withComments, missingComments } = finding;

      console.log(`\nModule: ${this.capitalizeFirst(moduleName)}`);

      if (withComments.length > 0) {
        console.log(`  ✅ ${withComments.length} routes with comments`);
      }

      if (missingComments.length > 0) {
        console.log(
          `  ⚠️  ${missingComments.length} routes missing comments:`
        );
        missingComments.forEach(({ method, path, suggestion }) => {
          console.log(`    - ${method} ${path} → Suggested: "${suggestion}"`);
        });
      } else {
        console.log('  🎉 All routes have comments!');
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('\nSummary:');
    console.log(`  Total Routes: ${this.stats.totalRoutes}`);
    console.log(
      `  With Comments: ${this.stats.withComments} (${this.getPercentage(this.stats.withComments, this.stats.totalRoutes)}%)`
    );
    console.log(
      `  Missing Comments: ${this.stats.missingComments} (${this.getPercentage(this.stats.missingComments, this.stats.totalRoutes)}%)`
    );

    if (this.stats.missingComments > 0) {
      console.log(
        '\n💡 Tip: Run with --fix to automatically add suggested comments'
      );
      console.log('   Example: node scripts/postman/analyze-routes.js --fix');
    }
  }

  /**
   * Calculate percentage
   */
  getPercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let moduleName = null;
  let options = {
    suggest: false,
    fix: false,
  };

  args.forEach(arg => {
    if (arg === '--suggest') {
      options.suggest = true;
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('--')) {
      moduleName = arg;
    }
  });

  const analyzer = new RouteCommentAnalyzer();
  await analyzer.analyze(moduleName, options);
}

function showHelp() {
  console.log(`
📝 Route Comment Analyzer - Help

Usage:
  node scripts/postman/analyze-routes.js [module] [options]

Commands:
  node scripts/postman/analyze-routes.js              # Analyze all modules
  node scripts/postman/analyze-routes.js auth         # Analyze specific module
  node scripts/postman/analyze-routes.js --suggest    # Show suggestions only
  node scripts/postman/analyze-routes.js --fix        # Auto-add comments
  node scripts/postman/analyze-routes.js auth --fix   # Fix specific module

Options:
  --suggest    Show suggestions without modifying files (default behavior)
  --fix        Automatically add suggested comments to route files
  --help, -h   Show this help message

Examples:
  # Check which routes are missing comments
  node scripts/postman/analyze-routes.js

  # Analyze only auth module
  node scripts/postman/analyze-routes.js auth

  # Automatically add comments to all route files
  node scripts/postman/analyze-routes.js --fix

  # Fix only user module routes
  node scripts/postman/analyze-routes.js user --fix

Notes:
  - Backup files are created before any modifications
  - Comments are added based on route patterns and best practices
  - Review suggestions before using --fix option
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RouteCommentAnalyzer;
