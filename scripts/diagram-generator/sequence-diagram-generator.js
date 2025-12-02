#!/usr/bin/env node

/**
 * Mermaid Sequence Diagram Generator
 *
 * TypeScript backend codebase থেকে automatic Mermaid.js sequence diagrams generate করে
 *
 * Usage:
 *   node scripts/diagram-generator/sequence-diagram-generator.js
 *   node scripts/diagram-generator/sequence-diagram-generator.js --module auth
 *   node scripts/diagram-generator/sequence-diagram-generator.js --endpoint "POST /api/v1/auth/login"
 *   node scripts/diagram-generator/sequence-diagram-generator.js --all
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const inquirer = require('inquirer');
const chalk = require('chalk');

// Import utilities
const RouteAnalyzer = require('./utils/routeAnalyzer');
const ControllerTracer = require('./utils/controllerTracer');
const ServiceTracer = require('./utils/serviceTracer');
const MermaidGenerator = require('./utils/mermaidGenerator');
const config = require('./config');

class SequenceDiagramGenerator {
  constructor() {
    this.routeAnalyzer = new RouteAnalyzer();
    this.controllerTracer = new ControllerTracer();
    this.lastGeneratedHtml = null; // Track last generated HTML file
    this.serviceTracer = new ServiceTracer();
    this.stats = {
      totalDiagrams: 0,
      success: 0,
      failed: 0,
    };
    // Store all routes for sidebar navigation
    this.allRoutes = {};
  }

  /**
   * Main entry point
   */
  async run() {
    this.printBanner();

    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    // Check for --open flag (auto-open in browser)
    const autoOpen = args.includes('--open') || args.includes('-o');

    // Parse command line arguments
    if (args.includes('--all')) {
      await this.generateAllModules();
    } else if (args.includes('--module')) {
      const moduleIndex = args.indexOf('--module');
      const moduleName = args[moduleIndex + 1];
      await this.generateModuleDiagrams(moduleName);
    } else if (args.includes('--endpoint')) {
      const endpointIndex = args.indexOf('--endpoint');
      const endpoint = args[endpointIndex + 1];
      await this.generateEndpointDiagram(endpoint);
    } else {
      // Interactive mode - always auto-open
      await this.interactiveMode();
      this.printSummary(true); // Always open in interactive mode
      return;
    }

    this.printSummary(autoOpen);
  }

  /**
   * Interactive mode with inquirer
   */
  async interactiveMode() {
    console.log(chalk.cyan('\n🎯 Interactive Diagram Generator\n'));

    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'What would you like to generate?',
        choices: [
          { name: '📍 Single Endpoint Diagram', value: 'single' },
          { name: '📁 Full Module Diagram', value: 'module' },
          { name: '🌐 All Modules Overview', value: 'all' },
        ],
      },
    ]);

    if (mode === 'single') {
      await this.interactiveSingleEndpoint();
    } else if (mode === 'module') {
      await this.interactiveModule();
    } else if (mode === 'all') {
      await this.generateAllModules();
    }
  }

  /**
   * Interactive single endpoint selection
   */
  async interactiveSingleEndpoint() {
    const modules = this.routeAnalyzer.getAllModules();

    const { moduleName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'moduleName',
        message: 'Select module:',
        choices: modules,
      },
    ]);

    const moduleAnalysis = this.routeAnalyzer.analyzeModule(moduleName);

    if (moduleAnalysis.routes.length === 0) {
      console.log(chalk.red(`\n❌ No routes found in ${moduleName} module`));
      return;
    }

    const routeChoices = moduleAnalysis.routes.map(route => ({
      name: `${route.method} ${route.path}`,
      value: route,
    }));

    const { selectedRoute } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedRoute',
        message: 'Select endpoint:',
        choices: routeChoices,
      },
    ]);

    const { detailLevel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'detailLevel',
        message: 'Select detail level:',
        choices: [
          { name: '🎯 High-Level (Quick overview)', value: 'overview' },
          { name: '📊 Standard (Recommended)', value: 'standard' },
          { name: '🔬 Ultra-Detailed (Maximum info)', value: 'detailed' },
        ],
        default: 'standard',
      },
    ]);

    await this.generateSingleDiagram(
      moduleName,
      selectedRoute,
      detailLevel
    );
  }

  /**
   * Interactive module selection
   */
  async interactiveModule() {
    const modules = this.routeAnalyzer.getAllModules();

    const { moduleName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'moduleName',
        message: 'Select module:',
        choices: modules,
      },
    ]);

    await this.generateModuleDiagrams(moduleName);
  }

  /**
   * Generate diagram for single endpoint
   */
  async generateSingleDiagram(moduleName, route, detailLevel = 'standard') {
    try {
      console.log(
        chalk.cyan(`\n📊 Generating diagram for ${route.method} ${route.path}...\n`)
      );

      // Get module structure
      const structure = this.routeAnalyzer.analyzeModuleStructure(moduleName);

      // Trace controller
      const controllerData = this.traceController(structure, route);

      // Trace service
      const serviceData = this.traceService(structure, controllerData);

      // Generate diagram
      const flowData = {
        module: moduleName,
        route: route.path,
        endpoint: route,
        controller: controllerData,
        service: serviceData,
      };

      const generator = new MermaidGenerator(detailLevel);
      const mermaidCode = generator.generate(flowData);

      // Save files with navigation data
      const fileName = this.generateFileName(moduleName, route, detailLevel);
      this.saveDiagram(mermaidCode, fileName, generator, route, moduleName);

      this.stats.totalDiagrams++;
      this.stats.success++;

      console.log(chalk.green(`✅ Diagram generated successfully!\n`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      this.stats.failed++;
    }
  }

  /**
   * Trace controller method
   */
  traceController(structure, route) {
    if (!structure.controllerFile) {
      console.log(chalk.yellow('⚠️  No controller file found'));
      return null;
    }

    const controllerMethod = route.middlewareChain.find(
      m => m.name === 'controller'
    );

    if (!controllerMethod) {
      return null;
    }

    return this.controllerTracer.traceMethod(
      structure.controllerFile,
      controllerMethod.method
    );
  }

  /**
   * Trace service method
   */
  traceService(structure, controllerData) {
    if (!structure.serviceFile || !controllerData) {
      return null;
    }

    if (controllerData.serviceCalls.length === 0) {
      return null;
    }

    const firstServiceCall = controllerData.serviceCalls[0];

    return this.serviceTracer.traceMethod(
      structure.serviceFile,
      firstServiceCall.methodName
    );
  }

  /**
   * Generate all modules
   */
  async generateAllModules() {
    console.log(chalk.cyan('\n🌐 Generating diagrams for all modules...\n'));

    const modules = this.routeAnalyzer.getAllModules();

    // Step 1: Collect all routes first for sidebar navigation
    console.log(chalk.gray('  📋 Collecting routes for navigation...'));
    this.collectAllRoutes(modules);

    // Step 2: Generate diagrams with navigation data
    for (const moduleName of modules) {
      await this.generateModuleDiagrams(moduleName, false);
    }
  }

  /**
   * Collect all routes from all modules for sidebar navigation
   */
  collectAllRoutes(modules) {
    this.allRoutes = {};

    for (const moduleName of modules) {
      const moduleAnalysis = this.routeAnalyzer.analyzeModule(moduleName);

      if (moduleAnalysis.routes.length > 0) {
        this.allRoutes[moduleName] = moduleAnalysis.routes.map(route => ({
          method: route.method,
          path: route.path,
          htmlFile: `${this.generateFileName(moduleName, route, 'standard')}.html`,
        }));
      }
    }

    const totalRoutes = Object.values(this.allRoutes).reduce((sum, routes) => sum + routes.length, 0);
    console.log(chalk.green(`  ✓ Found ${totalRoutes} routes across ${Object.keys(this.allRoutes).length} modules\n`));
  }

  /**
   * Generate diagrams for entire module
   */
  async generateModuleDiagrams(moduleName, verbose = true) {
    if (verbose) {
      console.log(
        chalk.cyan(`\n📁 Generating diagrams for ${moduleName} module...\n`)
      );
    }

    const moduleAnalysis = this.routeAnalyzer.analyzeModule(moduleName);

    if (moduleAnalysis.routes.length === 0) {
      console.log(
        chalk.yellow(`⚠️  No routes found in ${moduleName} module`)
      );
      return;
    }

    // Collect routes for this single module if allRoutes is empty
    if (Object.keys(this.allRoutes).length === 0) {
      this.allRoutes[moduleName] = moduleAnalysis.routes.map(route => ({
        method: route.method,
        path: route.path,
        htmlFile: `${this.generateFileName(moduleName, route, 'standard')}.html`,
      }));
    }

    for (const route of moduleAnalysis.routes) {
      await this.generateSingleDiagram(moduleName, route, 'standard');
    }
  }

  /**
   * Generate from endpoint string (e.g., "POST /api/v1/auth/login")
   */
  async generateEndpointDiagram(endpointString) {
    const [method, ...pathParts] = endpointString.split(' ');
    const path = pathParts.join(' ');

    const moduleName = this.routeAnalyzer.guessModuleFromPath(path);

    if (!moduleName) {
      console.log(chalk.red('❌ Could not determine module from path'));
      return;
    }

    const endpoint = this.routeAnalyzer.findEndpoint(method, path);

    if (!endpoint) {
      console.log(chalk.red(`❌ Endpoint not found: ${method} ${path}`));
      return;
    }

    await this.generateSingleDiagram(moduleName, endpoint);
  }

  /**
   * Save diagram files
   */
  saveDiagram(mermaidCode, fileName, generator, route, moduleName) {
    const outputDir = config.output.diagramsDir;
    const htmlDir = config.output.htmlDir;

    // Ensure directories exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (!fs.existsSync(htmlDir)) {
      fs.mkdirSync(htmlDir, { recursive: true });
    }

    // Save .mmd file
    const mmdPath = path.join(outputDir, `${fileName}.mmd`);
    fs.writeFileSync(mmdPath, mermaidCode, 'utf-8');
    console.log(chalk.green(`  ✓ Saved: ${mmdPath}`));

    // Prepare navigation data for sidebar
    const navigation = {
      allRoutes: this.allRoutes,
      currentRoute: {
        method: route.method,
        path: route.path,
      },
      currentModule: moduleName,
    };

    // Save .html file with sidebar navigation
    const title = `${route.method} ${route.path}`;
    const html = generator.generateHTML(mermaidCode, title, navigation);
    const htmlPath = path.join(htmlDir, `${fileName}.html`);
    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(chalk.green(`  ✓ Saved: ${htmlPath}`));

    // Track last generated HTML for auto-open
    this.lastGeneratedHtml = path.resolve(htmlPath);
  }

  /**
   * Open HTML file in default browser
   */
  openInBrowser(filePath) {
    const absolutePath = path.resolve(filePath);

    // Detect platform and use appropriate command
    const platform = process.platform;
    let command;

    if (platform === 'win32') {
      command = `start "" "${absolutePath}"`;
    } else if (platform === 'darwin') {
      command = `open "${absolutePath}"`;
    } else {
      command = `xdg-open "${absolutePath}"`;
    }

    exec(command, (error) => {
      if (error) {
        console.log(chalk.yellow(`⚠️  Could not auto-open browser. Please open manually:`));
        console.log(chalk.cyan(`   ${absolutePath}`));
      }
    });
  }

  /**
   * Generate file name
   */
  generateFileName(moduleName, route, detailLevel) {
    const method = route.method.toLowerCase();
    const path = route.path
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/:/g, '');

    return `${moduleName}-${method}-${path}-${detailLevel}`;
  }

  /**
   * Print banner
   */
  printBanner() {
    console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║                                               ║'));
    console.log(chalk.bold.cyan('║   📊 Mermaid Sequence Diagram Generator      ║'));
    console.log(chalk.bold.cyan('║                                               ║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════╝\n'));
  }

  /**
   * Print summary and optionally open in browser
   */
  printSummary(autoOpen = false) {
    console.log(chalk.bold('\n📋 Generation Summary:'));
    console.log(chalk.cyan(`  Total Diagrams: ${this.stats.totalDiagrams}`));
    console.log(chalk.green(`  ✓ Success: ${this.stats.success}`));

    if (this.stats.failed > 0) {
      console.log(chalk.red(`  ✗ Failed: ${this.stats.failed}`));
    }

    // Auto-open last generated HTML in browser
    if (autoOpen && this.lastGeneratedHtml) {
      console.log(chalk.cyan(`\n🌐 Opening diagram in browser...`));
      this.openInBrowser(this.lastGeneratedHtml);
    } else if (this.lastGeneratedHtml) {
      console.log(chalk.gray(`\n💡 Tip: Add --open flag to auto-open in browser`));
      console.log(chalk.gray(`   Or run: start ${this.lastGeneratedHtml}\n`));
    }
  }

  /**
   * Show help
   */
  showHelp() {
    console.log(`
${chalk.bold('Mermaid Sequence Diagram Generator')}

${chalk.cyan('Usage:')}
  node scripts/diagram-generator/sequence-diagram-generator.js [options]

${chalk.cyan('Options:')}
  ${chalk.yellow('--help, -h')}           Show this help message
  ${chalk.yellow('--all')}                Generate diagrams for all modules
  ${chalk.yellow('--module <name>')}      Generate diagrams for specific module
  ${chalk.yellow('--endpoint <string>')}  Generate diagram for specific endpoint
  ${chalk.yellow('--open, -o')}           Auto-open last diagram in browser

${chalk.cyan('Examples:')}
  ${chalk.gray('# Interactive mode')}
  node scripts/diagram-generator/sequence-diagram-generator.js

  ${chalk.gray('# Generate all modules')}
  node scripts/diagram-generator/sequence-diagram-generator.js --all

  ${chalk.gray('# Generate specific module')}
  node scripts/diagram-generator/sequence-diagram-generator.js --module auth

  ${chalk.gray('# Generate specific endpoint')}
  node scripts/diagram-generator/sequence-diagram-generator.js --endpoint "POST /api/v1/auth/login"

${chalk.cyan('Output:')}
  Diagrams are saved in:
    - ${chalk.gray('scripts/diagram-generator/output/diagrams/')}  (.mmd files)
    - ${chalk.gray('scripts/diagram-generator/output/html/')}      (.html files)
`);
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new SequenceDiagramGenerator();
  generator.run().catch(error => {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = SequenceDiagramGenerator;
