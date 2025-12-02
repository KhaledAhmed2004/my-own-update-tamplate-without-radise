const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Scenario-based Load Testing Tool
 *
 * Tests multi-step user workflows with context-based execution
 *
 * Usage:
 *   node scripts/load-test/scenario.js user-journey --users 50 --duration 5m
 */

class ScenarioRunner {
  constructor(scenario, options = {}) {
    this.scenario = scenario;
    this.options = {
      baseUrl: options.baseUrl || 'http://localhost:5000',
      users: options.users || 10,
      duration: options.duration || 300, // seconds
      ...options
    };

    this.stats = {
      byStep: {},
      completedJourneys: 0,
      failedJourneys: 0,
      totalJourneys: 0,
      startTime: null,
      endTime: null
    };

    this.stopRequested = false;
  }

  async run() {
    console.log(`🎭 Running Scenario: ${this.scenario.name}\n`);
    this.printConfig();

    // Initialize step stats
    this.scenario.steps.forEach((step, index) => {
      this.stats.byStep[index] = {
        name: step.name,
        success: 0,
        failed: 0,
        responseTimes: []
      };
    });

    this.stats.startTime = Date.now();

    // Start all virtual users
    const promises = [];
    for (let userId = 1; userId <= this.options.users; userId++) {
      promises.push(this.runUserJourney(userId));
      await this.sleep(100); // Small delay between user starts
    }

    // Wait for duration or all users to complete
    setTimeout(() => { this.stopRequested = true; }, this.options.duration * 1000);

    await Promise.all(promises);

    this.stats.endTime = Date.now();
    this.printResults();
  }

  async runUserJourney(userId) {
    // Initialize context for this user
    const context = {
      userId: userId,
      userIndex: userId,
      timestamp: Date.now()
    };

    this.stats.totalJourneys++;

    for (let stepIndex = 0; stepIndex < this.scenario.steps.length; stepIndex++) {
      if (this.stopRequested) break;

      const step = this.scenario.steps[stepIndex];

      try {
        const success = await this.executeStep(step, stepIndex, context);

        if (!success && step.critical !== false) {
          this.stats.failedJourneys++;
          return; // Stop journey on critical step failure
        }

        // Think time between steps
        await this.sleep(500 + Math.random() * 1500);

      } catch (error) {
        this.stats.byStep[stepIndex].failed++;
        this.stats.failedJourneys++;
        return;
      }
    }

    this.stats.completedJourneys++;
  }

  async executeStep(step, stepIndex, context) {
    const startTime = Date.now();

    // Build request
    const endpoint = typeof step.endpoint === 'function'
      ? step.endpoint(context)
      : step.endpoint;

    const headers = typeof step.headers === 'function'
      ? step.headers(context)
      : (step.headers || {});

    const body = typeof step.body === 'function'
      ? step.body(context)
      : step.body;

    // Make request
    const response = await this.makeRequest({
      method: step.method,
      endpoint: endpoint,
      headers: headers,
      body: body
    });

    const responseTime = Date.now() - startTime;
    this.stats.byStep[stepIndex].responseTimes.push(responseTime);

    // Extract data to context
    if (response.success && step.extract) {
      Object.entries(step.extract).forEach(([key, path]) => {
        const value = this.getNestedValue(response.data, path);
        if (value !== undefined) {
          context[key] = value;
        }
      });
    }

    // Validate
    const valid = this.validateStep(response, step.expect);

    if (valid) {
      this.stats.byStep[stepIndex].success++;
    } else {
      this.stats.byStep[stepIndex].failed++;
    }

    return valid;
  }

  async makeRequest({ method, endpoint, headers, body }) {
    return new Promise((resolve) => {
      const fullUrl = this.options.baseUrl + endpoint;
      const urlObj = new URL(fullUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 400,
              statusCode: res.statusCode,
              data: parsed
            });
          } catch (e) {
            resolve({
              success: false,
              statusCode: res.statusCode,
              data: data
            });
          }
        });
      });

      req.on('error', () => {
        resolve({ success: false, statusCode: 0, data: null });
      });

      req.setTimeout(30000);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  validateStep(response, expectations) {
    if (!expectations) return response.success;
    if (expectations.statusCode && response.statusCode !== expectations.statusCode) {
      return false;
    }
    return response.success;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  printConfig() {
    console.log(`Scenario Steps:`);
    this.scenario.steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step.name}`);
    });
    console.log(`\nConfiguration:`);
    console.log(`  Virtual Users: ${this.options.users} concurrent journeys`);
    console.log(`  Duration: ${this.options.duration}s`);
    console.log(`\nRunning... ⏳\n`);
  }

  printResults() {
    console.log(`\n\n📊 Results by Step:\n`);
    console.log('┌─────────────────────┬─────────┬─────────┬──────────┬─────────┐');
    console.log('│ Step                │ Avg     │ P95     │ Success  │ Failed  │');
    console.log('├─────────────────────┼─────────┼─────────┼──────────┼─────────┤');

    const bottlenecks = [];

    Object.entries(this.stats.byStep).forEach(([index, stats]) => {
      const avg = this.calculateAvg(stats.responseTimes);
      const p95 = this.calculatePercentile(stats.responseTimes, 95);

      const stepNum = `${parseInt(index) + 1}. ${stats.name}`.padEnd(19);
      const avgStr = `${avg}ms`.padEnd(7);
      const p95Str = `${p95}ms`.padEnd(7);
      const successStr = stats.success.toString().padEnd(8);
      const failedStr = stats.failed > 0 ? `${stats.failed} ⚠️` : stats.failed.toString();

      console.log(`│ ${stepNum} │ ${avgStr} │ ${p95Str} │ ${successStr} │ ${failedStr.padEnd(7)} │`);

      // Detect bottlenecks
      if (p95 > 1000) {
        bottlenecks.push({
          step: `${parseInt(index) + 1}. ${stats.name}`,
          issue: 'Slow response time',
          p95: p95,
          avg: avg
        });
      }
      if (stats.failed > 0) {
        bottlenecks.push({
          step: `${parseInt(index) + 1}. ${stats.name}`,
          issue: 'Request failures',
          failures: stats.failed
        });
      }
    });

    console.log('└─────────────────────┴─────────┴─────────┴──────────┴─────────┘');

    // Print bottlenecks
    if (bottlenecks.length > 0) {
      console.log(`\n⚠️  Bottlenecks Detected:\n`);
      bottlenecks.forEach((b, i) => {
        console.log(`${i + 1}. ${b.step} - ${b.issue}`);
        if (b.p95) {
          console.log(`   Problem: P95 = ${b.p95}ms (Slow!)`);
          console.log(`   Avg: ${b.avg}ms, but P95: ${b.p95}ms shows inconsistency`);
          console.log(`   💡 Recommendations:`);
          console.log(`   - Add database indexes`);
          console.log(`   - Implement caching`);
          console.log(`   - Optimize queries`);
        }
        if (b.failures) {
          console.log(`   Failures: ${b.failures}`);
          console.log(`   💡 Recommendations:`);
          console.log(`   - Check server logs`);
          console.log(`   - Increase timeout`);
          console.log(`   - Review connection pool`);
        }
        console.log();
      });
    }

    // Summary
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    console.log(`📈 Summary:`);
    console.log(`  Total Journeys: ${this.stats.totalJourneys}`);
    console.log(`  Completed: ${this.stats.completedJourneys} (${this.getPercentage(this.stats.completedJourneys, this.stats.totalJourneys)}%)`);
    console.log(`  Failed: ${this.stats.failedJourneys} (${this.getPercentage(this.stats.failedJourneys, this.stats.totalJourneys)}%)`);
    console.log(`  Duration: ${duration.toFixed(1)}s`);
  }

  calculateAvg(arr) {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getPercentage(value, total) {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(1);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  const scenarioName = args[0];
  const options = { users: 10, duration: 300 };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--users') options.users = parseInt(args[i + 1]);
    if (args[i] === '--duration') options.duration = parseDuration(args[i + 1]);
  }

  const scenario = require(`./scenarios/${scenarioName}`);
  const runner = new ScenarioRunner(scenario, options);
  await runner.run();
}

function parseDuration(str) {
  if (str.endsWith('m')) return parseInt(str) * 60;
  if (str.endsWith('s')) return parseInt(str);
  return parseInt(str);
}

function showHelp() {
  console.log(`
🎭 Scenario-based Load Testing - Help

Usage:
  node scripts/load-test/scenario.js <scenario-name> [options]

Options:
  --users <number>      Number of concurrent users (default: 10)
  --duration <time>     Test duration: 60s, 5m (default: 5m)

Available Scenarios:
  user-journey         Complete user registration to task creation
  auth-only           Quick authentication test
  payment-flow        Payment workflow testing

Examples:
  node scripts/load-test/scenario.js user-journey --users 50 --duration 5m
  node scripts/load-test/scenario.js auth-only --users 100 --duration 2m
`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ScenarioRunner;
