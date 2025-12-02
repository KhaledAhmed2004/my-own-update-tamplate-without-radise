const fs = require('fs');
const path = require('path');

/**
 * Enhanced Postman Collection Generator
 *
 * Features:
 * - Generate all modules in one collection
 * - Smart merge (preserve existing data)
 * - Collection variables with auto-token injection
 * - Pre-request and test scripts
 * - File upload support
 * - Environment files generation
 * - Automatic backups
 *
 * Usage:
 *   node scripts/postman/generate-all.js              # All modules
 *   node scripts/postman/generate-all.js auth         # Single module
 *   node scripts/postman/generate-all.js --env        # Generate environments
 *   node scripts/postman/generate-all.js --force      # Force fresh generation
 */

class EnhancedPostmanGenerator {
  constructor() {
    this.baseUrl = '{{BASE_URL}}';
    this.apiPrefix = '/api/v1';
    this.collection = {
      info: {
        name: 'Complete API Collection',
        description:
          'Auto-generated Postman collection with smart merge and auto-authentication',
        schema:
          'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
      variable: [],
      event: [], // Collection-level scripts
    };

    // Module configurations
    this.moduleConfig = {
      auth: { path: '/auth', priority: 1 },
      user: { path: '/user', priority: 2 },
      chat: { path: '/chats', priority: 3 },
      message: { path: '/messages', priority: 4 },
      payment: { path: '/payments', priority: 5 },
      bookmark: { path: '/bookmarks', priority: 6 },
      notification: { path: '/notifications', priority: 7 },
    };
  }

  /**
   * Main entry point
   */
  async run(args) {
    try {
      // Parse arguments
      const options = this.parseArguments(args);

      if (options.help) {
        this.showHelp();
        return;
      }

      if (options.env) {
        await this.generateEnvironmentFiles();
        return;
      }

      // Generate collection
      if (options.module) {
        await this.generateSingleModule(options.module, options);
      } else {
        await this.generateAllModules(options);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Parse command line arguments
   */
  parseArguments(args) {
    const options = {
      module: null,
      force: false,
      env: false,
      help: false,
      noBackup: false,
    };

    args.forEach(arg => {
      if (arg === '--help' || arg === '-h') {
        options.help = true;
      } else if (arg === '--force' || arg === '-f') {
        options.force = true;
      } else if (arg === '--env') {
        options.env = true;
      } else if (arg === '--no-backup') {
        options.noBackup = true;
      } else if (!arg.startsWith('--')) {
        options.module = arg;
      }
    });

    return options;
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(`
📮 Enhanced Postman Collection Generator

Usage:
  node scripts/postman/generate-all.js [options] [module]

Options:
  --help, -h          Show this help message
  --env               Generate environment files
  --force, -f         Force fresh generation (ignore existing)
  --no-backup         Skip backup creation

Examples:
  node scripts/postman/generate-all.js              Generate all modules
  node scripts/postman/generate-all.js auth         Generate auth module
  node scripts/postman/generate-all.js --env        Generate environments
  node scripts/postman/generate-all.js --force      Force fresh collection

Features:
  ✅ Smart merge (preserves your saved tokens/responses)
  ✅ Auto token injection (Bearer token automatic)
  ✅ Auto ID extraction (tokens, chatId, messageId auto-saved)
  ✅ File upload support
  ✅ Collection variables
  ✅ Automatic backups

Available Modules:
  ${Object.keys(this.moduleConfig).join(', ')}
`);
  }

  /**
   * Generate all modules collection
   */
  async generateAllModules(options) {
    console.log('🚀 Generating complete API collection...\n');

    const outputFile = 'complete-api-collection.json';
    const existingCollection = options.force
      ? null
      : this.loadExistingCollection(outputFile);

    if (existingCollection && !options.force) {
      console.log('📂 Found existing collection');
      console.log('🔍 Analyzing changes...\n');
    }

    // Backup existing collection
    if (existingCollection && !options.noBackup) {
      this.createBackup(outputFile);
    }

    // Set collection name
    this.collection.info.name = 'Complete API Collection';
    this.collection.info.description =
      'All API modules with smart authentication and auto-saved variables';

    // Add collection-level scripts
    this.addCollectionScripts();

    // Process all modules
    const modules = Object.keys(this.moduleConfig).sort(
      (a, b) => this.moduleConfig[a].priority - this.moduleConfig[b].priority
    );

    let totalAdded = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;

    for (const moduleName of modules) {
      const moduleExists = await this.validateModule(moduleName);
      if (!moduleExists) {
        console.log(`⚠️  Module '${moduleName}' not found, skipping...`);
        continue;
      }

      console.log(`📊 Processing module: ${moduleName}`);

      // Parse routes
      const routes = await this.parseModuleRoutes(moduleName);

      // Create folder for module
      const moduleFolder = {
        name: `${this.capitalizeFirst(moduleName)} Module`,
        item: [],
        description: `${this.capitalizeFirst(moduleName)} related endpoints`,
      };

      // If existing collection, do smart merge
      if (existingCollection) {
        const existingFolder = this.findModuleFolder(
          existingCollection,
          moduleName
        );
        const changes = this.compareEndpoints(existingFolder, routes);

        totalAdded += changes.toAdd.length;
        totalUpdated += changes.toUpdate.length;
        totalUnchanged += changes.unchanged.length;

        if (changes.toAdd.length > 0) {
          console.log(`  ✅ Added: ${changes.toAdd.length} endpoints`);
        }
        if (changes.toUpdate.length > 0) {
          console.log(`  🔄 Updated: ${changes.toUpdate.length} endpoints`);
        }
        if (changes.unchanged.length > 0) {
          console.log(`  ✓ Unchanged: ${changes.unchanged.length} endpoints`);
        }

        // Merge changes
        this.mergeModuleEndpoints(moduleFolder, existingFolder, changes);
      } else {
        // Fresh generation
        routes.forEach(route => {
          const request = this.createPostmanRequest(route, moduleName);
          moduleFolder.item.push(request);
        });
        totalAdded += routes.length;
        console.log(`  ✅ Created: ${routes.length} endpoints`);
      }

      this.collection.item.push(moduleFolder);
    }

    // Add/merge variables
    this.addCollectionVariables(existingCollection);

    // Save collection
    await this.saveCollection(outputFile);

    // Summary
    console.log('\n📈 Summary:');
    console.log(`  Total endpoints: ${totalAdded + totalUpdated + totalUnchanged}`);
    if (totalAdded > 0) console.log(`  ✅ New: ${totalAdded}`);
    if (totalUpdated > 0) console.log(`  🔄 Updated: ${totalUpdated}`);
    if (totalUnchanged > 0) console.log(`  ✓ Unchanged: ${totalUnchanged}`);

    console.log(
      `\n✅ Collection saved: postman-collections/${outputFile}`
    );
  }

  /**
   * Generate single module collection
   */
  async generateSingleModule(moduleName, options) {
    console.log(`🚀 Generating collection for module: ${moduleName}\n`);

    const moduleExists = await this.validateModule(moduleName);
    if (!moduleExists) {
      console.error(`❌ Module '${moduleName}' not found!`);
      this.listAvailableModules();
      return;
    }

    const outputFile = `${moduleName}-collection.json`;
    const existingCollection = options.force
      ? null
      : this.loadExistingCollection(outputFile);

    if (existingCollection && !options.force) {
      console.log('📂 Found existing collection');
      console.log('🔍 Analyzing changes...\n');
    }

    // Backup
    if (existingCollection && !options.noBackup) {
      this.createBackup(outputFile);
    }

    // Set collection name
    this.collection.info.name = `${this.capitalizeFirst(
      moduleName
    )} API Collection`;
    this.collection.info.description = `${this.capitalizeFirst(
      moduleName
    )} module endpoints`;

    // Add collection-level scripts
    this.addCollectionScripts();

    // Parse routes
    const routes = await this.parseModuleRoutes(moduleName);

    // Smart merge or fresh generation
    if (existingCollection && !options.force) {
      const changes = this.compareEndpoints(existingCollection, routes);

      console.log('📊 Changes detected:');
      console.log(`  ✅ To add: ${changes.toAdd.length}`);
      console.log(`  🔄 To update: ${changes.toUpdate.length}`);
      console.log(`  ✓ Unchanged: ${changes.unchanged.length}\n`);

      // Apply changes
      this.applyChangesToCollection(existingCollection, changes, moduleName);

      // Use merged collection
      this.collection.item = existingCollection.item;
    } else {
      // Fresh generation
      routes.forEach(route => {
        const request = this.createPostmanRequest(route, moduleName);
        this.collection.item.push(request);
      });
      console.log(`✅ Created ${routes.length} endpoints\n`);
    }

    // Add/merge variables
    this.addCollectionVariables(existingCollection);

    // Save
    await this.saveCollection(outputFile);

    console.log(`✅ Collection saved: postman-collections/${outputFile}`);
  }

  /**
   * Validate if module exists
   */
  async validateModule(moduleName) {
    const modulePath = path.join(
      process.cwd(),
      'src',
      'app',
      'modules',
      moduleName
    );
    return fs.existsSync(modulePath);
  }

  /**
   * List available modules
   */
  listAvailableModules() {
    const modulesPath = path.join(process.cwd(), 'src', 'app', 'modules');
    if (fs.existsSync(modulesPath)) {
      const modules = fs
        .readdirSync(modulesPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      console.log('\n📋 Available modules:');
      modules.forEach(module => console.log(`  - ${module}`));
    }
  }

  /**
   * Parse module routes
   */
  async parseModuleRoutes(moduleName) {
    const routeFilePath = path.join(
      process.cwd(),
      'src',
      'app',
      'modules',
      moduleName,
      `${moduleName}.route.ts`
    );

    if (!fs.existsSync(routeFilePath)) {
      // Try alternative naming
      const alternatives = [
        `${moduleName}.routes.ts`,
        `${moduleName}s.route.ts`,
        'routes.ts',
        'route.ts',
      ];

      for (const alt of alternatives) {
        const altPath = path.join(
          process.cwd(),
          'src',
          'app',
          'modules',
          moduleName,
          alt
        );
        if (fs.existsSync(altPath)) {
          return this.parseRouteFile(altPath, moduleName);
        }
      }

      throw new Error(`Route file not found for module: ${moduleName}`);
    }

    return this.parseRouteFile(routeFilePath, moduleName);
  }

  /**
   * Parse route file content
   */
  parseRouteFile(filePath, moduleName) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const routes = [];

    const routeRegex =
      /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const [, method, routePath] = match;
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length - 1;

      // Look for comment above route
      let customName = null;
      for (let i = lineNumber - 1; i >= Math.max(0, lineNumber - 5); i--) {
        const line = lines[i].trim();

        if (line.startsWith('router.')) break;
        if (
          line &&
          !line.startsWith('//') &&
          !line.startsWith('/*') &&
          !line.startsWith('*')
        ) {
          break;
        }

        if (line.startsWith('//')) {
          customName = line.replace('//', '').trim();
          break;
        } else if (line.startsWith('/*') || line.startsWith('*')) {
          customName = line.replace(/^\/\*|\*\/|\*/g, '').trim();
          if (customName) break;
        }
      }

      // Detect if file upload endpoint
      const isFileUpload = this.detectFileUpload(content, match.index);

      routes.push({
        method: method.toUpperCase(),
        path: routePath,
        customName: customName,
        isFileUpload: isFileUpload,
        fullPath: `${this.apiPrefix}${this.moduleConfig[moduleName].path}${routePath}`,
      });
    }

    return routes;
  }

  /**
   * Detect if endpoint has file upload
   */
  detectFileUpload(content, matchIndex) {
    // Look ahead for fileHandler or upload middleware
    const nextLines = content.substring(matchIndex, matchIndex + 500);
    return (
      nextLines.includes('fileHandler') ||
      nextLines.includes('upload.') ||
      nextLines.includes('multer')
    );
  }

  /**
   * Create Postman request
   */
  createPostmanRequest(route, moduleName) {
    const requestName = this.generateRequestName(route);
    const url = `${this.baseUrl}${route.fullPath}`;

    const request = {
      name: requestName,
      request: {
        method: route.method,
        header: this.getDefaultHeaders(route),
        url: {
          raw: url,
          host: ['{{BASE_URL}}'],
          path: route.fullPath.split('/').filter(p => p),
        },
      },
      response: [],
    };

    // Add body for POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
      if (route.isFileUpload) {
        request.request.body = this.generateFileUploadBody(route, moduleName);
      } else {
        request.request.body = {
          mode: 'raw',
          raw: JSON.stringify(
            this.generateSampleBody(route, moduleName),
            null,
            2
          ),
          options: {
            raw: {
              language: 'json',
            },
          },
        };
      }
    }

    // Add test script for specific endpoints
    const testScript = this.generateTestScript(route, moduleName);
    if (testScript) {
      request.event = [
        {
          listen: 'test',
          script: {
            exec: testScript.split('\n'),
            type: 'text/javascript',
          },
        },
      ];
    }

    return request;
  }

  /**
   * Generate request name
   */
  generateRequestName(route) {
    if (route.customName) {
      return route.customName;
    }

    const method = route.method;
    let pathName = route.path;

    if (pathName === '/') {
      return `${method} - Get All`;
    }

    pathName = pathName.replace(/:\w+/g, match => {
      const param = match.substring(1);
      return `{${param}}`;
    });

    const pathParts = pathName.split('/').filter(p => p);
    const readable = pathParts
      .map(part => {
        if (part.includes('{')) return part;
        return part
          .split('-')
          .map(word => this.capitalizeFirst(word))
          .join(' ');
      })
      .join(' - ');

    return `${method} - ${readable || 'Root'}`;
  }

  /**
   * Get default headers
   */
  getDefaultHeaders(route) {
    if (route.isFileUpload) {
      return []; // multipart/form-data headers auto-set by Postman
    }

    return [
      {
        key: 'Content-Type',
        value: 'application/json',
        type: 'text',
      },
    ];
  }

  /**
   * Generate sample body
   */
  generateSampleBody(route, moduleName) {
    const sampleBodies = {
      auth: {
        '/login': {
          email: '{{TEST_EMAIL}}',
          password: '{{TEST_PASSWORD}}',
        },
        '/': {
          // Register
          name: '{{TEST_NAME}}',
          email: '{{TEST_EMAIL}}',
          password: '{{TEST_PASSWORD}}',
          role: 'TASKER',
        },
        '/forget-password': { email: '{{TEST_EMAIL}}' },
        '/reset-password': {
          newPassword: '{{NEW_PASSWORD}}',
          confirmPassword: '{{NEW_PASSWORD}}',
        },
        '/change-password': {
          currentPassword: '{{TEST_PASSWORD}}',
          newPassword: '{{NEW_PASSWORD}}',
          confirmPassword: '{{NEW_PASSWORD}}',
        },
        '/verify-email': {
          email: '{{TEST_EMAIL}}',
          oneTimeCode: 123456,
        },
        '/resend-verify-email': {
          email: '{{TEST_EMAIL}}',
        },
      },
      user: {
        '/': {
          name: '{{TEST_NAME}}',
          email: '{{TEST_EMAIL}}',
          password: '{{TEST_PASSWORD}}',
          role: 'TASKER',
        },
        '/profile': {
          name: '{{UPDATED_NAME}}',
          email: '{{TEST_EMAIL}}',
        },
      },
      message: {
        '/': {
          chatId: '{{chatId}}',
          text: 'Hello, this is a test message!',
        },
      },
      payment: {
        '/stripe/account': {
          businessType: 'individual',
          country: 'US',
        },
        '/refund/:paymentId': {
          reason: 'Refund requested by customer',
        },
      },
      bookmark: {
        '/': {
          targetId: '{{TARGET_ID}}',
          targetModel: 'Task',
        },
      },
    };

    if (sampleBodies[moduleName] && sampleBodies[moduleName][route.path]) {
      return sampleBodies[moduleName][route.path];
    }

    return {};
  }

  /**
   * Generate file upload body (multipart/form-data)
   */
  generateFileUploadBody(route, moduleName) {
    const formdata = [];

    // Message module file upload
    if (moduleName === 'message' && route.path === '/') {
      formdata.push(
        { key: 'chatId', value: '{{chatId}}', type: 'text' },
        {
          key: 'text',
          value: 'Message with attachments',
          type: 'text',
          disabled: true,
        },
        {
          key: 'image',
          value: '',
          type: 'file',
          disabled: true,
          description: 'Image files',
        },
        {
          key: 'media',
          value: '',
          type: 'file',
          disabled: true,
          description: 'Audio/Video files',
        },
        {
          key: 'doc',
          value: '',
          type: 'file',
          disabled: true,
          description: 'Document files',
        }
      );
    }

    // User profile picture upload
    if (moduleName === 'user' && route.path === '/profile') {
      formdata.push(
        { key: 'name', value: '{{UPDATED_NAME}}', type: 'text' },
        { key: 'email', value: '{{TEST_EMAIL}}', type: 'text' },
        {
          key: 'profilePicture',
          value: '',
          type: 'file',
          disabled: true,
          description: 'Profile picture',
        }
      );
    }

    return {
      mode: 'formdata',
      formdata: formdata,
    };
  }

  /**
   * Generate test script for endpoint
   */
  generateTestScript(route, moduleName) {
    // Login endpoint - save tokens
    if (moduleName === 'auth' && route.path === '/login') {
      return `
// Auto-save tokens from login response
const response = pm.response.json();

if (response.success && response.data) {
  if (response.data.accessToken) {
    pm.collectionVariables.set("accessToken", response.data.accessToken);
    console.log("✅ Access token saved");
  }

  if (response.data.refreshToken) {
    pm.collectionVariables.set("refreshToken", response.data.refreshToken);
    console.log("✅ Refresh token saved");
  }

  if (response.data.user && response.data.user._id) {
    pm.collectionVariables.set("userId", response.data.user._id);
    console.log("✅ User ID saved:", response.data.user._id);
  }
}
      `.trim();
    }

    // Register endpoint - save tokens
    if (moduleName === 'auth' && route.path === '/') {
      return `
// Auto-save tokens from register response
const response = pm.response.json();

if (response.success && response.data) {
  if (response.data.accessToken) {
    pm.collectionVariables.set("accessToken", response.data.accessToken);
    console.log("✅ Access token saved");
  }

  if (response.data.refreshToken) {
    pm.collectionVariables.set("refreshToken", response.data.refreshToken);
    console.log("✅ Refresh token saved");
  }

  if (response.data.user && response.data.user._id) {
    pm.collectionVariables.set("userId", response.data.user._id);
    console.log("✅ User ID saved:", response.data.user._id);
  }
}
      `.trim();
    }

    // Create chat - save chatId
    if (moduleName === 'chat' && route.method === 'POST') {
      return `
// Auto-save chat ID
const response = pm.response.json();

if (response.success && response.data && response.data._id) {
  pm.collectionVariables.set("chatId", response.data._id);
  console.log("✅ Chat ID saved:", response.data._id);
}
      `.trim();
    }

    // Send message - save messageId
    if (moduleName === 'message' && route.path === '/') {
      return `
// Auto-save message ID
const response = pm.response.json();

if (response.success && response.data && response.data._id) {
  pm.collectionVariables.set("messageId", response.data._id);
  console.log("✅ Message ID saved:", response.data._id);
}
      `.trim();
    }

    // Payment endpoints - save paymentId
    if (moduleName === 'payment' && route.method === 'POST') {
      return `
// Auto-save payment ID
const response = pm.response.json();

if (response.success && response.data) {
  if (response.data._id) {
    pm.collectionVariables.set("paymentId", response.data._id);
    console.log("✅ Payment ID saved:", response.data._id);
  }
  if (response.data.clientSecret) {
    pm.collectionVariables.set("clientSecret", response.data.clientSecret);
    console.log("✅ Client secret saved");
  }
}
      `.trim();
    }

    return null;
  }

  /**
   * Add collection-level scripts
   */
  addCollectionScripts() {
    // Pre-request script - auto inject Bearer token
    this.collection.event.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          '// Auto-inject Bearer token if available',
          'const token = pm.collectionVariables.get("accessToken");',
          '',
          'if (token) {',
          '  pm.request.headers.add({',
          '    key: "Authorization",',
          '    value: "Bearer " + token',
          '  });',
          '}',
        ],
      },
    });

    // Test script - generic response check
    this.collection.event.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          '// Generic response validation',
          'pm.test("Status code is 2xx", function () {',
          '  pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);',
          '});',
          '',
          'pm.test("Response has success field", function () {',
          '  const response = pm.response.json();',
          '  pm.expect(response).to.have.property("success");',
          '});',
        ],
      },
    });
  }

  /**
   * Add collection variables
   */
  addCollectionVariables(existingCollection) {
    const defaultVariables = [
      { key: 'BASE_URL', value: 'http://localhost:5000/api/v1', type: 'string' },
      { key: 'accessToken', value: '', type: 'string' },
      { key: 'refreshToken', value: '', type: 'string' },
      { key: 'userId', value: '', type: 'string' },
      { key: 'chatId', value: '', type: 'string' },
      { key: 'messageId', value: '', type: 'string' },
      { key: 'paymentId', value: '', type: 'string' },
      { key: 'clientSecret', value: '', type: 'string' },
      { key: 'TARGET_ID', value: '', type: 'string' },
      { key: 'TEST_EMAIL', value: 'test@example.com', type: 'string' },
      { key: 'TEST_PASSWORD', value: 'SecurePass123!', type: 'string' },
      { key: 'TEST_NAME', value: 'John Doe', type: 'string' },
      { key: 'NEW_PASSWORD', value: 'NewSecure123!', type: 'string' },
      { key: 'UPDATED_NAME', value: 'Updated Name', type: 'string' },
    ];

    if (existingCollection && existingCollection.variable) {
      // Merge: keep existing values, add new variables
      const existingVars = new Map(
        existingCollection.variable.map(v => [v.key, v.value])
      );

      this.collection.variable = defaultVariables.map(varDef => {
        if (existingVars.has(varDef.key) && existingVars.get(varDef.key)) {
          // Keep existing value
          return {
            ...varDef,
            value: existingVars.get(varDef.key),
          };
        }
        return varDef;
      });

      console.log('\n💾 Variables merged (existing values preserved)');
    } else {
      // Fresh variables
      this.collection.variable = defaultVariables;
      console.log('\n💾 Variables initialized with defaults');
    }
  }

  /**
   * Load existing collection
   */
  loadExistingCollection(filename) {
    const filePath = path.join(
      process.cwd(),
      'postman-collections',
      filename
    );

    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.warn('⚠️  Could not parse existing collection:', error.message);
        return null;
      }
    }

    return null;
  }

  /**
   * Create backup
   */
  createBackup(filename) {
    const sourcePath = path.join(
      process.cwd(),
      'postman-collections',
      filename
    );

    if (!fs.existsSync(sourcePath)) return;

    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    const backupDir = path.join(
      process.cwd(),
      'postman-collections',
      'backups'
    );

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFilename = filename.replace('.json', `-backup-${timestamp}.json`);
    const backupPath = path.join(backupDir, backupFilename);

    fs.copyFileSync(sourcePath, backupPath);
    console.log(`💾 Backup created: ${backupFilename}\n`);
  }

  /**
   * Find module folder in existing collection
   */
  findModuleFolder(collection, moduleName) {
    const folderName = `${this.capitalizeFirst(moduleName)} Module`;
    return collection.item?.find(item => item.name === folderName);
  }

  /**
   * Compare endpoints (existing vs new)
   */
  compareEndpoints(existing, newRoutes) {
    const changes = {
      toAdd: [],
      toUpdate: [],
      unchanged: [],
    };

    // Build map of existing endpoints
    const existingMap = new Map();
    const existingItems = existing?.item || [];

    existingItems.forEach(item => {
      const method = item.request.method;
      const path = this.extractPathFromRequest(item.request);
      const key = `${method}:${path}`;
      existingMap.set(key, item);
    });

    // Compare
    newRoutes.forEach(route => {
      const key = `${route.method}:${route.fullPath}`;

      if (existingMap.has(key)) {
        const existingItem = existingMap.get(key);
        // Check if body changed
        if (this.hasBodyChanged(existingItem, route)) {
          changes.toUpdate.push({ route, existingItem });
        } else {
          changes.unchanged.push(route);
        }
        existingMap.delete(key);
      } else {
        changes.toAdd.push(route);
      }
    });

    return changes;
  }

  /**
   * Extract path from Postman request
   */
  extractPathFromRequest(request) {
    if (typeof request.url === 'string') {
      return request.url.replace('{{BASE_URL}}', '');
    }
    if (request.url.path) {
      return '/' + request.url.path.join('/');
    }
    return '';
  }

  /**
   * Check if request body changed
   */
  hasBodyChanged(existingItem, newRoute) {
    // Simple check: if body exists in both, consider changed
    // More sophisticated comparison can be added
    return false; // For now, preserve existing bodies
  }

  /**
   * Merge module endpoints
   */
  mergeModuleEndpoints(moduleFolder, existingFolder, changes) {
    // Start with existing items (unchanged + updated)
    if (existingFolder && existingFolder.item) {
      moduleFolder.item = [...existingFolder.item];
    }

    // Add new endpoints
    changes.toAdd.forEach(route => {
      const request = this.createPostmanRequest(
        route,
        this.extractModuleName(moduleFolder.name)
      );
      moduleFolder.item.push(request);
    });

    // Update changed endpoints
    changes.toUpdate.forEach(({ route, existingItem }) => {
      const index = moduleFolder.item.indexOf(existingItem);
      if (index !== -1) {
        const newRequest = this.createPostmanRequest(
          route,
          this.extractModuleName(moduleFolder.name)
        );
        // Preserve responses
        newRequest.response = existingItem.response || [];
        moduleFolder.item[index] = newRequest;
      }
    });
  }

  /**
   * Apply changes to collection (for single module)
   */
  applyChangesToCollection(existingCollection, changes, moduleName) {
    // Add new endpoints
    if (changes.toAdd.length > 0) {
      console.log('✨ Adding new endpoints:');
      changes.toAdd.forEach(route => {
        const request = this.createPostmanRequest(route, moduleName);
        existingCollection.item.push(request);
        console.log(`  ✅ ${route.method} ${route.fullPath}`);
      });
    }

    // Update changed endpoints
    if (changes.toUpdate.length > 0) {
      console.log('\n🔄 Updating endpoints:');
      changes.toUpdate.forEach(({ route, existingItem }) => {
        const index = existingCollection.item.indexOf(existingItem);
        if (index !== -1) {
          const newRequest = this.createPostmanRequest(route, moduleName);
          newRequest.response = existingItem.response || [];
          existingCollection.item[index] = newRequest;
          console.log(`  🔄 ${route.method} ${route.fullPath}`);
        }
      });
    }

    // Unchanged
    if (changes.unchanged.length > 0) {
      console.log(`\n✓ ${changes.unchanged.length} endpoints unchanged`);
    }
  }

  /**
   * Extract module name from folder name
   */
  extractModuleName(folderName) {
    return folderName
      .replace(' Module', '')
      .toLowerCase();
  }

  /**
   * Save collection to file
   */
  async saveCollection(filename) {
    const outputDir = path.join(process.cwd(), 'postman-collections');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(this.collection, null, 2));
  }

  /**
   * Generate environment file (Development only)
   */
  async generateEnvironmentFiles() {
    console.log('🌍 Generating environment file...\n');

    const outputDir = path.join(process.cwd(), 'postman-collections');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Development environment
    const environment = {
      id: this.generateUUID(),
      name: 'Development',
      values: [
        {
          key: 'BASE_URL',
          value: 'http://localhost:5000/api/v1',
          type: 'default',
          enabled: true,
        },
        { key: 'accessToken', value: '', type: 'secret', enabled: true },
        { key: 'refreshToken', value: '', type: 'secret', enabled: true },
        { key: 'userId', value: '', type: 'default', enabled: true },
        { key: 'chatId', value: '', type: 'default', enabled: true },
        { key: 'messageId', value: '', type: 'default', enabled: true },
        { key: 'paymentId', value: '', type: 'default', enabled: true },
        {
          key: 'TEST_EMAIL',
          value: 'test@example.com',
          type: 'default',
          enabled: true,
        },
        {
          key: 'TEST_PASSWORD',
          value: 'SecurePass123!',
          type: 'secret',
          enabled: true,
        },
        {
          key: 'TEST_NAME',
          value: 'John Doe',
          type: 'default',
          enabled: true,
        },
      ],
      _postman_variable_scope: 'environment',
      _postman_exported_at: new Date().toISOString(),
      _postman_exported_using: 'Auto-generated',
    };

    // Save single environment file
    fs.writeFileSync(
      path.join(outputDir, 'environment.json'),
      JSON.stringify(environment, null, 2)
    );

    console.log('✅ Environment: postman-collections/environment.json');
    console.log('\n💡 Import in Postman → Environments');
    console.log('💡 For Production: Duplicate in Postman and change BASE_URL manually');
  }

  /**
   * Generate UUID for environments
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const generator = new EnhancedPostmanGenerator();
  await generator.run(args);
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

module.exports = EnhancedPostmanGenerator;
