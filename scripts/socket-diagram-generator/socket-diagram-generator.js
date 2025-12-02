#!/usr/bin/env node

/**
 * Socket.IO Event Flow Diagram Generator
 *
 * Socket.IO implementation থেকে Mermaid sequence diagrams generate করে
 *
 * Usage:
 *   node socket-diagram-generator.js                    # Interactive mode
 *   node socket-diagram-generator.js --all              # Generate all flows
 *   node socket-diagram-generator.js --flow connection  # Specific flow
 *   node socket-diagram-generator.js --all --open       # Generate & open browser
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const config = require('./config');
const SequenceGenerator = require('./utils/sequenceGenerator');

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

function printBanner() {
  console.log();
  log('╔═══════════════════════════════════════════════════════╗', 'magenta');
  log('║     🔌 Socket.IO Event Flow Diagram Generator         ║', 'magenta');
  log('║     Real-time messaging flow visualization            ║', 'magenta');
  log('╚═══════════════════════════════════════════════════════╝', 'magenta');
  console.log();
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ==========================================
// File Operations
// ==========================================

function saveDiagram(filename, content, type = 'mmd') {
  const dir = type === 'mmd' ? config.paths.diagramsDir : config.paths.htmlDir;
  ensureDirectoryExists(dir);
  const filePath = path.join(dir, `${filename}.${type === 'mmd' ? 'mmd' : 'html'}`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ==========================================
// Generation Functions
// ==========================================

function generateFlow(flowId, generator) {
  const flow = config.flows.find(f => f.id === flowId);
  if (!flow) {
    throw new Error(`Unknown flow: ${flowId}`);
  }

  log(`\n📊 Generating: ${flow.name}`, 'cyan');

  // Generate Mermaid diagram
  const mermaidCode = generator.generate(flowId);
  const mmdPath = saveDiagram(flow.filename, mermaidCode, 'mmd');
  log(`   └─ ${path.basename(mmdPath)}`, 'dim');

  // Generate HTML
  const htmlContent = generator.generateHTML(mermaidCode, flow, config.flows);
  const htmlPath = saveDiagram(flow.filename, htmlContent, 'html');
  log(`   └─ ${path.basename(htmlPath)}`, 'dim');

  return { flow, mmdPath, htmlPath };
}

function generateAllFlows() {
  const generator = new SequenceGenerator('standard');
  const results = [];

  log('\n🚀 Generating all Socket.IO flow diagrams...', 'bright');

  for (const flow of config.flows) {
    try {
      const result = generateFlow(flow.id, generator);
      results.push(result);
    } catch (err) {
      logError(`Failed to generate ${flow.name}: ${err.message}`);
    }
  }

  // Generate index HTML
  log(`\n📄 Generating index page...`, 'cyan');
  const indexHtml = generator.generateIndexHTML(config.flows);
  const indexPath = saveDiagram('index', indexHtml, 'html');
  log(`   └─ index.html`, 'dim');

  return results;
}

// ==========================================
// Interactive Mode
// ==========================================

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = prompt =>
    new Promise(resolve => {
      rl.question(prompt, resolve);
    });

  printBanner();

  log('📋 Available flows:', 'bright');
  console.log();

  config.flows.forEach((flow, index) => {
    log(`   ${index + 1}. ${flow.name}`, 'cyan');
    log(`      ${flow.description}`, 'dim');
  });

  console.log();
  log(`   ${config.flows.length + 1}. 📦 Generate ALL flows`, 'green');
  log(`   0. ❌ Exit`, 'red');
  console.log();

  const choice = await question(`${colors.yellow}Select an option (0-${config.flows.length + 1}): ${colors.reset}`);
  const choiceNum = parseInt(choice, 10);

  rl.close();

  if (choiceNum === 0 || isNaN(choiceNum)) {
    log('\n👋 Goodbye!', 'cyan');
    return;
  }

  const generator = new SequenceGenerator('standard');

  if (choiceNum === config.flows.length + 1) {
    // Generate all
    const results = generateAllFlows();
    printSummary(results);
  } else if (choiceNum >= 1 && choiceNum <= config.flows.length) {
    // Generate specific flow
    const flow = config.flows[choiceNum - 1];
    const result = generateFlow(flow.id, generator);
    printSummary([result]);
  } else {
    logError('Invalid choice');
  }
}

// ==========================================
// Summary
// ==========================================

function printSummary(results) {
  console.log();
  log('═══════════════════════════════════════════════════════', 'green');
  log('                    📊 Generation Summary               ', 'green');
  log('═══════════════════════════════════════════════════════', 'green');
  console.log();

  log(`   Total diagrams generated: ${results.length}`, 'bright');
  console.log();

  log('   📁 Output locations:', 'cyan');
  log(`      Mermaid files: ${config.paths.diagramsDir}`, 'dim');
  log(`      HTML files:    ${config.paths.htmlDir}`, 'dim');
  console.log();

  log('   🌐 View diagrams:', 'cyan');
  const indexPath = path.join(config.paths.htmlDir, 'index.html');
  log(`      ${indexPath}`, 'dim');
  console.log();

  log('═══════════════════════════════════════════════════════', 'green');
}

// ==========================================
// CLI Argument Parsing
// ==========================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    all: false,
    flow: null,
    open: false,
    help: false,
    detailLevel: 'standard',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--all':
      case '-a':
        options.all = true;
        break;
      case '--flow':
      case '-f':
        options.flow = args[++i];
        break;
      case '--open':
      case '-o':
        options.open = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--detail':
      case '-d':
        options.detailLevel = args[++i] || 'standard';
        break;
    }
  }

  return options;
}

function showHelp() {
  printBanner();

  log('Usage:', 'bright');
  log('  node socket-diagram-generator.js [options]', 'dim');
  console.log();

  log('Options:', 'bright');
  log('  --all, -a              Generate all flow diagrams', 'cyan');
  log('  --flow, -f <name>      Generate specific flow diagram', 'cyan');
  log('  --open, -o             Open HTML in browser after generation', 'cyan');
  log('  --detail, -d <level>   Detail level: overview, standard, detailed', 'cyan');
  log('  --help, -h             Show this help message', 'cyan');
  console.log();

  log('Available flows:', 'bright');
  config.flows.forEach(flow => {
    log(`  ${flow.id.padEnd(20)} ${flow.name}`, 'dim');
  });
  console.log();

  log('Examples:', 'bright');
  log('  node socket-diagram-generator.js                    # Interactive mode', 'dim');
  log('  node socket-diagram-generator.js --all              # Generate all', 'dim');
  log('  node socket-diagram-generator.js --flow connection  # Specific flow', 'dim');
  log('  node socket-diagram-generator.js --all --open       # Generate & open', 'dim');
}

// ==========================================
// Main Entry Point
// ==========================================

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  // Ensure output directories exist
  ensureDirectoryExists(config.paths.diagramsDir);
  ensureDirectoryExists(config.paths.htmlDir);

  if (options.all) {
    // Generate all flows
    printBanner();
    const results = generateAllFlows();
    printSummary(results);

    if (options.open) {
      const indexPath = path.join(config.paths.htmlDir, 'index.html');
      const { exec } = require('child_process');
      const command =
        process.platform === 'win32'
          ? `start "" "${indexPath}"`
          : process.platform === 'darwin'
            ? `open "${indexPath}"`
            : `xdg-open "${indexPath}"`;
      exec(command);
      logInfo('Opening in browser...');
    }
  } else if (options.flow) {
    // Generate specific flow
    printBanner();
    const generator = new SequenceGenerator(options.detailLevel);
    try {
      const result = generateFlow(options.flow, generator);
      printSummary([result]);

      if (options.open) {
        const { exec } = require('child_process');
        const command =
          process.platform === 'win32'
            ? `start "" "${result.htmlPath}"`
            : process.platform === 'darwin'
              ? `open "${result.htmlPath}"`
              : `xdg-open "${result.htmlPath}"`;
        exec(command);
        logInfo('Opening in browser...');
      }
    } catch (err) {
      logError(err.message);
      log('\nAvailable flows:', 'yellow');
      config.flows.forEach(f => log(`  - ${f.id}`, 'dim'));
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
