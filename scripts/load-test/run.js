const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Simple Load Testing Tool
 *
 * Tests a single endpoint with configurable load
 *
 * Usage:
 *   node scripts/load-test/run.js --endpoint /api/v1/auth/login --users 100
 *   node scripts/load-test/run.js --url http://localhost:5000/api/v1/user/profile --users 50 --duration 60
 */

class LoadTester {
  constructor(options = {}) {
    this.options = {
      url: options.url || 'http://localhost:5000',
      endpoint: options.endpoint || '/',
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || null,
      users: options.users || 10,
      duration: options.duration || 60, // seconds
      rampUp: options.rampUp || 10, // seconds
      ...options
    };

    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      responseTimes: [],
      statusCodes: {},
      errors: {},
      startTime: null,
      endTime: null
    };

    this.activeRequests = 0;
    this.stopRequested = false;
  }

  /**
   * Run the load test
   */
  async run() {
    console.log('🚀 Load Test Starting...\n');
    this.printConfig();

    this.stats.startTime = Date.now();

    // Start all virtual users
    const promises = [];
    for (let i = 0; i < this.options.users; i++) {
      // Ramp-up delay
      const delay = (this.options.rampUp * 1000 * i) / this.options.users;
      promises.push(this.startVirtualUser(i, delay));
    }

    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, this.options.duration * 1000));

    this.stopRequested = true;
    console.log('\n⏳ Stopping... waiting for active requests to complete');

    // Wait for all users to finish
    await Promise.all(promises);

    this.stats.endTime = Date.now();

    // Print results
    this.printResults();
  }

  /**
   * Start a virtual user that makes requests continuously
   */
  async startVirtualUser(userId, initialDelay) {
    // Wait for ramp-up
    if (initialDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, initialDelay));
    }

    while (!this.stopRequested) {
      await this.makeRequest(userId);

      // Small delay between requests (think time)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    }
  }

  /**
   * Make a single HTTP request
   */
  async makeRequest(userId) {
    return new Promise((resolve) => {
      this.activeRequests++;
      const startTime = Date.now();

      // Build full URL
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

          // Record stats
          this.stats.total++;
          this.stats.responseTimes.push(responseTime);

          if (res.statusCode >= 200 && res.statusCode < 400) {
            this.stats.success++;
          } else {
            this.stats.failed++;
          }

          this.stats.statusCodes[res.statusCode] =
            (this.stats.statusCodes[res.statusCode] || 0) + 1;

          // Print progress every 10 requests
          if (this.stats.total % 10 === 0) {
            this.printProgress();
          }

          resolve();
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        this.activeRequests--;

        this.stats.total++;
        this.stats.failed++;
        this.stats.responseTimes.push(responseTime);

        const errorType = error.code || 'Unknown';
        this.stats.errors[errorType] = (this.stats.errors[errorType] || 0) + 1;

        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        const errorType = 'TIMEOUT';
        this.stats.errors[errorType] = (this.stats.errors[errorType] || 0) + 1;
      });

      // Set timeout
      req.setTimeout(30000);

      // Send body if provided
      if (this.options.body) {
        req.write(JSON.stringify(this.options.body));
      }

      req.end();
    });
  }

  /**
   * Print configuration
   */
  printConfig() {
    console.log('Configuration:');
    console.log(`  URL: ${this.options.url}${this.options.endpoint}`);
    console.log(`  Method: ${this.options.method}`);
    console.log(`  Virtual Users: ${this.options.users}`);
    console.log(`  Duration: ${this.options.duration}s`);
    console.log(`  Ramp-up: ${this.options.rampUp}s`);
    console.log();
    console.log('Running test... ⏳\n');
  }

  /**
   * Print progress during test
   */
  printProgress() {
    const elapsed = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const avgResponseTime = this.calculateAvg(this.stats.responseTimes);
    const throughput = this.stats.total / elapsed;

    process.stdout.write(`\r⏱️  ${elapsed}s | Requests: ${this.stats.total} | Success: ${this.stats.success} | Failed: ${this.stats.failed} | Avg: ${avgResponseTime}ms | Active: ${this.activeRequests} | Throughput: ${throughput.toFixed(1)} req/s`);
  }

  /**
   * Print final results
   */
  printResults() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;

    console.log('\n\n📊 Load Test Results\n');
    console.log('='.repeat(60));

    // Requests
    console.log('\nRequests:');
    console.log(`  Total: ${this.stats.total}`);
    console.log(`  Success: ${this.stats.success} (${this.getPercentage(this.stats.success, this.stats.total)}%)`);
    console.log(`  Failed: ${this.stats.failed} (${this.getPercentage(this.stats.failed, this.stats.total)}%)`);

    // Response Time
    console.log('\nResponse Time:');
    console.log(`  Min: ${this.calculateMin(this.stats.responseTimes)}ms`);
    console.log(`  Max: ${this.calculateMax(this.stats.responseTimes)}ms`);
    console.log(`  Avg: ${this.calculateAvg(this.stats.responseTimes)}ms`);
    console.log(`  P50: ${this.calculatePercentile(this.stats.responseTimes, 50)}ms`);
    console.log(`  P95: ${this.calculatePercentile(this.stats.responseTimes, 95)}ms`);
    console.log(`  P99: ${this.calculatePercentile(this.stats.responseTimes, 99)}ms`);

    // Throughput
    console.log('\nThroughput:');
    console.log(`  ${(this.stats.total / duration).toFixed(1)} requests/sec`);

    // Status Codes
    if (Object.keys(this.stats.statusCodes).length > 0) {
      console.log('\nStatus Codes:');
      Object.entries(this.stats.statusCodes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([code, count]) => {
          console.log(`  ${code}: ${count}`);
        });
    }

    // Errors
    if (Object.keys(this.stats.errors).length > 0) {
      console.log('\nErrors:');
      Object.entries(this.stats.errors)
        .sort((a, b) => b[1] - a[1])
        .forEach(([error, count]) => {
          console.log(`  ${error}: ${count}`);
        });
    }

    // Performance Assessment
    console.log('\n' + '='.repeat(60));
    this.printAssessment();
  }

  /**
   * Print performance assessment
   */
  printAssessment() {
    const p95 = this.calculatePercentile(this.stats.responseTimes, 95);
    const failureRate = (this.stats.failed / this.stats.total) * 100;

    console.log('\n🎯 Performance Assessment:\n');

    // Response Time Assessment
    if (p95 < 200) {
      console.log('  ✅ Response Time: Excellent (P95 < 200ms)');
    } else if (p95 < 500) {
      console.log('  ✅ Response Time: Good (P95 < 500ms)');
    } else if (p95 < 1000) {
      console.log('  ⚠️  Response Time: Acceptable (P95 < 1s)');
    } else {
      console.log('  ❌ Response Time: Poor (P95 > 1s)');
    }

    // Reliability Assessment
    if (failureRate === 0) {
      console.log('  ✅ Reliability: Perfect (0% failures)');
    } else if (failureRate < 1) {
      console.log('  ✅ Reliability: Excellent (< 1% failures)');
    } else if (failureRate < 5) {
      console.log('  ⚠️  Reliability: Acceptable (< 5% failures)');
    } else {
      console.log('  ❌ Reliability: Poor (> 5% failures)');
    }

    // Recommendations
    console.log('\n💡 Recommendations:\n');

    if (p95 > 1000) {
      console.log('  - Response time is high. Consider:');
      console.log('    • Database query optimization');
      console.log('    • Add caching layer');
      console.log('    • Check for N+1 queries');
    }

    if (failureRate > 1) {
      console.log('  - High failure rate detected. Investigate:');
      console.log('    • Error logs for root cause');
      console.log('    • Database connection pool size');
      console.log('    • Server resource limits');
    }

    if (Object.keys(this.stats.errors).length > 0) {
      console.log('  - Errors detected. Check:');
      Object.keys(this.stats.errors).forEach(error => {
        if (error === 'ECONNREFUSED') {
          console.log('    • Server is not running');
        } else if (error === 'TIMEOUT') {
          console.log('    • Increase timeout or optimize endpoint');
        } else if (error === 'ECONNRESET') {
          console.log('    • Connection pool exhausted');
        }
      });
    }
  }

  // Calculation helpers
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

  getPercentage(value, total) {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(1);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options = {
    url: 'http://localhost:5000',
    endpoint: '/',
    method: 'GET',
    users: 10,
    duration: 60,
    rampUp: 10,
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
      case '--users':
      case '-u':
        options.users = parseInt(next);
        i++;
        break;
      case '--duration':
      case '-d':
        options.duration = parseInt(next);
        i++;
        break;
      case '--ramp-up':
        options.rampUp = parseInt(next);
        i++;
        break;
      case '--header':
      case '-H':
        const [key, value] = next.split(':').map(s => s.trim());
        options.headers[key] = value;
        i++;
        break;
      case '--data':
      case '-d':
        try {
          options.body = JSON.parse(next);
        } catch (e) {
          console.error('Invalid JSON body');
          process.exit(1);
        }
        i++;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
    }
  }

  // Run load test
  const tester = new LoadTester(options);
  await tester.run();
}

function showHelp() {
  console.log(`
🚀 Simple Load Testing Tool - Help

Usage:
  node scripts/load-test/run.js [options]

Options:
  --url <url>           Base URL (default: http://localhost:5000)
  --endpoint <path>     Endpoint path (default: /)
  --method, -X <method> HTTP method (default: GET)
  --users, -u <number>  Number of virtual users (default: 10)
  --duration, -d <sec>  Test duration in seconds (default: 60)
  --ramp-up <sec>       Ramp-up time in seconds (default: 10)
  --header, -H <header> Add header (format: "Key: Value")
  --data <json>         Request body as JSON
  --help, -h            Show this help

Examples:
  # Simple GET test
  node scripts/load-test/run.js --endpoint /api/v1/user/profile --users 50

  # POST test with body
  node scripts/load-test/run.js \\
    --endpoint /api/v1/auth/login \\
    --method POST \\
    --users 100 \\
    --duration 120 \\
    --data '{"email":"test@example.com","password":"pass123"}'

  # With custom headers
  node scripts/load-test/run.js \\
    --endpoint /api/v1/user/profile \\
    --users 50 \\
    --header "Authorization: Bearer token123"

  # Stress test
  node scripts/load-test/run.js \\
    --endpoint /api/v1/tasks \\
    --users 500 \\
    --duration 300 \\
    --ramp-up 60
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = LoadTester;
