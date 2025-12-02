#!/usr/bin/env node

/**
 * Unified Diagram Generator CLI
 *
 * সব diagram generators এর জন্য single entry point
 * REST API, Socket.IO, এবং Schema diagrams একসাথে manage করে
 *
 * Usage:
 *   node scripts/generate-diagrams.js                    # Interactive mode
 *   node scripts/generate-diagrams.js --api              # REST API diagrams
 *   node scripts/generate-diagrams.js --socket           # Socket.IO diagrams
 *   node scripts/generate-diagrams.js --schema           # Schema/ERD diagrams
 *   node scripts/generate-diagrams.js --all              # All diagram types
 *   node scripts/generate-diagrams.js --all --open       # Generate & open browser
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

// Import utilities for combined diagrams
const RestSocketMapper = require('./diagram-generator/utils/restSocketMapper');
const MermaidGenerator = require('./diagram-generator/utils/mermaidGenerator');

// ==========================================
// CLI Colors (ANSI escape codes)
// ==========================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
};

// ==========================================
// Utility Functions
// ==========================================

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// ==========================================
// Banner & Menu Functions
// ==========================================

function printBanner() {
  console.log();
  log('╔═══════════════════════════════════════════════════════════╗', 'magenta');
  log('║            📊 Diagram Generator Suite                     ║', 'magenta');
  log('║            ─────────────────────────────                  ║', 'magenta');
  log('║            Unified CLI for all diagram types              ║', 'magenta');
  log('╚═══════════════════════════════════════════════════════════╝', 'magenta');
  console.log();
}

function printMainMenu() {
  log('┌───────────────────────────────────────────────────────────┐', 'cyan');
  log('│                   Select Diagram Type                     │', 'cyan');
  log('├───────────────────────────────────────────────────────────┤', 'cyan');
  log('│                                                           │', 'cyan');
  log('│   1. 🌐 REST API Sequence Diagrams                       │', 'cyan');
  log('│      HTTP endpoints flow visualization                    │', 'dim');
  log('│      Routes → Controllers → Services → Database          │', 'dim');
  log('│                                                           │', 'cyan');
  log('│   2. 🔌 Socket.IO Event Flow Diagrams                    │', 'cyan');
  log('│      Real-time WebSocket event visualization              │', 'dim');
  log('│      Connection, Messaging, Typing, Presence flows       │', 'dim');
  log('│                                                           │', 'cyan');
  log('│   3. 🗄️  Database Schema (ERD) Diagrams                  │', 'cyan');
  log('│      MongoDB collections & relationships                  │', 'dim');
  log('│      Models, Fields, References, Indexes                 │', 'dim');
  log('│                                                           │', 'cyan');
  log('│   4. 📦 Generate ALL Diagrams                            │', 'cyan');
  log('│      Run all generators at once                          │', 'dim');
  log('│                                                           │', 'cyan');
  log('│   5. 🔍 Module View                                      │', 'cyan');
  log('│      Complete view of a specific module                   │', 'dim');
  log('│      REST + Socket.IO + Schema - all in one              │', 'dim');
  log('│                                                           │', 'cyan');
  log('│   6. 🔗 Combined REST + Socket.IO Flow                   │', 'cyan');
  log('│      Auto-detect REST endpoints that emit Socket events   │', 'dim');
  log('│      Shows complete flow: HTTP → Service → Socket.IO     │', 'dim');
  log('│                                                           │', 'cyan');
  log('│   0. ❌ Exit                                              │', 'cyan');
  log('│                                                           │', 'cyan');
  log('└───────────────────────────────────────────────────────────┘', 'cyan');
  console.log();
}

function printHelp() {
  printBanner();

  log('Usage:', 'bright');
  log('  node scripts/generate-diagrams.js [options]', 'dim');
  console.log();

  log('Options:', 'bright');
  log('  --type <type>    Diagram type: api, socket, schema, combined, all', 'cyan');
  log('  --api            Generate REST API sequence diagrams', 'cyan');
  log('  --socket         Generate Socket.IO event flow diagrams', 'cyan');
  log('  --schema         Generate Database ERD diagrams', 'cyan');
  log('  --combined       Generate Combined REST + Socket.IO flow diagrams', 'cyan');
  log('  --all            Generate all diagram types', 'cyan');
  log('  --module <name>  Generate ALL diagrams for a specific module', 'cyan');
  log('  --module-view    Interactive module selection', 'cyan');
  log('  --socket-map     Show REST → Socket.IO mapping summary', 'cyan');
  log('  --open           Open HTML in browser after generation', 'cyan');
  log('  --list           List all available diagram types', 'cyan');
  log('  --help           Show this help message', 'cyan');
  console.log();

  log('Available Diagram Types:', 'bright');
  log('┌──────────┬────────────────────────────────────────────────┐', 'dim');
  log('│ Type     │ Description                                    │', 'dim');
  log('├──────────┼────────────────────────────────────────────────┤', 'dim');
  log('│ api      │ 🌐 REST API Sequence (HTTP endpoints)         │', 'dim');
  log('│ socket   │ 🔌 Socket.IO Events (Real-time flows)         │', 'dim');
  log('│ schema   │ 🗄️  Database ERD (MongoDB collections)         │', 'dim');
  log('│ combined │ 🔗 REST + Socket.IO (Auto-detected flows)     │', 'dim');
  log('│ all      │ 📦 All of the above                           │', 'dim');
  log('└──────────┴────────────────────────────────────────────────┘', 'dim');
  console.log();

  log('Examples:', 'bright');
  log('  node scripts/generate-diagrams.js              # Interactive mode', 'dim');
  log('  node scripts/generate-diagrams.js --api        # REST API diagrams', 'dim');
  log('  node scripts/generate-diagrams.js --socket     # Socket.IO diagrams', 'dim');
  log('  node scripts/generate-diagrams.js --schema     # Schema diagrams', 'dim');
  log('  node scripts/generate-diagrams.js --combined   # REST + Socket.IO combined', 'dim');
  log('  node scripts/generate-diagrams.js --combined message  # Combined for specific module', 'dim');
  log('  node scripts/generate-diagrams.js --socket-map        # Show REST → Socket mapping', 'dim');
  log('  node scripts/generate-diagrams.js --all --open # All + open browser', 'dim');
  log('  node scripts/generate-diagrams.js --module message      # All message module diagrams', 'dim');
  log('  node scripts/generate-diagrams.js --module-view         # Interactive module selection', 'dim');
  console.log();
}

function printList() {
  printBanner();

  log('📋 Available Diagram Types:', 'bright');
  console.log();

  // REST API
  log('┌─────────────────────────────────────────────────────────────┐', 'blue');
  log('│ 🌐 REST API Sequence Diagrams (--api)                      │', 'blue');
  log('├─────────────────────────────────────────────────────────────┤', 'blue');
  log('│ Visualizes HTTP request flow through the application:      │', 'dim');
  log('│   • Route handlers and middleware chain                    │', 'dim');
  log('│   • Controller method invocations                          │', 'dim');
  log('│   • Service layer business logic                           │', 'dim');
  log('│   • Database operations (Mongoose queries)                 │', 'dim');
  log('│   • External API calls (Stripe, Firebase, etc.)           │', 'dim');
  log('│                                                             │', 'blue');
  log('│ Script: scripts/diagram-generator/                         │', 'dim');
  log('│ Output: scripts/diagram-generator/output/                  │', 'dim');
  log('└─────────────────────────────────────────────────────────────┘', 'blue');
  console.log();

  // Socket.IO
  log('┌─────────────────────────────────────────────────────────────┐', 'green');
  log('│ 🔌 Socket.IO Event Flow Diagrams (--socket)                │', 'green');
  log('├─────────────────────────────────────────────────────────────┤', 'green');
  log('│ Visualizes real-time WebSocket event flows:                │', 'dim');
  log('│   • Connection & JWT authentication                        │', 'dim');
  log('│   • Send message flow with broadcasts                      │', 'dim');
  log('│   • Typing indicators (throttled)                          │', 'dim');
  log('│   • Delivery & read acknowledgements                       │', 'dim');
  log('│   • Room management (join/leave)                           │', 'dim');
  log('│   • Presence tracking (online/offline)                     │', 'dim');
  log('│   • Disconnect handling                                    │', 'dim');
  log('│                                                             │', 'green');
  log('│ Script: scripts/socket-diagram-generator/                  │', 'dim');
  log('│ Output: scripts/socket-diagram-generator/output/           │', 'dim');
  log('└─────────────────────────────────────────────────────────────┘', 'green');
  console.log();

  // Schema/ERD
  log('┌─────────────────────────────────────────────────────────────┐', 'yellow');
  log('│ 🗄️  Database Schema (ERD) Diagrams (--schema)              │', 'yellow');
  log('├─────────────────────────────────────────────────────────────┤', 'yellow');
  log('│ Visualizes MongoDB collections and relationships:          │', 'dim');
  log('│   • Model schemas with field types                         │', 'dim');
  log('│   • References (ObjectId refs)                             │', 'dim');
  log('│   • Embedded documents and arrays                          │', 'dim');
  log('│   • Polymorphic references (refPath)                       │', 'dim');
  log('│   • Cardinality labels (1:1, N:1, M:N)                     │', 'dim');
  log('│   • Index definitions                                      │', 'dim');
  log('│                                                             │', 'yellow');
  log('│ Script: scripts/schema-diagram-generator/                  │', 'dim');
  log('│ Output: scripts/schema-diagram-generator/output/           │', 'dim');
  log('└─────────────────────────────────────────────────────────────┘', 'yellow');
  console.log();
}

// ==========================================
// Module-Socket Mapping
// ==========================================

/**
 * কোন module এ কোন Socket.IO flows আছে
 * REST API call করার পর কোন Socket events emit হয় সেটা define করা
 */
const moduleSocketMapping = {
  message: {
    flows: ['send-message', 'delivery-status'],
    events: ['MESSAGE_SENT', 'MESSAGE_READ', 'MESSAGE_DELIVERED'],
    description: 'Message পাঠানো এবং delivery/read status',
  },
  notification: {
    flows: ['presence'],
    events: ['get-notification'],
    description: 'Real-time notification delivery',
  },
  // These modules have no Socket.IO events
  auth: { flows: [], events: [], description: null },
  user: { flows: [], events: [], description: null },
  chat: { flows: [], events: [], description: null },
  payment: { flows: [], events: [], description: null },
  bookmark: { flows: [], events: [], description: null },
};

// ==========================================
// Generator Discovery Functions
// ==========================================

function getApiModules() {
  const modulesDir = path.resolve(__dirname, '../src/app/modules');
  const modules = [];

  if (!fs.existsSync(modulesDir)) {
    return modules;
  }

  const dirs = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const routeFile = path.join(modulesDir, dir.name, `${dir.name}.route.ts`);
      if (fs.existsSync(routeFile)) {
        // Try to extract routes from file
        const content = fs.readFileSync(routeFile, 'utf-8');
        const routes = [];

        // Simple regex to find route definitions
        const routeMatches = content.matchAll(/router\.(get|post|patch|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi);
        for (const match of routeMatches) {
          routes.push(`${match[1].toUpperCase()} ${match[2]}`);
        }

        modules.push({
          name: dir.name,
          routes: routes.slice(0, 3), // First 3 routes
          totalRoutes: routes.length,
        });
      }
    }
  }

  return modules;
}

function getSocketFlows() {
  const configPath = path.resolve(__dirname, 'socket-diagram-generator/config.js');

  if (!fs.existsSync(configPath)) {
    return [];
  }

  try {
    const config = require(configPath);
    return config.flows || [];
  } catch (err) {
    return [];
  }
}

function getSchemaModels() {
  const modulesDir = path.resolve(__dirname, '../src/app/modules');
  const models = [];

  if (!fs.existsSync(modulesDir)) {
    return models;
  }

  const dirs = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const modelFile = path.join(modulesDir, dir.name, `${dir.name}.model.ts`);
      if (fs.existsSync(modelFile)) {
        const content = fs.readFileSync(modelFile, 'utf-8');

        // Count fields (simple regex)
        const fieldMatches = content.match(/^\s+\w+\s*:/gm) || [];

        // Count refs
        const refMatches = content.match(/ref:\s*['"`]\w+['"`]/g) || [];

        // Check for embedded
        const hasEmbedded = content.includes('type:') && content.includes('[{');

        models.push({
          name: dir.name.charAt(0).toUpperCase() + dir.name.slice(1),
          fields: fieldMatches.length,
          refs: refMatches.length,
          hasEmbedded,
        });
      }
    }
  }

  return models;
}

/**
 * Discover all modules with their available diagram types
 * REST API, Socket.IO, Schema - সব check করে
 */
function discoverModules() {
  const modulesDir = path.resolve(__dirname, '../src/app/modules');
  const modules = [];

  if (!fs.existsSync(modulesDir)) {
    return modules;
  }

  const dirs = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const moduleName = dir.name;
      const moduleInfo = {
        name: moduleName,
        hasRest: false,
        hasSocket: false,
        hasSchema: false,
        restCount: 0,
        socketFlows: [],
        socketEvents: [],
      };

      // Check for REST API routes
      const routeFile = path.join(modulesDir, moduleName, `${moduleName}.route.ts`);
      if (fs.existsSync(routeFile)) {
        moduleInfo.hasRest = true;
        const content = fs.readFileSync(routeFile, 'utf-8');
        const routeMatches = content.matchAll(/router\.(get|post|patch|put|delete)\s*\(/gi);
        moduleInfo.restCount = [...routeMatches].length;
      }

      // Check for Schema/Model
      const modelFile = path.join(modulesDir, moduleName, `${moduleName}.model.ts`);
      if (fs.existsSync(modelFile)) {
        moduleInfo.hasSchema = true;
      }

      // Check for Socket.IO integration
      const socketMapping = moduleSocketMapping[moduleName];
      if (socketMapping && socketMapping.flows.length > 0) {
        moduleInfo.hasSocket = true;
        moduleInfo.socketFlows = socketMapping.flows;
        moduleInfo.socketEvents = socketMapping.events;
      }

      // Only add if has at least one diagram type
      if (moduleInfo.hasRest || moduleInfo.hasSchema || moduleInfo.hasSocket) {
        modules.push(moduleInfo);
      }
    }
  }

  // Sort: modules with Socket.IO first (more complete), then by name
  modules.sort((a, b) => {
    if (a.hasSocket && !b.hasSocket) return -1;
    if (!a.hasSocket && b.hasSocket) return 1;
    return a.name.localeCompare(b.name);
  });

  return modules;
}

// ==========================================
// Sub-menu Functions
// ==========================================

async function showApiModulesMenu(rl) {
  const modules = getApiModules();

  console.log();
  log('✅ Selected: 🌐 REST API Sequence Diagrams', 'green');
  console.log();
  log('📋 Available Modules:', 'bright');

  log('┌────┬──────────────────┬─────────────────────────────────────────┐', 'dim');
  log('│ #  │ Module           │ Routes                                  │', 'dim');
  log('├────┼──────────────────┼─────────────────────────────────────────┤', 'dim');

  modules.forEach((mod, index) => {
    const routesStr = mod.routes.length > 0 ? mod.routes.join(', ') : 'No routes found';
    const truncatedRoutes = routesStr.length > 35 ? routesStr.substring(0, 32) + '...' : routesStr.padEnd(35);
    log(`│ ${String(index + 1).padStart(2)} │ ${mod.name.padEnd(16)} │ ${truncatedRoutes}    │`, 'dim');
  });

  log(`├────┼──────────────────┼─────────────────────────────────────────┤`, 'dim');
  log(`│ ${String(modules.length + 1).padStart(2)} │ 📦 ALL           │ Generate all modules                    │`, 'green');
  log('└────┴──────────────────┴─────────────────────────────────────────┘', 'dim');
  console.log();

  const choice = await askQuestion(rl, `Select module (1-${modules.length + 1}, 0 to go back): `);
  const choiceNum = parseInt(choice, 10);

  if (choiceNum === 0 || isNaN(choiceNum)) {
    return null;
  }

  if (choiceNum === modules.length + 1) {
    return { type: 'all' };
  }

  if (choiceNum >= 1 && choiceNum <= modules.length) {
    return { type: 'module', name: modules[choiceNum - 1].name };
  }

  return null;
}

async function showSocketFlowsMenu(rl) {
  const flows = getSocketFlows();

  console.log();
  log('✅ Selected: 🔌 Socket.IO Event Flow Diagrams', 'green');
  console.log();
  log('📋 Available Flows:', 'bright');

  log('┌────┬───────────────────────┬────────────────────────────────────┐', 'dim');
  log('│ #  │ Flow                  │ Description                        │', 'dim');
  log('├────┼───────────────────────┼────────────────────────────────────┤', 'dim');

  flows.forEach((flow, index) => {
    const desc = flow.description || '';
    const truncatedDesc = desc.length > 32 ? desc.substring(0, 29) + '...' : desc.padEnd(32);
    const nameStr = flow.name.length > 19 ? flow.name.substring(0, 16) + '...' : flow.name.padEnd(19);
    log(`│ ${String(index + 1).padStart(2)} │ ${nameStr}    │ ${truncatedDesc}   │`, 'dim');
  });

  log(`├────┼───────────────────────┼────────────────────────────────────┤`, 'dim');
  log(`│ ${String(flows.length + 1).padStart(2)} │ 📦 ALL                │ Generate all flows                 │`, 'green');
  log('└────┴───────────────────────┴────────────────────────────────────┘', 'dim');
  console.log();

  const choice = await askQuestion(rl, `Select flow (1-${flows.length + 1}, 0 to go back): `);
  const choiceNum = parseInt(choice, 10);

  if (choiceNum === 0 || isNaN(choiceNum)) {
    return null;
  }

  if (choiceNum === flows.length + 1) {
    return { type: 'all' };
  }

  if (choiceNum >= 1 && choiceNum <= flows.length) {
    return { type: 'flow', id: flows[choiceNum - 1].id };
  }

  return null;
}

async function showSchemaModelsMenu(rl) {
  const models = getSchemaModels();

  console.log();
  log('✅ Selected: 🗄️  Database Schema (ERD) Diagrams', 'green');
  console.log();
  log('📋 Available Models:', 'bright');

  log('┌────┬──────────────────┬─────────────────────────────────────────┐', 'dim');
  log('│ #  │ Model            │ Fields & Relationships                  │', 'dim');
  log('├────┼──────────────────┼─────────────────────────────────────────┤', 'dim');

  models.forEach((model, index) => {
    const embedded = model.hasEmbedded ? ', embedded' : '';
    const info = `${model.fields} fields, ${model.refs} refs${embedded}`;
    const truncatedInfo = info.length > 35 ? info.substring(0, 32) + '...' : info.padEnd(35);
    log(`│ ${String(index + 1).padStart(2)} │ ${model.name.padEnd(16)} │ ${truncatedInfo}    │`, 'dim');
  });

  log(`├────┼──────────────────┼─────────────────────────────────────────┤`, 'dim');
  log(`│ ${String(models.length + 1).padStart(2)} │ 📦 ALL + ERD     │ All models + Full ER Diagram            │`, 'green');
  log('└────┴──────────────────┴─────────────────────────────────────────┘', 'dim');
  console.log();

  const choice = await askQuestion(rl, `Select model (1-${models.length + 1}, 0 to go back): `);
  const choiceNum = parseInt(choice, 10);

  if (choiceNum === 0 || isNaN(choiceNum)) {
    return null;
  }

  if (choiceNum === models.length + 1) {
    return { type: 'all' };
  }

  if (choiceNum >= 1 && choiceNum <= models.length) {
    return { type: 'model', name: models[choiceNum - 1].name };
  }

  return null;
}

/**
 * Module View Menu - shows all modules with their available diagram types
 */
async function showModuleViewMenu(rl) {
  const modules = discoverModules();

  console.log();
  log('✅ Selected: 🔍 Module View', 'green');
  console.log();
  log('📋 Available Modules:', 'bright');
  log('   (Shows ALL diagrams for a specific module)', 'dim');
  console.log();

  log('┌────┬──────────────────┬─────────────────────────────────────────┐', 'dim');
  log('│ #  │ Module           │ Available Diagrams                      │', 'dim');
  log('├────┼──────────────────┼─────────────────────────────────────────┤', 'dim');

  modules.forEach((mod, index) => {
    // Build diagram types string
    const types = [];
    if (mod.hasRest) types.push(`🌐 REST (${mod.restCount})`);
    if (mod.hasSocket) types.push(`🔌 Socket (${mod.socketFlows.length})`);
    if (mod.hasSchema) types.push(`🗄️ Schema`);

    const typesStr = types.join(' + ');
    const truncatedTypes = typesStr.length > 35 ? typesStr.substring(0, 32) + '...' : typesStr.padEnd(35);

    // Highlight modules with Socket.IO integration
    const color = mod.hasSocket ? 'cyan' : 'dim';
    log(`│ ${String(index + 1).padStart(2)} │ ${mod.name.padEnd(16)} │ ${truncatedTypes}    │`, color);
  });

  log('└────┴──────────────────┴─────────────────────────────────────────┘', 'dim');
  console.log();

  const choice = await askQuestion(rl, `Select module (1-${modules.length}, 0 to go back): `);
  const choiceNum = parseInt(choice, 10);

  if (choiceNum === 0 || isNaN(choiceNum)) {
    return null;
  }

  if (choiceNum >= 1 && choiceNum <= modules.length) {
    return modules[choiceNum - 1];
  }

  return null;
}

/**
 * Combined REST + Socket.IO Flow Menu
 * Auto-detected endpoints that emit Socket.IO events দেখায়
 */
async function showCombinedFlowMenu(rl) {
  const mapper = new RestSocketMapper();
  const fullMapping = mapper.buildFullMapping();

  console.log();
  log('✅ Selected: 🔗 Combined REST + Socket.IO Flow', 'green');
  console.log();

  if (fullMapping.modulesWithSocket === 0) {
    logWarning('No REST endpoints with Socket.IO events found!');
    return null;
  }

  log('📋 Auto-detected REST → Socket.IO Endpoints:', 'bright');
  log('   (Only showing endpoints that emit Socket.IO events)', 'dim');
  console.log();

  log('┌────┬──────────────────┬──────────────────────────────────────────┐', 'dim');
  log('│ #  │ Module           │ Endpoints with Socket.IO                 │', 'dim');
  log('├────┼──────────────────┼──────────────────────────────────────────┤', 'dim');

  let index = 1;
  const allEndpoints = [];

  for (const moduleMapping of fullMapping.mappings) {
    for (const endpoint of moduleMapping.endpoints) {
      const eventCount = endpoint.socketEvents.length;
      const events = endpoint.socketEvents.map(e => e.event).join(', ');
      const truncatedEvents = events.length > 30 ? events.substring(0, 27) + '...' : events;

      log(`│ ${String(index).padStart(2)} │ ${moduleMapping.moduleName.padEnd(16)} │ ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(20).substring(0, 20)} (${eventCount})    │`, 'cyan');

      allEndpoints.push({
        index,
        module: moduleMapping.moduleName,
        endpoint,
      });
      index++;
    }
  }

  log(`├────┼──────────────────┼──────────────────────────────────────────┤`, 'dim');
  log(`│ ${String(index).padStart(2)} │ 📦 ALL           │ Generate all combined diagrams           │`, 'green');
  log('└────┴──────────────────┴──────────────────────────────────────────┘', 'dim');
  console.log();

  log(`Summary: ${fullMapping.summary.totalEndpointsWithSocket} endpoints emit ${fullMapping.summary.uniqueEvents.length} unique Socket.IO events`, 'dim');
  console.log();

  const choice = await askQuestion(rl, `Select endpoint (1-${index}, 0 to go back): `);
  const choiceNum = parseInt(choice, 10);

  if (choiceNum === 0 || isNaN(choiceNum)) {
    return null;
  }

  if (choiceNum === index) {
    return { type: 'all', fullMapping };
  }

  if (choiceNum >= 1 && choiceNum < index) {
    const selected = allEndpoints[choiceNum - 1];
    return { type: 'single', module: selected.module, endpoint: selected.endpoint };
  }

  return null;
}

// ==========================================
// Generator Runner Functions
// ==========================================

function runGenerator(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    // Use spawn without shell to properly handle paths with spaces
    const proc = spawn(process.execPath, [scriptPath, ...args], {
      cwd: path.dirname(scriptPath),
      stdio: 'inherit',
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    proc.on('error', err => {
      reject(err);
    });
  });
}

async function runApiDiagrams(selection = null, open = false) {
  const scriptPath = path.resolve(__dirname, 'diagram-generator/sequence-diagram-generator.js');

  if (!fs.existsSync(scriptPath)) {
    logError('REST API diagram generator not found!');
    log(`   Expected: ${scriptPath}`, 'dim');
    return false;
  }

  console.log();
  log('┌─────────────────────────────────────────────────────────┐', 'blue');
  log('│ 🌐 REST API Sequence Diagrams                          │', 'blue');
  log('└─────────────────────────────────────────────────────────┘', 'blue');
  console.log();

  try {
    const args = [];

    if (selection) {
      if (selection.type === 'all') {
        args.push('--all');
      } else if (selection.type === 'module') {
        args.push('--module', selection.name);
      }
    } else {
      args.push('--all');
    }

    if (open) {
      args.push('--open');
    }

    await runGenerator(scriptPath, args);
    return true;
  } catch (err) {
    logError(`Failed to run API diagram generator: ${err.message}`);
    return false;
  }
}

async function runSocketDiagrams(selection = null, open = false) {
  const scriptPath = path.resolve(__dirname, 'socket-diagram-generator/socket-diagram-generator.js');

  if (!fs.existsSync(scriptPath)) {
    logError('Socket.IO diagram generator not found!');
    log(`   Expected: ${scriptPath}`, 'dim');
    return false;
  }

  console.log();
  log('┌─────────────────────────────────────────────────────────┐', 'green');
  log('│ 🔌 Socket.IO Event Flow Diagrams                       │', 'green');
  log('└─────────────────────────────────────────────────────────┘', 'green');
  console.log();

  try {
    const args = [];

    if (selection) {
      if (selection.type === 'all') {
        args.push('--all');
      } else if (selection.type === 'flow') {
        args.push('--flow', selection.id);
      }
    } else {
      args.push('--all');
    }

    if (open) {
      args.push('--open');
    }

    await runGenerator(scriptPath, args);
    return true;
  } catch (err) {
    logError(`Failed to run Socket.IO diagram generator: ${err.message}`);
    return false;
  }
}

async function runSchemaDiagrams(selection = null, open = false) {
  const scriptPath = path.resolve(__dirname, 'schema-diagram-generator/schema-diagram-generator.js');

  if (!fs.existsSync(scriptPath)) {
    logError('Schema diagram generator not found!');
    log(`   Expected: ${scriptPath}`, 'dim');
    return false;
  }

  console.log();
  log('┌─────────────────────────────────────────────────────────┐', 'yellow');
  log('│ 🗄️  Database Schema (ERD) Diagrams                     │', 'yellow');
  log('└─────────────────────────────────────────────────────────┘', 'yellow');
  console.log();

  try {
    const args = [];

    if (selection) {
      if (selection.type === 'all') {
        args.push('--all');
      } else if (selection.type === 'model') {
        args.push('--model', selection.name);
      }
    } else {
      args.push('--all');
    }

    if (open) {
      args.push('--open');
    }

    await runGenerator(scriptPath, args);
    return true;
  } catch (err) {
    logError(`Failed to run Schema diagram generator: ${err.message}`);
    return false;
  }
}

/**
 * Run Combined REST + Socket.IO Diagram Generator
 * Auto-detected endpoints থেকে combined flow diagrams generate করে
 *
 * @param {Object} selection - Selection from menu or CLI
 * @param {boolean} open - Open in browser after generation
 * @param {string} moduleName - Optional: specific module name
 */
async function runCombinedDiagrams(selection = null, open = false, moduleName = null) {
  console.log();
  log('┌─────────────────────────────────────────────────────────┐', 'magenta');
  log('│ 🔗 Combined REST + Socket.IO Flow Diagrams             │', 'magenta');
  log('└─────────────────────────────────────────────────────────┘', 'magenta');
  console.log();

  const mapper = new RestSocketMapper();
  const generator = new MermaidGenerator('standard');

  // Determine what to generate
  let endpointsToGenerate = [];

  if (selection && selection.type === 'single') {
    // Single endpoint from menu
    endpointsToGenerate.push({
      module: selection.module,
      endpoint: selection.endpoint,
    });
  } else if (selection && selection.type === 'all') {
    // All endpoints from menu selection
    for (const moduleMapping of selection.fullMapping.mappings) {
      for (const endpoint of moduleMapping.endpoints) {
        endpointsToGenerate.push({
          module: moduleMapping.moduleName,
          endpoint,
        });
      }
    }
  } else if (moduleName) {
    // Specific module from CLI --combined <module>
    const moduleMapping = mapper.buildModuleMapping(moduleName);
    if (moduleMapping.endpoints && moduleMapping.endpoints.length > 0) {
      for (const endpoint of moduleMapping.endpoints) {
        endpointsToGenerate.push({
          module: moduleName,
          endpoint,
        });
      }
    } else {
      logWarning(`No endpoints with Socket.IO events found in module: ${moduleName}`);
      return false;
    }
  } else {
    // All modules from CLI --combined
    const fullMapping = mapper.buildFullMapping();
    if (fullMapping.modulesWithSocket === 0) {
      logWarning('No REST endpoints with Socket.IO events found in codebase!');
      return false;
    }
    for (const moduleMapping of fullMapping.mappings) {
      for (const endpoint of moduleMapping.endpoints) {
        endpointsToGenerate.push({
          module: moduleMapping.moduleName,
          endpoint,
        });
      }
    }
  }

  if (endpointsToGenerate.length === 0) {
    logWarning('No endpoints to generate diagrams for!');
    return false;
  }

  log(`📊 Generating ${endpointsToGenerate.length} combined diagram(s)...`, 'bright');
  console.log();

  // Output directory
  const outputDir = path.resolve(__dirname, 'diagram-generator/output');
  const diagramsDir = path.join(outputDir, 'diagrams');
  const htmlDir = path.join(outputDir, 'html');

  // Ensure directories exist
  if (!fs.existsSync(diagramsDir)) {
    fs.mkdirSync(diagramsDir, { recursive: true });
  }
  if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
  }

  const results = [];

  for (const item of endpointsToGenerate) {
    const { module, endpoint } = item;

    // Generate filename
    const sanitizedPath = endpoint.path.replace(/\//g, '-').replace(/:/g, '').replace(/^-/, '');
    const filename = `${module}-${endpoint.method.toLowerCase()}${sanitizedPath}-combined`;

    log(`   📄 ${endpoint.method} ${endpoint.path}`, 'cyan');

    // Generate Mermaid code
    const mermaidCode = generator.generateCombinedDiagram(endpoint);

    // Save .mmd file
    const mmdPath = path.join(diagramsDir, `${filename}.mmd`);
    fs.writeFileSync(mmdPath, mermaidCode);
    log(`      └─ ${filename}.mmd`, 'dim');

    // Generate and save HTML
    const htmlContent = generator.generateCombinedHTML(mermaidCode, endpoint);
    const htmlPath = path.join(htmlDir, `${filename}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    log(`      └─ ${filename}.html`, 'dim');

    results.push({
      module,
      method: endpoint.method,
      path: endpoint.path,
      htmlPath,
      events: endpoint.socketEvents.length,
    });
  }

  // Generate index HTML for combined diagrams
  generateCombinedIndexHTML(results, htmlDir);

  // Print summary
  console.log();
  log('═══════════════════════════════════════════════════════════', 'magenta');
  log('        📊 Combined Diagram Generation Summary              ', 'magenta');
  log('═══════════════════════════════════════════════════════════', 'magenta');
  console.log();
  log(`   Total diagrams generated: ${results.length}`, 'bright');
  log(`   Output location: ${htmlDir}`, 'dim');
  console.log();

  // Group by module
  const byModule = {};
  for (const r of results) {
    if (!byModule[r.module]) byModule[r.module] = [];
    byModule[r.module].push(r);
  }

  for (const [mod, endpoints] of Object.entries(byModule)) {
    log(`   📦 ${mod}: ${endpoints.length} endpoint(s)`, 'cyan');
    for (const ep of endpoints) {
      log(`      ${ep.method} ${ep.path} (${ep.events} events)`, 'dim');
    }
  }

  console.log();
  log('═══════════════════════════════════════════════════════════', 'magenta');

  if (open) {
    const indexPath = path.join(htmlDir, 'combined-index.html');
    if (fs.existsSync(indexPath)) {
      const { exec } = require('child_process');
      const command =
        process.platform === 'win32'
          ? `start "" "${indexPath}"`
          : process.platform === 'darwin'
            ? `open "${indexPath}"`
            : `xdg-open "${indexPath}"`;
      exec(command);
      logInfo('Opening combined diagrams in browser...');
    }
  }

  return true;
}

/**
 * Generate index HTML for combined diagrams
 */
function generateCombinedIndexHTML(results, htmlDir) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Combined REST + Socket.IO Diagrams</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
            margin-top: 0;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            flex: 1;
            min-width: 150px;
            text-align: center;
        }
        .stat-card h3 {
            margin: 0;
            font-size: 32px;
        }
        .stat-card p {
            margin: 5px 0 0 0;
            opacity: 0.9;
        }
        .endpoint-list {
            display: grid;
            gap: 15px;
        }
        .endpoint-card {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            background: #f8f9fa;
            border-radius: 10px;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s;
            border-left: 4px solid #667eea;
        }
        .endpoint-card:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .method-badge {
            font-size: 12px;
            font-weight: 700;
            padding: 5px 10px;
            border-radius: 5px;
            margin-right: 15px;
            min-width: 60px;
            text-align: center;
        }
        .method-get { background: #28a745; color: white; }
        .method-post { background: #007bff; color: white; }
        .method-put { background: #ffc107; color: #333; }
        .method-patch { background: #17a2b8; color: white; }
        .method-delete { background: #dc3545; color: white; }
        .endpoint-info {
            flex: 1;
        }
        .endpoint-path {
            font-weight: 600;
            font-size: 16px;
            color: #333;
        }
        .endpoint-module {
            font-size: 13px;
            color: #666;
        }
        .event-count {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 Combined REST + Socket.IO Flow Diagrams</h1>

        <div class="stats">
            <div class="stat-card">
                <h3>${results.length}</h3>
                <p>Endpoints</p>
            </div>
            <div class="stat-card">
                <h3>${results.reduce((sum, r) => sum + r.events, 0)}</h3>
                <p>Socket Events</p>
            </div>
            <div class="stat-card">
                <h3>${[...new Set(results.map(r => r.module))].length}</h3>
                <p>Modules</p>
            </div>
        </div>

        <div class="endpoint-list">
            ${results.map(r => {
              const filename = path.basename(r.htmlPath);
              return `
                <a href="${filename}" class="endpoint-card">
                    <span class="method-badge method-${r.method.toLowerCase()}">${r.method}</span>
                    <div class="endpoint-info">
                        <div class="endpoint-path">${r.path}</div>
                        <div class="endpoint-module">📦 ${r.module}</div>
                    </div>
                    <span class="event-count">🔌 ${r.events} events</span>
                </a>
              `;
            }).join('')}
        </div>

        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Auto-detected REST endpoints that emit Socket.IO events</p>
        </div>
    </div>
</body>
</html>`;

  const indexPath = path.join(htmlDir, 'combined-index.html');
  fs.writeFileSync(indexPath, html);
}

async function runAllDiagrams(open = false) {
  console.log();
  log('🚀 Generating ALL diagram types...', 'bright');
  console.log();

  const results = {
    api: false,
    socket: false,
    schema: false,
  };

  results.api = await runApiDiagrams(null, false);
  results.socket = await runSocketDiagrams(null, false);
  results.schema = await runSchemaDiagrams(null, false);

  printFinalSummary(results, open);
}

/**
 * Generate all diagrams for a specific module
 * REST API + Socket.IO + Schema - একসাথে
 */
async function generateModuleDiagrams(moduleInfo, open = false) {
  console.log();
  log(`🔍 Generating ALL diagrams for '${moduleInfo.name}' module...`, 'bright');
  console.log();

  const results = {
    rest: { success: false, count: 0 },
    socket: { success: false, count: 0 },
    schema: { success: false, count: 0 },
  };

  // 1. Generate REST API diagrams
  if (moduleInfo.hasRest) {
    log('┌─────────────────────────────────────────────────────────┐', 'blue');
    log(`│ 🌐 REST API Diagrams (${moduleInfo.restCount})                              │`, 'blue');
    log('└─────────────────────────────────────────────────────────┘', 'blue');

    const apiSuccess = await runApiDiagrams({ type: 'module', name: moduleInfo.name }, false);
    results.rest.success = apiSuccess;
    results.rest.count = moduleInfo.restCount;
  }

  // 2. Generate Socket.IO flow diagrams (related flows only)
  if (moduleInfo.hasSocket && moduleInfo.socketFlows.length > 0) {
    console.log();
    log('┌─────────────────────────────────────────────────────────┐', 'green');
    log(`│ 🔌 Socket.IO Events (${moduleInfo.socketFlows.length})                               │`, 'green');
    log('└─────────────────────────────────────────────────────────┘', 'green');

    // Generate each related flow
    for (const flowId of moduleInfo.socketFlows) {
      const socketSuccess = await runSocketDiagrams({ type: 'flow', id: flowId }, false);
      if (socketSuccess) {
        results.socket.count++;
      }
    }
    results.socket.success = results.socket.count > 0;
  }

  // 3. Generate Schema diagram
  if (moduleInfo.hasSchema) {
    console.log();
    log('┌─────────────────────────────────────────────────────────┐', 'yellow');
    log('│ 🗄️  Schema Diagram (1)                                  │', 'yellow');
    log('└─────────────────────────────────────────────────────────┘', 'yellow');

    const modelName = moduleInfo.name.charAt(0).toUpperCase() + moduleInfo.name.slice(1);
    const schemaSuccess = await runSchemaDiagrams({ type: 'model', name: modelName }, false);
    results.schema.success = schemaSuccess;
    results.schema.count = schemaSuccess ? 1 : 0;
  }

  // Print module summary
  printModuleSummary(moduleInfo, results, open);
}

/**
 * Print summary for module diagram generation
 */
function printModuleSummary(moduleInfo, results, open = false) {
  const totalCount = results.rest.count + results.socket.count + results.schema.count;

  console.log();
  log('═══════════════════════════════════════════════════════════', 'green');
  log(`        📊 Module Summary: ${moduleInfo.name}`, 'green');
  log('═══════════════════════════════════════════════════════════', 'green');
  console.log();

  log('   Diagram Results:', 'bright');
  if (moduleInfo.hasRest) {
    log(`      🌐 REST API:    ${results.rest.success ? '✅' : '❌'} ${results.rest.count} diagrams`, results.rest.success ? 'green' : 'red');
  }
  if (moduleInfo.hasSocket) {
    log(`      🔌 Socket.IO:   ${results.socket.success ? '✅' : '❌'} ${results.socket.count} flows`, results.socket.success ? 'green' : 'red');
    log(`         Events: ${moduleInfo.socketEvents.join(', ')}`, 'dim');
  }
  if (moduleInfo.hasSchema) {
    log(`      🗄️  Schema/ERD: ${results.schema.success ? '✅' : '❌'} ${results.schema.count} diagram`, results.schema.success ? 'green' : 'red');
  }

  console.log();
  log(`   Total: ${totalCount} diagrams for '${moduleInfo.name}' module`, 'bright');
  console.log();

  log('   📁 Output locations:', 'cyan');
  if (moduleInfo.hasRest) {
    log('      🌐 REST:   scripts/diagram-generator/output/html/', 'dim');
  }
  if (moduleInfo.hasSocket) {
    log('      🔌 Socket: scripts/socket-diagram-generator/output/html/', 'dim');
  }
  if (moduleInfo.hasSchema) {
    log('      🗄️  Schema: scripts/schema-diagram-generator/output/html/', 'dim');
  }

  if (open) {
    console.log();
    logInfo('Opening diagrams in browser...');
    openInBrowser();
  }

  console.log();
  log('═══════════════════════════════════════════════════════════', 'green');
}

// ==========================================
// Summary Functions
// ==========================================

function printFinalSummary(results, open = false) {
  console.log();
  log('═══════════════════════════════════════════════════════════', 'green');
  log('                    📊 Generation Summary                   ', 'green');
  log('═══════════════════════════════════════════════════════════', 'green');
  console.log();

  log('   Generator Results:', 'bright');
  log(`      🌐 REST API:    ${results.api ? '✅ Success' : '❌ Failed'}`, results.api ? 'green' : 'red');
  log(`      🔌 Socket.IO:   ${results.socket ? '✅ Success' : '❌ Failed'}`, results.socket ? 'green' : 'red');
  log(`      🗄️  Schema/ERD: ${results.schema ? '✅ Success' : '❌ Failed'}`, results.schema ? 'green' : 'red');
  console.log();

  log('   📁 Output locations:', 'cyan');
  log('      🌐 API:    scripts/diagram-generator/output/html/', 'dim');
  log('      🔌 Socket: scripts/socket-diagram-generator/output/html/', 'dim');
  log('      🗄️  Schema: scripts/schema-diagram-generator/output/html/', 'dim');
  console.log();

  if (open) {
    logInfo('Opening diagrams in browser...');
    openInBrowser();
  }

  log('═══════════════════════════════════════════════════════════', 'green');
}

function openInBrowser() {
  const { exec } = require('child_process');
  const htmlPaths = [
    path.resolve(__dirname, 'diagram-generator/output/html/index.html'),
    path.resolve(__dirname, 'socket-diagram-generator/output/html/index.html'),
    path.resolve(__dirname, 'schema-diagram-generator/output/html/index.html'),
  ];

  for (const htmlPath of htmlPaths) {
    if (fs.existsSync(htmlPath)) {
      const command =
        process.platform === 'win32'
          ? `start "" "${htmlPath}"`
          : process.platform === 'darwin'
            ? `open "${htmlPath}"`
            : `xdg-open "${htmlPath}"`;
      exec(command);
    }
  }
}

// ==========================================
// Interactive Mode
// ==========================================

function askQuestion(rl, prompt) {
  return new Promise(resolve => {
    rl.question(`${colors.yellow}${prompt}${colors.reset}`, resolve);
  });
}

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  printBanner();
  printMainMenu();

  const choice = await askQuestion(rl, 'Select diagram type (0-6): ');
  const choiceNum = parseInt(choice, 10);

  if (choiceNum === 0 || isNaN(choiceNum)) {
    log('\n👋 Goodbye!', 'cyan');
    rl.close();
    return;
  }

  let selection = null;

  switch (choiceNum) {
    case 1: // REST API
      selection = await showApiModulesMenu(rl);
      rl.close();
      if (selection) {
        await runApiDiagrams(selection, true);
      }
      break;

    case 2: // Socket.IO
      selection = await showSocketFlowsMenu(rl);
      rl.close();
      if (selection) {
        await runSocketDiagrams(selection, true);
      }
      break;

    case 3: // Schema/ERD
      selection = await showSchemaModelsMenu(rl);
      rl.close();
      if (selection) {
        await runSchemaDiagrams(selection, true);
      }
      break;

    case 4: // All
      rl.close();
      await runAllDiagrams(true);
      break;

    case 5: // Module View
      selection = await showModuleViewMenu(rl);
      rl.close();
      if (selection) {
        await generateModuleDiagrams(selection, true);
      }
      break;

    case 6: // Combined REST + Socket.IO
      selection = await showCombinedFlowMenu(rl);
      rl.close();
      if (selection) {
        await runCombinedDiagrams(selection, true);
      }
      break;

    default:
      logError('Invalid choice');
      rl.close();
  }
}

// ==========================================
// CLI Argument Parsing
// ==========================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: null,
    module: null,
    moduleView: false,
    combined: null, // null = not set, 'all' = all modules, string = specific module
    socketMap: false,
    open: false,
    help: false,
    list: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
      case '-t':
        options.type = args[++i];
        break;
      case '--api':
        options.type = 'api';
        break;
      case '--socket':
        options.type = 'socket';
        break;
      case '--schema':
        options.type = 'schema';
        break;
      case '--combined':
        // Check if next arg is a module name (not starting with --)
        if (args[i + 1] && !args[i + 1].startsWith('--')) {
          options.combined = args[++i];
        } else {
          options.combined = 'all';
        }
        break;
      case '--socket-map':
        options.socketMap = true;
        break;
      case '--all':
        options.type = 'all';
        break;
      case '--module':
      case '-m':
        options.module = args[++i];
        break;
      case '--module-view':
        options.moduleView = true;
        break;
      case '--open':
      case '-o':
        options.open = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--list':
      case '-l':
        options.list = true;
        break;
    }
  }

  return options;
}

// ==========================================
// Main Entry Point
// ==========================================

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    return;
  }

  if (options.list) {
    printList();
    return;
  }

  // Handle --socket-map flag (show REST → Socket.IO mapping summary)
  if (options.socketMap) {
    printBanner();
    const mapper = new RestSocketMapper();
    mapper.printMappingSummary();
    return;
  }

  // Handle --combined flag (generate combined REST + Socket.IO diagrams)
  if (options.combined !== null) {
    printBanner();
    if (options.combined === 'all') {
      await runCombinedDiagrams(null, options.open);
    } else {
      await runCombinedDiagrams(null, options.open, options.combined);
    }
    return;
  }

  // Handle --module <name> flag
  if (options.module) {
    printBanner();

    const modules = discoverModules();
    const moduleInfo = modules.find(m => m.name.toLowerCase() === options.module.toLowerCase());

    if (!moduleInfo) {
      logError(`Module not found: ${options.module}`);
      console.log();
      log('Available modules:', 'dim');
      modules.forEach(m => {
        const types = [];
        if (m.hasRest) types.push('REST');
        if (m.hasSocket) types.push('Socket');
        if (m.hasSchema) types.push('Schema');
        log(`  - ${m.name} (${types.join(', ')})`, 'dim');
      });
      return;
    }

    await generateModuleDiagrams(moduleInfo, options.open);
    return;
  }

  // Handle --module-view flag (interactive module selection)
  if (options.moduleView) {
    printBanner();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const selection = await showModuleViewMenu(rl);
    rl.close();

    if (selection) {
      await generateModuleDiagrams(selection, options.open);
    }
    return;
  }

  if (options.type) {
    printBanner();

    switch (options.type) {
      case 'api':
        await runApiDiagrams(null, options.open);
        break;
      case 'socket':
        await runSocketDiagrams(null, options.open);
        break;
      case 'schema':
        await runSchemaDiagrams(null, options.open);
        break;
      case 'all':
        await runAllDiagrams(options.open);
        break;
      default:
        logError(`Unknown diagram type: ${options.type}`);
        log('Use --help to see available types', 'dim');
    }
  } else {
    // Interactive mode
    await interactiveMode();
  }
}

// Run
main().catch(err => {
  logError(err.message);
  process.exit(1);
});
