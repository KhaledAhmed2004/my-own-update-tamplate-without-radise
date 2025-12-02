const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * k6 Test Runner
 *
 * Wrapper script for running k6 load tests
 *
 * Features:
 * - Check k6 installation
 * - Run tests with custom options
 * - Support for different output formats
 * - Environment variable management
 *
 * Usage:
 *   node scripts/load-test/run-k6.js user-journey
 *   node scripts/load-test/run-k6.js auth-only --base-url http://staging.example.com
 */

class K6Runner {
  constructor(options = {}) {
    this.options = {
      scriptsDir: options.scriptsDir || path.join(__dirname, 'k6-scripts'),
      reportsDir: options.reportsDir || path.join(__dirname, 'k6-reports'),
      baseUrl: options.baseUrl || null,
      vus: options.vus || null,
      duration: options.duration || null,
      output: options.output || 'json',
      ...options
    };

    // Ensure reports directory exists
    if (!fs.existsSync(this.options.reportsDir)) {
      fs.mkdirSync(this.options.reportsDir, { recursive: true });
    }
  }

  /**
   * Check if k6 is installed
   */
  async checkInstallation() {
    return new Promise((resolve) => {
      exec('k6 version', (error, stdout) => {
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
   * Run k6 test
   */
  async run(scenarioName) {
    console.log('🎯 k6 Test Runner\n');

    // Check installation
    console.log('Checking k6 installation...');
    const installation = await this.checkInstallation();

    if (!installation.installed) {
      console.log('\n❌ k6 is not installed!');
      console.log('\nInstallation instructions:');
      console.log('\n  macOS (Homebrew):');
      console.log('    brew install k6');
      console.log('\n  Windows (Chocolatey):');
      console.log('    choco install k6');
      console.log('\n  Linux (Debian/Ubuntu):');
      console.log('    See: https://k6.io/docs/get-started/installation/');
      console.log('\n  Docker:');
      console.log('    docker pull grafana/k6');
      console.log('    docker run --rm -i grafana/k6 run - <script.js\n');
      process.exit(1);
    }

    console.log(`✅ ${installation.version} found\n`);

    // Check script file exists
    const scriptPath = path.join(this.options.scriptsDir, `${scenarioName}.js`);

    if (!fs.existsSync(scriptPath)) {
      console.log(`❌ Script file not found: ${scriptPath}`);
      console.log('\nGenerate script first:');
      console.log(`  node scripts/load-test/k6-generator.js ${scenarioName}`);
      console.log('  or');
      console.log('  node scripts/load-test/k6-generator.js --all\n');
      process.exit(1);
    }

    // Prepare output file
    const timestamp = Date.now();
    const outputExt = this.options.output === 'csv' ? 'csv' : 'json';
    const outputPath = path.join(this.options.reportsDir, `${scenarioName}-${timestamp}.${outputExt}`);

    // Build command
    let command = `k6 run`;

    // Add base URL
    if (this.options.baseUrl) {
      command += ` --env BASE_URL=${this.options.baseUrl}`;
    }

    // Add VUs (overrides script configuration)
    if (this.options.vus) {
      command += ` --vus ${this.options.vus}`;
    }

    // Add duration (overrides script configuration)
    if (this.options.duration) {
      command += ` --duration ${this.options.duration}`;
    }

    // Add output format
    command += ` --out ${this.options.output}="${outputPath}"`;

    // Add script path
    command += ` "${scriptPath}"`;

    // Run test
    console.log(`Running: ${scenarioName}`);
    console.log(`Script: ${scriptPath}`);
    if (this.options.baseUrl) {
      console.log(`Base URL: ${this.options.baseUrl}`);
    }
    if (this.options.vus) {
      console.log(`Virtual Users: ${this.options.vus}`);
    }
    if (this.options.duration) {
      console.log(`Duration: ${this.options.duration}`);
    }
    console.log('\n' + '='.repeat(60));
    console.log('\n');

    await this.executeCommand(command);

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Test completed!\n');
    console.log('Generated report:');
    console.log(`  ${outputPath}`);

    if (this.options.output === 'json') {
      console.log('\nAnalyze results:');
      console.log(`  node scripts/load-test/analyze-k6-results.js ${outputPath}`);
    }

    console.log('');

    return {
      outputPath
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
    if (!fs.existsSync(this.options.scriptsDir)) {
      console.log('No k6 scripts found.');
      console.log('Generate scripts first:');
      console.log('  node scripts/load-test/k6-generator.js --all\n');
      return [];
    }

    const scripts = fs.readdirSync(this.options.scriptsDir)
      .filter(file => file.endsWith('.js') && file !== 'README.md')
      .map(file => file.replace('.js', ''));

    if (scripts.length === 0) {
      console.log('No k6 scripts found.');
      console.log('Generate scripts first:');
      console.log('  node scripts/load-test/k6-generator.js --all\n');
    } else {
      console.log('Available k6 scenarios:\n');
      scripts.forEach(script => {
        console.log(`  • ${script}`);
      });
      console.log('');
    }

    return scripts;
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
    const runner = new K6Runner();
    runner.listScenarios();
    process.exit(0);
  }

  const scenarioName = args[0];
  const options = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--base-url' || args[i] === '-u') {
      options.baseUrl = args[i + 1];
      i++;
    } else if (args[i] === '--vus') {
      options.vus = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--duration' || args[i] === '-d') {
      options.duration = args[i + 1];
      i++;
    } else if (args[i] === '--output' || args[i] === '-o') {
      options.output = args[i + 1];
      i++;
    }
  }

  const runner = new K6Runner(options);

  try {
    await runner.run(scenarioName);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🎯 k6 Test Runner

Runs k6 load tests with custom configuration.

Usage:
  node scripts/load-test/run-k6.js <scenario-name> [options]

Options:
  <scenario-name>           Name of the scenario to run
  --base-url, -u <url>      Base URL (default: http://localhost:5000)
  --vus <number>            Virtual users (overrides script)
  --duration, -d <time>     Test duration (e.g., 5m, 30s)
  --output, -o <format>     Output format: json|csv (default: json)
  --list, -l                List available scenarios
  --help, -h                Show this help

Examples:
  # Run test with default settings
  node scripts/load-test/run-k6.js user-journey

  # Run with custom base URL
  node scripts/load-test/run-k6.js auth-only --base-url http://staging.example.com

  # Override VUs and duration
  node scripts/load-test/run-k6.js user-journey --vus 50 --duration 5m

  # Generate CSV output
  node scripts/load-test/run-k6.js payment-flow --output csv

  # List available scenarios
  node scripts/load-test/run-k6.js --list

Prerequisites:
  1. Generate k6 scripts first:
     node scripts/load-test/k6-generator.js --all

  2. Install k6:
     brew install k6  # macOS
     choco install k6  # Windows

Output:
  - JSON/CSV report: scripts/load-test/k6-reports/<scenario>-<timestamp>.json

k6 Commands (Direct):
  # Run test directly
  k6 run k6-scripts/user-journey.js

  # With environment variable
  k6 run --env BASE_URL=http://staging.example.com k6-scripts/user-journey.js

  # With custom VUs
  k6 run --vus 50 --duration 5m k6-scripts/user-journey.js

  # View cloud results
  k6 cloud k6-scripts/user-journey.js

Learn More:
  https://k6.io/docs/
`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = K6Runner;