const fs = require('fs');
const path = require('path');

/**
 * k6 Script Generator
 *
 * Generates k6 JavaScript test scripts from scenario definitions
 *
 * Features:
 * - Convert scenarios to k6 format
 * - Generate load stages (ramp-up, steady, ramp-down)
 * - Support for thresholds and checks
 * - Custom metrics and tags
 *
 * Usage:
 *   node scripts/load-test/k6-generator.js user-journey
 *   node scripts/load-test/k6-generator.js --all
 */

class K6Generator {
  constructor(options = {}) {
    this.options = {
      scenariosDir: options.scenariosDir || path.join(__dirname, 'scenarios'),
      outputDir: options.outputDir || path.join(__dirname, 'k6-scripts'),
      ...options
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Generate k6 script from scenario
   */
  generateScript(scenarioName) {
    console.log(`🎯 Generating k6 script for: ${scenarioName}`);

    // Load scenario
    const scenarioPath = path.join(this.options.scenariosDir, `${scenarioName}.js`);

    if (!fs.existsSync(scenarioPath)) {
      throw new Error(`Scenario not found: ${scenarioPath}`);
    }

    const scenario = require(scenarioPath);

    // Build k6 script
    const script = this.buildK6Script(scenario, scenarioName);

    // Write to file
    const outputPath = path.join(this.options.outputDir, `${scenarioName}.js`);
    fs.writeFileSync(outputPath, script, 'utf8');

    console.log(`✅ Generated: ${outputPath}`);

    return {
      scenarioName,
      outputPath,
      script
    };
  }

  /**
   * Generate scripts for all scenarios
   */
  generateAll() {
    console.log('🎯 Generating k6 scripts for all scenarios...\n');

    const scenarios = fs.readdirSync(this.options.scenariosDir)
      .filter(file => file.endsWith('.js'))
      .map(file => file.replace('.js', ''));

    const results = scenarios.map(scenario => this.generateScript(scenario));

    console.log(`\n✅ Generated ${results.length} k6 scripts`);

    return results;
  }

  /**
   * Build k6 script content
   */
  buildK6Script(scenario, scenarioName) {
    const stages = this.generateStages(scenarioName);
    const thresholds = this.generateThresholds();
    const setupCode = this.generateSetup();
    const mainFunction = this.generateMainFunction(scenario);

    return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * k6 Load Test: ${scenario.name}
 *
 * Generated from scenario: ${scenarioName}
 * Description: ${scenario.description || 'No description'}
 */

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Configuration
export const options = {
  stages: ${JSON.stringify(stages, null, 4)},

  thresholds: ${JSON.stringify(thresholds, null, 4)},

  // Additional options
  noConnectionReuse: false,
  userAgent: 'k6-load-test/${scenarioName}',

  // Tags for all requests
  tags: {
    testType: 'load-test',
    scenario: '${scenarioName}'
  }
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

${setupCode}

${mainFunction}

/**
 * Helper: Make HTTP request with checks
 */
function makeRequest(method, endpoint, payload = null, headers = {}, expectedStatus = 200) {
  const url = BASE_URL + endpoint;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    tags: { name: endpoint }
  };

  let response;
  const startTime = Date.now();

  try {
    if (method === 'GET') {
      response = http.get(url, params);
    } else if (method === 'POST') {
      response = http.post(url, JSON.stringify(payload), params);
    } else if (method === 'PUT') {
      response = http.put(url, JSON.stringify(payload), params);
    } else if (method === 'PATCH') {
      response = http.patch(url, JSON.stringify(payload), params);
    } else if (method === 'DELETE') {
      response = http.del(url, null, params);
    }

    const duration = Date.now() - startTime;
    requestDuration.add(duration);

    // Checks
    const success = check(response, {
      [\`status is \${expectedStatus}\`]: (r) => r.status === expectedStatus,
      'response has body': (r) => r.body && r.body.length > 0
    });

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }

    return response;

  } catch (error) {
    console.error(\`Request failed: \${error}\`);
    failedRequests.add(1);
    errorRate.add(1);
    return null;
  }
}

/**
 * Helper: Extract JSON path
 */
function extractValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Helper: Random think time
 */
function thinkTime(min = 1, max = 3) {
  sleep(Math.random() * (max - min) + min);
}
`;
  }

  /**
   * Generate load stages
   */
  generateStages(scenarioName) {
    const stageProfiles = {
      'auth-only': [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '30s', target: 0 }
      ],
      'user-journey': [
        { duration: '1m', target: 5 },
        { duration: '2m', target: 20 },
        { duration: '5m', target: 30 },
        { duration: '1m', target: 50 }, // Spike
        { duration: '1m', target: 0 }
      ],
      'payment-flow': [
        { duration: '1m', target: 3 },
        { duration: '2m', target: 10 },
        { duration: '5m', target: 15 },
        { duration: '1m', target: 0 }
      ]
    };

    return stageProfiles[scenarioName] || [
      { duration: '1m', target: 10 },
      { duration: '3m', target: 30 },
      { duration: '1m', target: 0 }
    ];
  }

  /**
   * Generate performance thresholds
   */
  generateThresholds() {
    return {
      'http_req_duration': ['p(95)<500', 'p(99)<1000'],
      'http_req_failed': ['rate<0.05'], // Less than 5% failure
      'errors': ['rate<0.05'],
      'checks': ['rate>0.95'] // More than 95% success
    };
  }

  /**
   * Generate setup code
   */
  generateSetup() {
    return `/**
 * Setup function (runs once)
 */
export function setup() {
  console.log('Starting k6 load test...');
  console.log('Base URL:', BASE_URL);

  return {
    timestamp: Date.now()
  };
}

/**
 * Teardown function (runs once after test)
 */
export function teardown(data) {
  console.log('Load test completed');
  console.log('Duration:', (Date.now() - data.timestamp) / 1000, 'seconds');
}`;
  }

  /**
   * Generate main test function
   */
  generateMainFunction(scenario) {
    const steps = scenario.steps.map((step, index) =>
      this.convertStepToK6(step, index)
    ).join('\n  \n  ');

    return `/**
 * Main test function (runs for each VU)
 */
export default function(data) {
  // Context for this virtual user
  const context = {
    userId: __VU, // Virtual User ID
    iteration: __ITER, // Iteration number
    timestamp: Date.now()
  };

  ${steps}
}`;
  }

  /**
   * Convert single step to k6 code
   */
  convertStepToK6(step, index) {
    const method = step.method;
    const endpoint = this.convertEndpoint(step.endpoint);
    const body = this.convertBody(step.body);
    const headers = this.convertHeaders(step.headers);
    const expectedStatus = step.expect?.statusCode || 200;

    let code = `// Step ${index + 1}: ${step.name}\n`;
    code += `  const response${index} = makeRequest(\n`;
    code += `    '${method}',\n`;
    code += `    ${endpoint},\n`;
    code += `    ${body},\n`;
    code += `    ${headers},\n`;
    code += `    ${expectedStatus}\n`;
    code += `  );\n`;

    // Add data extraction
    if (step.extract) {
      code += `  \n  // Extract data for next steps\n`;
      Object.entries(step.extract).forEach(([varName, jsonPath]) => {
        code += `  if (response${index} && response${index}.body) {\n`;
        code += `    try {\n`;
        code += `      const data = JSON.parse(response${index}.body);\n`;
        code += `      context.${varName} = extractValue(data, '${jsonPath}');\n`;
        code += `    } catch (e) {\n`;
        code += `      console.error('Failed to parse response:', e);\n`;
        code += `    }\n`;
        code += `  }\n`;
      });
    }

    // Add think time
    code += `  \n  thinkTime(1, 3);\n`;

    return code;
  }

  /**
   * Convert endpoint to k6 format
   */
  convertEndpoint(endpoint) {
    if (typeof endpoint === 'function') {
      const funcStr = endpoint.toString();

      // Extract template literal or return statement
      const templateMatch = funcStr.match(/`([^`]+)`/);
      if (templateMatch) {
        let k6Endpoint = templateMatch[1];
        // Convert ${context.var} to ${context.var}
        return '`' + k6Endpoint + '`';
      }

      return "'/api/v1/unknown'";
    }

    return `'${endpoint}'`;
  }

  /**
   * Convert body to k6 format
   */
  convertBody(body) {
    if (!body) return 'null';

    if (typeof body === 'function') {
      const funcStr = body.toString();

      // Try to extract object literal
      const objMatch = funcStr.match(/\{([^}]+)\}/);
      if (objMatch) {
        let k6Body = objMatch[0];
        // Convert context.var references
        k6Body = k6Body.replace(/context\.(\w+)/g, '${context.$1}');
        return k6Body;
      }

      return '{}';
    }

    return JSON.stringify(body);
  }

  /**
   * Convert headers to k6 format
   */
  convertHeaders(headers) {
    if (!headers) return '{}';

    if (typeof headers === 'function') {
      // Extract Authorization pattern
      return `{
      Authorization: \`Bearer \${context.accessToken}\`
    }`;
    }

    return JSON.stringify(headers);
  }
}

/**
 * Generate README for k6 scripts
 */
function generateReadme(outputDir) {
  const readmeContent = `# k6 Load Test Scripts

Auto-generated k6 scripts for load testing.

## About k6

[k6](https://k6.io/) is a modern, developer-friendly load testing tool by Grafana Labs. Written in Go, it uses JavaScript for test scripts.

**Key Features:**
- Developer-friendly JavaScript API
- Performance testing as code
- Beautiful terminal output
- Grafana Cloud integration
- CI/CD friendly

## Installation

\`\`\`bash
# macOS (Homebrew)
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
\`\`\`

## Usage

\`\`\`bash
# Run test
k6 run user-journey.js

# Run with custom base URL
k6 run --env BASE_URL=http://staging.example.com user-journey.js

# Run with custom virtual users
k6 run --vus 50 --duration 5m user-journey.js

# Generate JSON output
k6 run --out json=results.json user-journey.js

# Send results to Grafana Cloud
k6 run --out cloud user-journey.js
\`\`\`

## Available Scripts

- **user-journey.js** - Complete user workflow (register → login → tasks)
- **auth-only.js** - Authentication focused test
- **payment-flow.js** - Payment processing workflow

## Configuration

Each script has configurable stages:

\`\`\`javascript
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp-up
    { duration: '3m', target: 30 },  // Steady state
    { duration: '1m', target: 0 }    // Ramp-down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.05']
  }
};
\`\`\`

## Thresholds

Performance thresholds are defined in each script:

- **P95 Response Time**: < 500ms
- **P99 Response Time**: < 1000ms
- **Failure Rate**: < 5%
- **Check Success Rate**: > 95%

## Output Formats

\`\`\`bash
# JSON output
k6 run --out json=results.json user-journey.js

# CSV output
k6 run --out csv=results.csv user-journey.js

# InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 user-journey.js

# Grafana Cloud
k6 run --out cloud user-journey.js
\`\`\`

## Environment Variables

\`\`\`bash
# Base URL
export BASE_URL=http://localhost:5000
k6 run user-journey.js

# Or inline
k6 run --env BASE_URL=http://staging.example.com user-journey.js
\`\`\`

## Tips

1. **Start Small**: Begin with low VU count
2. **Monitor Server**: Watch metrics during test
3. **Use Thresholds**: Set performance criteria
4. **Export Results**: Save for comparison
5. **Iterate**: Adjust and re-run

## Learn More

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Grafana Cloud k6](https://grafana.com/products/cloud/k6/)
`;

  const readmePath = path.join(outputDir, 'README.md');
  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  console.log(`✅ Generated README: ${readmePath}`);
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const generator = new K6Generator();

  if (args.includes('--all')) {
    generator.generateAll();
    generateReadme(generator.options.outputDir);
  } else if (args.length > 0) {
    const scenarioName = args[0];
    generator.generateScript(scenarioName);
  } else {
    console.log('Please specify a scenario name or use --all');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  console.log('\n📋 Next steps:');
  console.log('  1. Install k6: brew install k6 (or see README)');
  console.log('  2. Run test: k6 run k6-scripts/<scenario>.js');
  console.log('  3. View results in terminal\n');
}

function showHelp() {
  console.log(`
🎯 k6 Script Generator

Generates k6 JavaScript test scripts from scenario definitions.

Usage:
  node scripts/load-test/k6-generator.js <scenario-name>
  node scripts/load-test/k6-generator.js --all

Options:
  <scenario-name>    Generate script for specific scenario
  --all              Generate scripts for all scenarios
  --help, -h         Show this help

Examples:
  # Generate single scenario
  node scripts/load-test/k6-generator.js user-journey

  # Generate all scenarios
  node scripts/load-test/k6-generator.js --all

Output:
  Generated files will be in: scripts/load-test/k6-scripts/

Running k6 Tests:
  # Install k6
  brew install k6  # macOS
  choco install k6  # Windows

  # Run test
  k6 run k6-scripts/user-journey.js

  # With custom URL
  k6 run --env BASE_URL=http://staging.example.com k6-scripts/user-journey.js

  # With custom VUs
  k6 run --vus 50 --duration 5m k6-scripts/user-journey.js
`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = K6Generator;