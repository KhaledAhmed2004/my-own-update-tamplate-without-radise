const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Artillery Test Runner
 *
 * Wrapper script for running Artillery load tests
 *
 * Features:
 * - Check Artillery installation
 * - Run tests with custom options
 * - Generate HTML reports automatically
 * - Support for multiple environments
 *
 * Usage:
 *   node scripts/load-test/run-artillery.js user-journey
 *   node scripts/load-test/run-artillery.js auth-only --target http://staging.example.com
 */

class ArtilleryRunner {
  constructor(options = {}) {
    this.options = {
      configsDir: options.configsDir || path.join(__dirname, 'artillery-configs'),
      reportsDir: options.reportsDir || path.join(__dirname, 'artillery-reports'),
      target: options.target || null,
      ...options
    };

    // Ensure reports directory exists
    if (!fs.existsSync(this.options.reportsDir)) {
      fs.mkdirSync(this.options.reportsDir, { recursive: true });
    }
  }

  /**
   * Check if Artillery is installed
   */
  async checkInstallation() {
    return new Promise((resolve) => {
      exec('artillery --version', (error, stdout) => {
        if (error) {
          resolve({ installed: false });
        } else {
          resolve({
            installed: true,
            version: stdout.trim()
          });
        }
      });
    });
  }

  /**
   * Run Artillery test
   */
  async run(scenarioName) {
    console.log('🎯 Artillery Test Runner\n');

    // Check installation
    console.log('Checking Artillery installation...');
    const installation = await this.checkInstallation();

    if (!installation.installed) {
      console.log('\n❌ Artillery is not installed!');
      console.log('\nTo install Artillery globally:');
      console.log('  npm install -g artillery');
      console.log('\nOr install locally in this project:');
      console.log('  npm install --save-dev artillery');
      console.log('  npx artillery --version\n');
      process.exit(1);
    }

    console.log(`✅ Artillery ${installation.version} found\n`);

    // Check config file exists
    const configPath = path.join(this.options.configsDir, `${scenarioName}.yml`);

    if (!fs.existsSync(configPath)) {
      console.log(`❌ Config file not found: ${configPath}`);
      console.log('\nGenerate config first:');
      console.log(`  node scripts/load-test/artillery-generator.js ${scenarioName}`);
      console.log('  or');
      console.log('  node scripts/load-test/artillery-generator.js --all\n');
      process.exit(1);
    }

    // Prepare output files
    const timestamp = Date.now();
    const jsonOutput = path.join(this.options.reportsDir, `${scenarioName}-${timestamp}.json`);
    const htmlOutput = path.join(this.options.reportsDir, `${scenarioName}-${timestamp}.html`);

    // Build command
    let command = `artillery run`;

    if (this.options.target) {
      command += ` --target ${this.options.target}`;
    }

    command += ` --output "${jsonOutput}"`;
    command += ` "${configPath}"`;

    // Run test
    console.log(`Running: ${scenarioName}`);
    console.log(`Config: ${configPath}`);
    if (this.options.target) {
      console.log(`Target: ${this.options.target}`);
    }
    console.log('\n' + '='.repeat(60));
    console.log('\n');

    await this.executeCommand(command);

    // Generate HTML report
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Generating HTML report...\n');

    const reportCommand = `artillery report "${jsonOutput}" --output "${htmlOutput}"`;
    await this.executeCommand(reportCommand);

    // Print results
    console.log('\n✅ Test completed!\n');
    console.log('Generated files:');
    console.log(`  JSON Report: ${jsonOutput}`);
    console.log(`  HTML Report: ${htmlOutput}`);
    console.log(`\nOpen HTML report in browser to view detailed results.\n`);

    return {
      jsonOutput,
      htmlOutput
    };
  }

  /**
   * Execute command and stream output
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const child = exec(command);

      child.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      child.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * List available scenarios
   */
  listScenarios() {
    if (!fs.existsSync(this.options.configsDir)) {
      console.log('No Artillery configs found.');
      console.log('Generate configs first:');
      console.log('  node scripts/load-test/artillery-generator.js --all\n');
      return [];
    }

    const configs = fs.readdirSync(this.options.configsDir)
      .filter(file => file.endsWith('.yml'))
      .map(file => file.replace('.yml', ''));

    if (configs.length === 0) {
      console.log('No Artillery configs found.');
      console.log('Generate configs first:');
      console.log('  node scripts/load-test/artillery-generator.js --all\n');
    } else {
      console.log('Available Artillery scenarios:\n');
      configs.forEach(config => {
        console.log(`  • ${config}`);
      });
      console.log('');
    }

    return configs;
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--list') || args.includes('-l')) {
    const runner = new ArtilleryRunner();
    runner.listScenarios();
    process.exit(0);
  }

  const scenarioName = args[0];
  const options = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--target' || args[i] === '-t') {
      options.target = args[i + 1];
      i++;
    }
  }

  const runner = new ArtilleryRunner(options);

  try {
    await runner.run(scenarioName);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🎯 Artillery Test Runner

Runs Artillery load tests with automatic report generation.

Usage:
  node scripts/load-test/run-artillery.js <scenario-name> [options]

Options:
  <scenario-name>       Name of the scenario to run
  --target, -t <url>    Target URL (overrides config)
  --list, -l            List available scenarios
  --help, -h            Show this help

Examples:
  # Run test with default target
  node scripts/load-test/run-artillery.js user-journey

  # Run test with custom target
  node scripts/load-test/run-artillery.js auth-only --target http://staging.example.com

  # List available scenarios
  node scripts/load-test/run-artillery.js --list

Prerequisites:
  1. Generate Artillery configs first:
     node scripts/load-test/artillery-generator.js --all

  2. Install Artillery:
     npm install -g artillery

Output:
  - JSON report: scripts/load-test/artillery-reports/<scenario>-<timestamp>.json
  - HTML report: scripts/load-test/artillery-reports/<scenario>-<timestamp>.html

Artillery Commands (Direct):
  # Run test directly
  artillery run artillery-configs/user-journey.yml

  # Quick test
  artillery quick --count 10 --num 100 http://localhost:5000/api/v1/tasks

  # Generate report from JSON
  artillery report report.json --output report.html

Learn More:
  https://www.artillery.io/docs
`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ArtilleryRunner;
