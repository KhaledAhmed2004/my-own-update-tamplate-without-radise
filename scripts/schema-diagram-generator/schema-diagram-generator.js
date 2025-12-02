#!/usr/bin/env node

/**
 * MongoDB Schema Diagram Generator
 *
 * Mongoose model files থেকে automatic Mermaid.js ERD diagrams generate করে
 *
 * Usage:
 *   node scripts/schema-diagram-generator/schema-diagram-generator.js
 *   node scripts/schema-diagram-generator/schema-diagram-generator.js --model User
 *   node scripts/schema-diagram-generator/schema-diagram-generator.js --all
 *   node scripts/schema-diagram-generator/schema-diagram-generator.js --all --open
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const inquirer = require('inquirer');
const chalk = require('chalk');

// Import utilities
const SchemaAnalyzer = require('./utils/schemaAnalyzer');
const SchemaParser = require('./utils/schemaParser');
const ERDGenerator = require('./utils/erdGenerator');
const config = require('./config');

class SchemaDiagramGenerator {
  constructor() {
    this.schemaAnalyzer = new SchemaAnalyzer();
    this.schemaParser = new SchemaParser();
    this.lastGeneratedHtml = null;
    this.stats = {
      totalDiagrams: 0,
      success: 0,
      failed: 0,
    };
    this.allModels = {};
    this.parsedSchemas = [];
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

    // Check for --open flag
    const autoOpen = args.includes('--open') || args.includes('-o');

    // Parse command line arguments
    if (args.includes('--all')) {
      await this.generateAllSchemas();
    } else if (args.includes('--model')) {
      const modelIndex = args.indexOf('--model');
      const modelName = args[modelIndex + 1];
      await this.generateSingleSchema(modelName);
    } else {
      // Interactive mode
      await this.interactiveMode();
      this.printSummary(true);
      return;
    }

    this.printSummary(autoOpen);
  }

  /**
   * Interactive mode with inquirer
   */
  async interactiveMode() {
    console.log(chalk.cyan('\n🎯 Interactive Schema Diagram Generator\n'));

    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'What would you like to generate?',
        choices: [
          { name: '📄 Single Model Diagram', value: 'single' },
          { name: '🗺️ Full Database ERD (All Models)', value: 'all' },
        ],
      },
    ]);

    if (mode === 'single') {
      await this.interactiveSingleModel();
    } else if (mode === 'all') {
      await this.generateAllSchemas();
    }
  }

  /**
   * Interactive single model selection
   */
  async interactiveSingleModel() {
    const modelFiles = this.schemaAnalyzer.findAllModelFiles();
    const allModels = [];

    for (const file of modelFiles) {
      for (const modelName of file.models) {
        allModels.push({
          name: `${modelName} (${file.moduleName})`,
          value: { modelName, filePath: file.filePath },
        });
      }
    }

    if (allModels.length === 0) {
      console.log(chalk.red('\n❌ No model files found in src/app/modules/'));
      return;
    }

    const { selectedModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedModel',
        message: 'Select model:',
        choices: allModels,
      },
    ]);

    const { detailLevel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'detailLevel',
        message: 'Select detail level:',
        choices: [
          { name: '🎯 Overview (Collections only)', value: 'overview' },
          { name: '📊 Standard (Fields + Relationships)', value: 'standard' },
          { name: '🔬 Detailed (Everything)', value: 'detailed' },
        ],
        default: 'standard',
      },
    ]);

    await this.generateModelDiagram(
      selectedModel.modelName,
      selectedModel.filePath,
      detailLevel
    );
  }

  /**
   * Generate diagram for a single model
   */
  async generateModelDiagram(modelName, filePath, detailLevel = 'standard') {
    try {
      console.log(chalk.cyan(`\n📊 Generating diagram for ${modelName}...\n`));

      // Parse the schema
      const schemaData = this.schemaParser.parseModelFile(filePath, modelName);

      // Generate ERD
      const generator = new ERDGenerator(detailLevel);
      const mermaidCode = generator.generate([schemaData]);

      // Collect all models for navigation
      await this.collectAllModels();

      // Save files
      const fileName = `${modelName.toLowerCase()}-schema`;
      this.saveDiagram(mermaidCode, fileName, generator, modelName, false);

      this.stats.totalDiagrams++;
      this.stats.success++;

      console.log(chalk.green(`✅ Diagram generated successfully!\n`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      console.error(error.stack);
      this.stats.failed++;
    }
  }

  /**
   * Generate diagrams for all schemas + full ERD
   */
  async generateAllSchemas() {
    console.log(chalk.cyan('\n🌐 Generating diagrams for all schemas...\n'));

    // Collect all models
    await this.collectAllModels();

    const modelFiles = this.schemaAnalyzer.findAllModelFiles();

    if (modelFiles.length === 0) {
      console.log(chalk.red('❌ No model files found'));
      return;
    }

    // Parse all schemas
    this.parsedSchemas = [];

    for (const file of modelFiles) {
      for (const modelName of file.models) {
        try {
          console.log(chalk.gray(`  📋 Parsing ${modelName}...`));
          const schemaData = this.schemaParser.parseModelFile(file.filePath, modelName);
          this.parsedSchemas.push(schemaData);

          // Generate individual diagram
          const generator = new ERDGenerator('standard');
          const mermaidCode = generator.generate([schemaData]);
          const fileName = `${modelName.toLowerCase()}-schema`;
          this.saveDiagram(mermaidCode, fileName, generator, modelName, false);

          this.stats.totalDiagrams++;
          this.stats.success++;
        } catch (error) {
          console.error(chalk.red(`  ❌ Error parsing ${modelName}: ${error.message}`));
          this.stats.failed++;
        }
      }
    }

    // Generate full ERD with all models
    if (this.parsedSchemas.length > 0) {
      console.log(chalk.cyan('\n📊 Generating full database ERD...\n'));

      try {
        const generator = new ERDGenerator('standard');
        const mermaidCode = generator.generate(this.parsedSchemas);
        this.saveDiagram(mermaidCode, 'full-erd', generator, 'Full Database ERD', true);

        this.stats.totalDiagrams++;
        this.stats.success++;

        console.log(chalk.green(`✅ Full ERD generated successfully!\n`));
      } catch (error) {
        console.error(chalk.red(`❌ Error generating full ERD: ${error.message}`));
        this.stats.failed++;
      }
    }
  }

  /**
   * Generate single schema by name
   */
  async generateSingleSchema(modelName) {
    const modelInfo = this.schemaAnalyzer.findModelByName(modelName);

    if (!modelInfo) {
      console.log(chalk.red(`\n❌ Model "${modelName}" not found`));
      console.log(chalk.gray('   Available models:'));

      const modelFiles = this.schemaAnalyzer.findAllModelFiles();
      for (const file of modelFiles) {
        for (const name of file.models) {
          console.log(chalk.gray(`     - ${name}`));
        }
      }
      return;
    }

    await this.generateModelDiagram(modelName, modelInfo.filePath, 'standard');
  }

  /**
   * Collect all models for navigation
   */
  async collectAllModels() {
    this.allModels = {};
    const modelFiles = this.schemaAnalyzer.findAllModelFiles();

    for (const file of modelFiles) {
      for (const modelName of file.models) {
        try {
          const schemaData = this.schemaParser.parseModelFile(file.filePath, modelName);
          this.allModels[modelName] = {
            htmlFile: `${modelName.toLowerCase()}-schema.html`,
            fieldCount: schemaData.fields.length,
            module: file.moduleName,
          };
        } catch (error) {
          // Skip models that fail to parse
        }
      }
    }

    const totalModels = Object.keys(this.allModels).length;
    console.log(chalk.green(`  ✓ Found ${totalModels} models\n`));
  }

  /**
   * Save diagram files
   */
  saveDiagram(mermaidCode, fileName, generator, modelName, isFullDiagram) {
    const outputDir = config.paths.diagramsDir;
    const htmlDir = config.paths.htmlDir;

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

    // Prepare navigation data
    const navigation = {
      allModels: this.allModels,
      currentModel: modelName,
      isFullDiagram,
    };

    // Save .html file
    const title = isFullDiagram ? 'Full Database ERD' : `${modelName} Schema`;
    const html = generator.generateHTML(mermaidCode, title, navigation);
    const htmlPath = path.join(htmlDir, `${fileName}.html`);
    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(chalk.green(`  ✓ Saved: ${htmlPath}`));

    // Track last generated HTML
    this.lastGeneratedHtml = path.resolve(htmlPath);
  }

  /**
   * Open HTML file in browser
   */
  openInBrowser(filePath) {
    const absolutePath = path.resolve(filePath);
    const platform = process.platform;
    let command;

    if (platform === 'win32') {
      command = `start "" "${absolutePath}"`;
    } else if (platform === 'darwin') {
      command = `open "${absolutePath}"`;
    } else {
      command = `xdg-open "${absolutePath}"`;
    }

    exec(command, error => {
      if (error) {
        console.log(chalk.yellow(`⚠️  Could not auto-open browser. Please open manually:`));
        console.log(chalk.cyan(`   ${absolutePath}`));
      }
    });
  }

  /**
   * Print banner
   */
  printBanner() {
    console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║                                               ║'));
    console.log(chalk.bold.cyan('║   📊 MongoDB Schema Diagram Generator        ║'));
    console.log(chalk.bold.cyan('║                                               ║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════╝\n'));
  }

  /**
   * Print summary
   */
  printSummary(autoOpen = false) {
    console.log(chalk.bold('\n📋 Generation Summary:'));
    console.log(chalk.cyan(`  Total Diagrams: ${this.stats.totalDiagrams}`));
    console.log(chalk.green(`  ✓ Success: ${this.stats.success}`));

    if (this.stats.failed > 0) {
      console.log(chalk.red(`  ✗ Failed: ${this.stats.failed}`));
    }

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
${chalk.bold('MongoDB Schema Diagram Generator')}

${chalk.cyan('Usage:')}
  node scripts/schema-diagram-generator/schema-diagram-generator.js [options]

${chalk.cyan('Options:')}
  ${chalk.yellow('--help, -h')}           Show this help message
  ${chalk.yellow('--all')}                Generate diagrams for all models
  ${chalk.yellow('--model <name>')}       Generate diagram for specific model
  ${chalk.yellow('--open, -o')}           Auto-open last diagram in browser

${chalk.cyan('Examples:')}
  ${chalk.gray('# Interactive mode')}
  node scripts/schema-diagram-generator/schema-diagram-generator.js

  ${chalk.gray('# Generate all models')}
  node scripts/schema-diagram-generator/schema-diagram-generator.js --all

  ${chalk.gray('# Generate specific model')}
  node scripts/schema-diagram-generator/schema-diagram-generator.js --model User

  ${chalk.gray('# Generate all and open in browser')}
  node scripts/schema-diagram-generator/schema-diagram-generator.js --all --open

${chalk.cyan('Output:')}
  Diagrams are saved in:
    - ${chalk.gray('scripts/schema-diagram-generator/output/diagrams/')}  (.mmd files)
    - ${chalk.gray('scripts/schema-diagram-generator/output/html/')}      (.html files)

${chalk.cyan('Detail Levels:')}
  - ${chalk.yellow('Overview')}: শুধু collections এবং relationships
  - ${chalk.yellow('Standard')}: Fields, types, constraints, relationships (Recommended)
  - ${chalk.yellow('Detailed')}: সব কিছু সহ - enums, defaults, validations
`);
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new SchemaDiagramGenerator();
  generator.run().catch(error => {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = SchemaDiagramGenerator;
