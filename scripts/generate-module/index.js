#!/usr/bin/env node

/**
 * Module Generator CLI
 * Generates complete module scaffolding from TypeScript interface
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs').promises;
const path = require('path');

const { parseInterface, validateParsedData } = require('./core/parser');
const { detectFeatures } = require('./core/detector');
const { generateFiles } = require('./core/generator');
const { registerRoutes } = require('./core/route-registrar');
const { formatFiles, validateTypeScript } = require('./core/post-processor');
const { formatFieldType, pluralize } = require('./utils/string-helpers');

async function main() {
  try {
    console.log(chalk.cyan.bold('\n🚀 Module Generator v1.0.0'));
    console.log(chalk.gray('━'.repeat(50)) + '\n');

    // Step 1: Get module name
    const { moduleName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'moduleName',
        message: 'Module name:',
        validate: (input) => {
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'Module name must be lowercase alphanumeric (kebab-case allowed)';
          }
          return true;
        },
      },
    ]);

    console.log(chalk.green(`✓ Module name: ${moduleName}\n`));

    // Step 2: Find interface file
    const interfacePath = path.join(
      process.cwd(),
      'src/app/modules',
      moduleName,
      `${moduleName}.interface.ts`
    );

    const spinner = ora('Searching for interface file...').start();
    spinner.text = chalk.dim(`  Looking at: ${interfacePath}`);

    try {
      await fs.access(interfacePath);
      spinner.succeed(chalk.green('Found interface file!'));
    } catch (err) {
      spinner.fail(chalk.red('Interface file not found!'));
      console.log(chalk.yellow(`\nExpected location:\n  ${interfacePath}\n`));
      console.log(chalk.dim('Please create the interface file first with your field definitions.\n'));
      process.exit(1);
    }

    // Step 3: Parse interface
    const parseSpinner = ora('Parsing TypeScript interface...').start();
    const interfaceContent = await fs.readFile(interfacePath, 'utf-8');
    const parsedData = parseInterface(interfaceContent, moduleName);

    try {
      validateParsedData(parsedData);
      parseSpinner.succeed(chalk.green('Parsed successfully'));
    } catch (err) {
      parseSpinner.fail(chalk.red('Parse error'));
      console.error(chalk.red(`\n❌ ${err.message}\n`));
      process.exit(1);
    }

    // Step 4: Detect features
    const detectSpinner = ora('Analyzing...').start();
    const config = detectFeatures(parsedData);

    detectSpinner.text = chalk.dim(`  ✓ Detected ${config.fields.length} fields`);
    await sleep(100);

    if (config.enums.length > 0) {
      detectSpinner.text = chalk.dim(`  ✓ Found ${config.enums.length} enum(s)`);
      await sleep(100);
    }

    if (config.fileUploadFields.length > 0) {
      detectSpinner.text = chalk.dim(
        `  ✓ Detected file upload: ${config.fileUploadFields.map((f) => f.name).join(', ')}`
      );
      await sleep(100);
    }

    detectSpinner.succeed(chalk.green('Analysis complete'));

    // Step 5: Show summary
    showSummary(config);

    // Step 6: Confirm
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Generate module with these settings?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\n❌ Generation cancelled.\n'));
      process.exit(0);
    }

    // Step 7: Generate files
    console.log(chalk.cyan.bold('\n✨ Starting generation...\n'));

    const genSpinner = ora('Generating files...').start();

    const files = await generateFiles(config);

    genSpinner.succeed(chalk.green(`Generated ${files.length} files`));

    files.forEach((file) => {
      console.log(chalk.dim(`  ✓ ${path.basename(file.path)} (${file.lines} lines)`));
    });

    // Step 8: Register routes
    const routeSpinner = ora('Registering routes...').start();
    await registerRoutes(config);
    routeSpinner.succeed(chalk.green('Routes registered'));

    // Step 9: Format & validate
    const formatSpinner = ora('Formatting with Prettier...').start();
    await formatFiles(files);
    formatSpinner.succeed(chalk.green('Files formatted'));

    const tsSpinner = ora('Running TypeScript check...').start();
    const tsValid = await validateTypeScript();
    if (tsValid) {
      tsSpinner.succeed(chalk.green('TypeScript check passed'));
    } else {
      tsSpinner.warn(chalk.yellow('TypeScript check found errors (check manually)'));
    }

    // Step 10: Success message
    showSuccessMessage(config, files);
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    console.error(chalk.dim(error.stack));
    process.exit(1);
  }
}

function showSummary(config) {
  console.log(chalk.gray('\n━'.repeat(50)));
  console.log(chalk.cyan.bold('📋 Configuration Summary'));
  console.log(chalk.gray('━'.repeat(50)) + '\n');

  console.log(chalk.white.bold(`Module: ${config.moduleName}`));
  console.log(chalk.dim(`Route: /api/v1/${pluralize(config.moduleName)}\n`));

  console.log(chalk.yellow.bold(`📝 Fields (${config.fields.length}):`));
  config.fields.forEach((field) => {
    if (field.name !== 'createdAt' && field.name !== 'updatedAt' && field.name !== '_id') {
      console.log(
        `  • ${chalk.white(field.name.padEnd(20))} [${formatFieldType(field)}]`
      );
    }
  });

  console.log(chalk.green.bold('\n🎨 Features:'));
  console.log(`  ${config.features.timestamps ? '✓' : '✗'} Timestamps`);
  console.log(`  ${config.features.fileUpload ? '✓' : '✗'} File Upload`);
  console.log(`  ${config.features.search ? '✓' : '✗'} Search`);
  console.log(`  ${config.features.authentication ? '✓' : '✗'} Authentication`);
  console.log(`  ${config.features.validation ? '✓' : '✗'} Validation`);

  if (config.features.search && config.searchableFields.length > 0) {
    console.log(chalk.dim(`    Search fields: ${config.searchableFields.join(', ')}`));
  }

  console.log(chalk.blue.bold('\n🔐 Authentication Roles:'));
  console.log(`  CREATE  → ${config.roles.create.join(', ')}`);
  console.log(`  READ    → ${config.roles.read.join(', ')}`);
  console.log(`  UPDATE  → ${config.roles.update.join(', ')}`);
  console.log(`  DELETE  → ${config.roles.delete.join(', ')}`);

  console.log(chalk.gray('\n━'.repeat(50)) + '\n');
}

function showSuccessMessage(config, files) {
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);

  console.log(chalk.gray('\n━'.repeat(50)));
  console.log(chalk.green.bold('✅ Module Generated Successfully!'));
  console.log(chalk.gray('━'.repeat(50)) + '\n');

  console.log(chalk.white.bold('📊 Summary:'));
  console.log(`  Files Created: ${files.length}`);
  console.log(`  Total Lines: ${totalLines}`);

  console.log(chalk.cyan.bold('\n🔗 API Endpoints:'));
  const routePath = `/api/v1/${pluralize(config.moduleName)}`;
  console.log(`  POST   ${routePath.padEnd(35)} (Create)`);
  console.log(`  GET    ${routePath.padEnd(35)} (Get All + Search)`);
  console.log(`  GET    ${(routePath + '/:id').padEnd(35)} (Get By ID)`);
  console.log(`  PATCH  ${(routePath + '/:id').padEnd(35)} (Update)`);
  console.log(`  DELETE ${(routePath + '/:id').padEnd(35)} (Delete)`);

  console.log(chalk.yellow.bold('\n📚 Next Steps:'));
  console.log(`  1. Review files: src/app/modules/${config.moduleName}/`);
  console.log(`  2. Test endpoints: npm run dev`);
  console.log(`  3. Add custom logic in service if needed`);

  console.log(chalk.green.bold('\n🎉 Module is ready to use!\n'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run
main();
