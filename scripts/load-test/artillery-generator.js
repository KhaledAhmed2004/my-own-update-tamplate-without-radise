const fs = require('fs');
const path = require('path');

/**
 * Artillery Config Generator
 *
 * Generates Artillery YAML configuration files from scenario definitions
 *
 * Features:
 * - Convert scenarios to Artillery format
 * - Generate load phases (warmup, ramp-up, sustained, spike)
 * - Support for dynamic variables and data extraction
 * - Custom plugins and processors
 *
 * Usage:
 *   node scripts/load-test/artillery-generator.js user-journey
 *   node scripts/load-test/artillery-generator.js --all
 */

class ArtilleryGenerator {
  constructor(options = {}) {
    this.options = {
      scenariosDir: options.scenariosDir || path.join(__dirname, 'scenarios'),
      outputDir: options.outputDir || path.join(__dirname, 'artillery-configs'),
      ...options
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Generate Artillery config from scenario
   */
  generateConfig(scenarioName) {
    console.log(`🎯 Generating Artillery config for: ${scenarioName}`);

    // Load scenario
    const scenarioPath = path.join(this.options.scenariosDir, `${scenarioName}.js`);

    if (!fs.existsSync(scenarioPath)) {
      throw new Error(`Scenario not found: ${scenarioPath}`);
    }

    const scenario = require(scenarioPath);

    // Build Artillery config
    const config = this.buildArtilleryConfig(scenario, scenarioName);

    // Write to file
    const outputPath = path.join(this.options.outputDir, `${scenarioName}.yml`);
    const yaml = this.convertToYAML(config);

    fs.writeFileSync(outputPath, yaml, 'utf8');

    console.log(`✅ Generated: ${outputPath}`);

    return {
      scenarioName,
      outputPath,
      config
    };
  }

  /**
   * Generate configs for all scenarios
   */
  generateAll() {
    console.log('🎯 Generating Artillery configs for all scenarios...\n');

    const scenarios = fs.readdirSync(this.options.scenariosDir)
      .filter(file => file.endsWith('.js'))
      .map(file => file.replace('.js', ''));

    const results = scenarios.map(scenario => this.generateConfig(scenario));

    console.log(`\n✅ Generated ${results.length} Artillery configurations`);

    return results;
  }

  /**
   * Build Artillery configuration object
   */
  buildArtilleryConfig(scenario, scenarioName) {
    return {
      config: {
        target: 'http://localhost:5000',
        phases: this.generatePhases(scenarioName),
        variables: {
          timestamp: '{{ $timestamp }}',
          randomId: '{{ $randomNumber(1, 10000) }}'
        },
        processor: this.generateProcessor(),
        plugins: {
          expect: {},
          metrics: {
            namespace: `load-test-${scenarioName}`
          }
        }
      },
      scenarios: [
        this.convertScenario(scenario)
      ]
    };
  }

  /**
   * Generate load phases based on scenario type
   */
  generatePhases(scenarioName) {
    // Different phase strategies for different scenarios
    const phaseStrategies = {
      'auth-only': [
        { duration: 60, arrivalRate: 5, name: 'Warmup' },
        { duration: 120, arrivalRate: 20, name: 'Ramp-up' },
        { duration: 300, arrivalRate: 50, name: 'Sustained Load' }
      ],
      'user-journey': [
        { duration: 60, arrivalRate: 2, name: 'Warmup' },
        { duration: 120, arrivalRate: 5, name: 'Ramp-up' },
        { duration: 300, arrivalRate: 10, name: 'Sustained Load' },
        { duration: 60, arrivalRate: 20, name: 'Spike' }
      ],
      'payment-flow': [
        { duration: 60, arrivalRate: 1, name: 'Warmup' },
        { duration: 120, arrivalRate: 3, name: 'Ramp-up' },
        { duration: 300, arrivalRate: 5, name: 'Sustained Load' }
      ]
    };

    return phaseStrategies[scenarioName] || [
      { duration: 60, arrivalRate: 5, name: 'Warmup' },
      { duration: 120, arrivalRate: 10, name: 'Ramp-up' },
      { duration: 300, arrivalRate: 20, name: 'Sustained Load' }
    ];
  }

  /**
   * Generate processor functions
   */
  generateProcessor() {
    return './artillery-processor.js';
  }

  /**
   * Convert scenario to Artillery format
   */
  convertScenario(scenario) {
    const flow = [];

    scenario.steps.forEach((step, index) => {
      const request = this.convertStep(step, index);
      flow.push(request);

      // Add think time between steps
      if (index < scenario.steps.length - 1) {
        flow.push({
          think: this.randomThinkTime()
        });
      }
    });

    return {
      name: scenario.name,
      flow: flow
    };
  }

  /**
   * Convert single step to Artillery request
   */
  convertStep(step, index) {
    const request = {
      [step.method.toLowerCase()]: {
        url: this.convertEndpoint(step.endpoint),
        headers: this.convertHeaders(step.headers)
      }
    };

    // Add body if present
    if (step.body) {
      request[step.method.toLowerCase()].json = this.convertBody(step.body);
    }

    // Add capture (data extraction)
    if (step.extract) {
      request[step.method.toLowerCase()].capture = this.convertExtract(step.extract);
    }

    // Add expectations (validation)
    if (step.expect) {
      request[step.method.toLowerCase()].expect = this.convertExpect(step.expect);
    }

    return request;
  }

  /**
   * Convert endpoint (handle dynamic functions)
   */
  convertEndpoint(endpoint) {
    if (typeof endpoint === 'function') {
      // Convert function to Artillery template syntax
      const funcStr = endpoint.toString();

      // Extract variable usage (e.g., context.userId -> {{ userId }})
      const varPattern = /context\.(\w+)/g;
      let artilleryUrl = funcStr;

      let match;
      while ((match = varPattern.exec(funcStr)) !== null) {
        const varName = match[1];
        artilleryUrl = artilleryUrl.replace(`context.${varName}`, `{{ ${varName} }}`);
      }

      // Extract the template string or return value
      const templateMatch = artilleryUrl.match(/`([^`]+)`/);
      if (templateMatch) {
        return templateMatch[1].replace(/\$\{([^}]+)\}/g, '{{ $1 }}');
      }

      return '/api/v1/unknown';
    }

    return endpoint;
  }

  /**
   * Convert headers
   */
  convertHeaders(headers) {
    if (!headers) return {};

    if (typeof headers === 'function') {
      // Extract Authorization pattern
      return {
        Authorization: 'Bearer {{ accessToken }}',
        'Content-Type': 'application/json'
      };
    }

    return headers;
  }

  /**
   * Convert body
   */
  convertBody(body) {
    if (typeof body === 'function') {
      const funcStr = body.toString();

      // Extract object structure
      const objMatch = funcStr.match(/\{([^}]+)\}/);
      if (objMatch) {
        // Convert context variables to Artillery variables
        const converted = objMatch[1]
          .replace(/context\.(\w+)/g, '{{ $1 }}')
          .replace(/`([^`]+)`/g, '"$1"');

        try {
          return JSON.parse(`{${converted}}`);
        } catch (e) {
          // Return template string representation
          return { dynamic: true };
        }
      }

      return {};
    }

    return body;
  }

  /**
   * Convert extract (data capture)
   */
  convertExtract(extract) {
    const capture = [];

    Object.entries(extract).forEach(([varName, jsonPath]) => {
      capture.push({
        json: `$.${jsonPath}`,
        as: varName
      });
    });

    return capture;
  }

  /**
   * Convert expect (validation)
   */
  convertExpect(expect) {
    const expectations = [];

    if (expect.statusCode) {
      expectations.push({
        statusCode: expect.statusCode
      });
    }

    if (expect.hasProperty) {
      expectations.push({
        hasProperty: expect.hasProperty
      });
    }

    return expectations;
  }

  /**
   * Generate random think time
   */
  randomThinkTime() {
    return Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
  }

  /**
   * Convert object to YAML format
   */
  convertToYAML(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}- ${this.objectToYAML(item, indent + 1).trim()}\n`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        });
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.convertToYAML(value, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * Helper for inline object to YAML
   */
  objectToYAML(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    const entries = Object.entries(obj);
    entries.forEach(([key, value], index) => {
      if (index === 0) {
        yaml += `${key}: `;
      } else {
        yaml += `\n${spaces}${key}: `;
      }

      if (typeof value === 'object' && value !== null) {
        yaml += `\n${this.convertToYAML(value, indent + 1)}`;
      } else {
        yaml += value;
      }
    });

    return yaml;
  }
}

/**
 * Generate Artillery processor file
 */
function generateProcessorFile(outputDir) {
  const processorContent = `/**
 * Artillery Processor
 *
 * Custom functions for Artillery load tests
 */

module.exports = {
  /**
   * Set dynamic variables before request
   */
  setDynamicVars: function(requestParams, context, ee, next) {
    // Generate unique email
    context.vars.uniqueEmail = \`loadtest\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}@example.com\`;

    // Generate timestamp
    context.vars.timestamp = Date.now();

    // Generate random user data
    context.vars.randomName = \`User \${Math.floor(Math.random() * 10000)}\`;

    return next();
  },

  /**
   * Log response data
   */
  logResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
      console.log('Error response:', {
        status: response.statusCode,
        body: response.body
      });
    }
    return next();
  },

  /**
   * Custom authentication
   */
  authenticate: function(requestParams, context, ee, next) {
    if (context.vars.accessToken) {
      requestParams.headers = requestParams.headers || {};
      requestParams.headers.Authorization = \`Bearer \${context.vars.accessToken}\`;
    }
    return next();
  }
};
`;

  const processorPath = path.join(outputDir, 'artillery-processor.js');
  fs.writeFileSync(processorPath, processorContent, 'utf8');
  console.log(`✅ Generated processor: ${processorPath}`);
}

/**
 * Generate README for Artillery configs
 */
function generateReadme(outputDir) {
  const readmeContent = `# Artillery Load Test Configs

Auto-generated Artillery configurations for load testing.

## Usage

\`\`\`bash
# Install Artillery globally
npm install -g artillery

# Run a test
artillery run user-journey.yml

# Run with custom target
artillery run --target http://staging.example.com user-journey.yml

# Generate HTML report
artillery run --output report.json user-journey.yml
artillery report report.json

# Quick test (fewer users)
artillery quick --count 10 --num 100 http://localhost:5000/api/v1/tasks
\`\`\`

## Available Configs

- **user-journey.yml** - Complete user workflow (register → login → tasks)
- **auth-only.yml** - Authentication focused test
- **payment-flow.yml** - Payment processing workflow

## Configuration Structure

\`\`\`yaml
config:
  target: http://localhost:5000
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warmup
    - duration: 300
      arrivalRate: 20
      name: Sustained Load

scenarios:
  - name: Test Scenario
    flow:
      - post:
          url: /api/v1/auth/login
          json:
            email: "{{ uniqueEmail }}"
            password: "test123"
          capture:
            - json: "$.data.accessToken"
              as: accessToken
\`\`\`

## Tips

1. **Monitor Performance**: Use \`artillery report\` to generate visual reports
2. **Adjust Load**: Modify \`arrivalRate\` in phases for different load levels
3. **Custom Variables**: Edit processor.js for dynamic data generation
4. **Environment URLs**: Use \`--target\` flag to test different environments

## Learn More

- [Artillery Documentation](https://www.artillery.io/docs)
- [Artillery Examples](https://github.com/artilleryio/artillery/tree/main/examples)
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

  const generator = new ArtilleryGenerator();

  if (args.includes('--all')) {
    // Generate all configs
    generator.generateAll();
    generateProcessorFile(generator.options.outputDir);
    generateReadme(generator.options.outputDir);
  } else if (args.length > 0) {
    // Generate specific scenario
    const scenarioName = args[0];
    generator.generateConfig(scenarioName);

    // Generate processor if not exists
    const processorPath = path.join(generator.options.outputDir, 'artillery-processor.js');
    if (!fs.existsSync(processorPath)) {
      generateProcessorFile(generator.options.outputDir);
    }
  } else {
    console.log('Please specify a scenario name or use --all');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  console.log('\n📋 Next steps:');
  console.log('  1. Install Artillery: npm install -g artillery');
  console.log('  2. Run test: artillery run artillery-configs/<scenario>.yml');
  console.log('  3. Generate report: artillery report <output>.json\n');
}

function showHelp() {
  console.log(`
🎯 Artillery Config Generator

Generates Artillery YAML configurations from scenario definitions.

Usage:
  node scripts/load-test/artillery-generator.js <scenario-name>
  node scripts/load-test/artillery-generator.js --all

Options:
  <scenario-name>    Generate config for specific scenario
  --all              Generate configs for all scenarios
  --help, -h         Show this help

Examples:
  # Generate single scenario
  node scripts/load-test/artillery-generator.js user-journey

  # Generate all scenarios
  node scripts/load-test/artillery-generator.js --all

Output:
  Generated files will be in: scripts/load-test/artillery-configs/

Running Artillery Tests:
  # Install Artillery
  npm install -g artillery

  # Run test
  artillery run artillery-configs/user-journey.yml

  # Run with custom target
  artillery run --target http://staging.example.com artillery-configs/user-journey.yml

  # Generate report
  artillery run --output report.json artillery-configs/user-journey.yml
  artillery report report.json
`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ArtilleryGenerator;
