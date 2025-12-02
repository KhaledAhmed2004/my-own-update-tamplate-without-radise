const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Stress Testing Tool - Find Breaking Point
 *
 * Automatically finds system capacity limits by incrementally increasing load
 *
 * Algorithm:
 * 1. Start with small load (10 users)
 * 2. Monitor performance metrics
 * 3. Increase load gradually
 * 4. Detect performance degradation
 * 5. Find breaking point
 * 6. Recommend optimal capacity
 *
 * Usage:
 *   node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login
 *   node scripts/load-test/stress-test.js --endpoint /api/v1/tasks --method GET
 */

class StressTester {
  constructor(options = {}) {
    this.options = {
      url: options.url || 'http://localhost:5000',
      endpoint: options.endpoint || '/',
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || null,
      startUsers: options.startUsers || 10,
      maxUsers: options.maxUsers || 1000,
      stepSize: options.stepSize || 10,
      stepDuration: options.stepDuration || 30, // seconds per step
      ...options
    };

    this.stages = [];
    this.breakingPoint = null;
    this.optimalCapacity = null;
    this.activeRequests = 0;
    this.stopRequested = false;
  }

  async run() {
    console.log('💪 Stress Test Starting...\n');
    this.printConfig();

    let currentUsers = this.options.startUsers;
    let previousP95 = 0;
    let consecutiveDegradations = 0;

    while (currentUsers <= this.options.maxUsers && !this.stopRequested) {
      console.log(`\n📈 Stage ${this.stages.length + 1}: Testing with ${currentUsers} users...`);

      const stageResult = await this.runStage(currentUsers);
      this.stages.push(stageResult);

      // Print stage summary
      this.printStageSummary(stageResult);

      // Check for performance degradation
      const degradation = this.detectDegradation(stageResult, previousP95);

      if (degradation.isDegraded) {
        consecutiveDegradations++;
        console.log(`\n⚠️  Performance degradation detected!`);
        console.log(`   P95: ${previousP95}ms → ${stageResult.p95}ms (${degradation.percentageChange}% increase)`);

        if (consecutiveDegradations >= 2) {
          console.log(`\n🚨 Breaking point reached at ${currentUsers} users!`);
          this.breakingPoint = currentUsers;
          this.optimalCapacity = Math.floor(currentUsers * 0.7); // 70% of breaking point
          break;
        }
      } else {
        consecutiveDegradations = 0;
      }

      // Check for failure threshold
      if (stageResult.failureRate > 5) {
        console.log(`\n🚨 Failure rate too high (${stageResult.failureRate.toFixed(1)}%)!`);
        this.breakingPoint = currentUsers;
        this.optimalCapacity = Math.floor(currentUsers * 0.6);
        break;
      }

      previousP95 = stageResult.p95;
      currentUsers += this.options.stepSize;

      // Small delay between stages
      await this.sleep(2000);
    }

    // Print final results
    this.printFinalResults();
  }

  async runStage(users) {
    const stats = {
      users: users,
      total: 0,
      success: 0,
      failed: 0,
      responseTimes: [],
      statusCodes: {},
      errors: {},
      startTime: Date.now(),
      endTime: null
    };

    this.stopRequested = false;

    // Start virtual users
    const promises = [];
    for (let i = 0; i < users; i++) {
      promises.push(this.runVirtualUser(stats));
      await this.sleep(10); // Small ramp-up
    }

    // Wait for stage duration
    await new Promise(resolve => setTimeout(resolve, this.options.stepDuration * 1000));

    this.stopRequested = true;

    // Wait for active requests to complete
    await Promise.all(promises);

    stats.endTime = Date.now();

    // Calculate metrics
    return {
      users: users,
      total: stats.total,
      success: stats.success,
      failed: stats.failed,
      failureRate: (stats.failed / stats.total) * 100,
      min: this.calculateMin(stats.responseTimes),
      max: this.calculateMax(stats.responseTimes),
      avg: this.calculateAvg(stats.responseTimes),
      p50: this.calculatePercentile(stats.responseTimes, 50),
      p95: this.calculatePercentile(stats.responseTimes, 95),
      p99: this.calculatePercentile(stats.responseTimes, 99),
      throughput: stats.total / ((stats.endTime - stats.startTime) / 1000),
      statusCodes: stats.statusCodes,
      errors: stats.errors
    };
  }

  async runVirtualUser(stats) {
    while (!this.stopRequested) {
      await this.makeRequest(stats);
      await this.sleep(Math.random() * 1000 + 500);
    }
  }

  async makeRequest(stats) {
    return new Promise((resolve) => {
      this.activeRequests++;
      const startTime = Date.now();

      const fullUrl = this.options.url.endsWith('/')
        ? this.options.url + this.options.endpoint.slice(1)
        : this.options.url + this.options.endpoint;

      const urlObj = new URL(fullUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: this.options.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers
        }
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          this.activeRequests--;

          stats.total++;
          stats.responseTimes.push(responseTime);

          if (res.statusCode >= 200 && res.statusCode < 400) {
            stats.success++;
          } else {
            stats.failed++;
          }

          stats.statusCodes[res.statusCode] =
            (stats.statusCodes[res.statusCode] || 0) + 1;

          resolve();
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        this.activeRequests--;

        stats.total++;
        stats.failed++;
        stats.responseTimes.push(responseTime);

        const errorType = error.code || 'Unknown';
        stats.errors[errorType] = (stats.errors[errorType] || 0) + 1;

        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        const errorType = 'TIMEOUT';
        stats.errors[errorType] = (stats.errors[errorType] || 0) + 1;
      });

      req.setTimeout(30000);

      if (this.options.body) {
        req.write(JSON.stringify(this.options.body));
      }

      req.end();
    });
  }

  detectDegradation(current, previousP95) {
    if (previousP95 === 0) {
      return { isDegraded: false, percentageChange: 0 };
    }

    const percentageChange = ((current.p95 - previousP95) / previousP95) * 100;

    // Degradation if P95 increased by more than 50%
    const isDegraded = percentageChange > 50;

    return {
      isDegraded,
      percentageChange: percentageChange.toFixed(1)
    };
  }

  printConfig() {
    console.log('Configuration:');
    console.log(`  URL: ${this.options.url}${this.options.endpoint}`);
    console.log(`  Method: ${this.options.method}`);
    console.log(`  Start Users: ${this.options.startUsers}`);
    console.log(`  Max Users: ${this.options.maxUsers}`);
    console.log(`  Step Size: +${this.options.stepSize} users per stage`);
    console.log(`  Stage Duration: ${this.options.stepDuration}s`);
    console.log(`\nStrategy: Incrementally increase load until degradation detected\n`);
    console.log('='.repeat(60));
  }

  printStageSummary(stage) {
    console.log(`\n  Results:`);
    console.log(`    Requests: ${stage.total} (${stage.success} success, ${stage.failed} failed)`);
    console.log(`    Response Time: Avg=${stage.avg}ms, P95=${stage.p95}ms, P99=${stage.p99}ms`);
    console.log(`    Throughput: ${stage.throughput.toFixed(1)} req/s`);
    console.log(`    Failure Rate: ${stage.failureRate.toFixed(2)}%`);

    // Performance indicator
    if (stage.p95 < 500 && stage.failureRate < 1) {
      console.log(`    Status: ✅ Healthy`);
    } else if (stage.p95 < 1000 && stage.failureRate < 5) {
      console.log(`    Status: ⚠️  Degraded`);
    } else {
      console.log(`    Status: ❌ Critical`);
    }
  }

  printFinalResults() {
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 STRESS TEST RESULTS');
    console.log('='.repeat(60));

    // Performance progression table
    console.log('\n📈 Performance Progression:\n');
    console.log('┌────────┬──────────┬─────────┬─────────┬──────────┬─────────┐');
    console.log('│ Users  │ Requests │ Avg     │ P95     │ Fail %   │ Status  │');
    console.log('├────────┼──────────┼─────────┼─────────┼──────────┼─────────┤');

    this.stages.forEach(stage => {
      const usersStr = stage.users.toString().padEnd(6);
      const reqStr = stage.total.toString().padEnd(8);
      const avgStr = `${stage.avg}ms`.padEnd(7);
      const p95Str = `${stage.p95}ms`.padEnd(7);
      const failStr = `${stage.failureRate.toFixed(1)}%`.padEnd(8);

      let status;
      if (stage.p95 < 500 && stage.failureRate < 1) {
        status = '✅     ';
      } else if (stage.p95 < 1000 && stage.failureRate < 5) {
        status = '⚠️      ';
      } else {
        status = '❌     ';
      }

      console.log(`│ ${usersStr} │ ${reqStr} │ ${avgStr} │ ${p95Str} │ ${failStr} │ ${status} │`);
    });

    console.log('└────────┴──────────┴─────────┴─────────┴──────────┴─────────┘');

    // Breaking point analysis
    if (this.breakingPoint) {
      console.log('\n🚨 Breaking Point Analysis:\n');
      console.log(`  Breaking Point: ${this.breakingPoint} concurrent users`);
      console.log(`  Optimal Capacity: ${this.optimalCapacity} concurrent users (recommended)`);
      console.log(`  Safety Margin: ${((1 - this.optimalCapacity / this.breakingPoint) * 100).toFixed(0)}% below breaking point`);
    } else {
      console.log('\n✅ System Stable:\n');
      console.log(`  No breaking point found up to ${this.options.maxUsers} users`);
      console.log(`  System handled maximum load successfully`);
      console.log(`  Consider testing with higher user counts if needed`);
    }

    // Bottleneck identification
    console.log('\n🔍 Bottleneck Analysis:\n');

    const lastStage = this.stages[this.stages.length - 1];

    if (lastStage.p95 > 1000) {
      console.log('  ❌ Response Time Bottleneck:');
      console.log(`     P95 response time: ${lastStage.p95}ms (Too slow)`);
      console.log('     Recommendations:');
      console.log('     - Optimize database queries');
      console.log('     - Add database indexes');
      console.log('     - Implement caching layer');
      console.log('     - Consider horizontal scaling');
    }

    if (lastStage.failureRate > 5) {
      console.log('  ❌ Reliability Bottleneck:');
      console.log(`     Failure rate: ${lastStage.failureRate.toFixed(1)}% (Too high)`);
      console.log('     Recommendations:');
      console.log('     - Increase connection pool size');
      console.log('     - Add rate limiting');
      console.log('     - Implement circuit breakers');
      console.log('     - Check server resource limits (CPU, Memory)');
    }

    if (Object.keys(lastStage.errors).length > 0) {
      console.log('  ⚠️  Error Analysis:');
      Object.entries(lastStage.errors).forEach(([error, count]) => {
        console.log(`     ${error}: ${count} occurrences`);

        if (error === 'ECONNREFUSED') {
          console.log('       → Server not accepting connections');
        } else if (error === 'TIMEOUT') {
          console.log('       → Requests timing out (increase timeout or optimize)');
        } else if (error === 'ECONNRESET') {
          console.log('       → Connection pool exhausted');
        }
      });
    }

    // Recommendations
    console.log('\n💡 Capacity Planning Recommendations:\n');

    if (this.optimalCapacity) {
      console.log(`  1. Production Capacity: Set to ${this.optimalCapacity} concurrent users`);
      console.log(`  2. Auto-Scaling Trigger: Scale up at ${Math.floor(this.optimalCapacity * 0.8)} users (80% of capacity)`);
      console.log(`  3. Alert Threshold: Warn at ${Math.floor(this.optimalCapacity * 0.9)} users (90% of capacity)`);
      console.log(`  4. Hard Limit: Block at ${this.breakingPoint} users to prevent system failure`);
    } else {
      const maxTested = this.stages[this.stages.length - 1].users;
      console.log(`  1. System stable up to ${maxTested} users`);
      console.log(`  2. Production Capacity: Can safely handle ${maxTested} concurrent users`);
      console.log(`  3. Recommend testing with higher loads to find actual limits`);
    }

    console.log('\n='.repeat(60));
  }

  // Helper methods
  calculateMin(arr) {
    return arr.length > 0 ? Math.min(...arr) : 0;
  }

  calculateMax(arr) {
    return arr.length > 0 ? Math.max(...arr) : 0;
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = {
    url: 'http://localhost:5000',
    endpoint: '/',
    method: 'GET',
    startUsers: 10,
    maxUsers: 1000,
    stepSize: 10,
    stepDuration: 30,
    headers: {},
    body: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--url':
        options.url = next;
        i++;
        break;
      case '--endpoint':
        options.endpoint = next;
        i++;
        break;
      case '--method':
      case '-X':
        options.method = next.toUpperCase();
        i++;
        break;
      case '--start-users':
        options.startUsers = parseInt(next);
        i++;
        break;
      case '--max-users':
        options.maxUsers = parseInt(next);
        i++;
        break;
      case '--step-size':
        options.stepSize = parseInt(next);
        i++;
        break;
      case '--step-duration':
        options.stepDuration = parseInt(next);
        i++;
        break;
      case '--header':
      case '-H':
        const [key, value] = next.split(':').map(s => s.trim());
        options.headers[key] = value;
        i++;
        break;
      case '--data':
        try {
          options.body = JSON.parse(next);
        } catch (e) {
          console.error('Invalid JSON body');
          process.exit(1);
        }
        i++;
        break;
    }
  }

  const tester = new StressTester(options);
  await tester.run();
}

function showHelp() {
  console.log(`
💪 Stress Testing Tool - Find Breaking Point

Automatically finds system capacity limits by incrementally increasing load.

Usage:
  node scripts/load-test/stress-test.js [options]

Options:
  --url <url>              Base URL (default: http://localhost:5000)
  --endpoint <path>        Endpoint path (default: /)
  --method, -X <method>    HTTP method (default: GET)
  --start-users <number>   Starting user count (default: 10)
  --max-users <number>     Maximum users to test (default: 1000)
  --step-size <number>     Users to add per stage (default: 10)
  --step-duration <sec>    Duration of each stage (default: 30)
  --header, -H <header>    Add header (format: "Key: Value")
  --data <json>            Request body as JSON
  --help, -h               Show this help

Examples:
  # Basic stress test
  node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

  # Custom parameters
  node scripts/load-test/stress-test.js \\
    --endpoint /api/v1/tasks \\
    --start-users 20 \\
    --max-users 500 \\
    --step-size 20 \\
    --step-duration 60

  # POST endpoint with auth
  node scripts/load-test/stress-test.js \\
    --endpoint /api/v1/tasks \\
    --method POST \\
    --header "Authorization: Bearer token123" \\
    --data '{"title":"Test Task"}'

How it works:
  1. Starts with --start-users concurrent users
  2. Monitors performance (P95, failure rate, throughput)
  3. Increases by --step-size users every --step-duration seconds
  4. Detects when performance degrades significantly (P95 increases by 50%+)
  5. Identifies breaking point and recommends optimal capacity
  6. Provides capacity planning recommendations
`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = StressTester;
