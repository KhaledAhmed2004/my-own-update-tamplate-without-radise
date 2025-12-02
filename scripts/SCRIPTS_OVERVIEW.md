# 📦 Scripts Overview

Complete guide to all automation scripts in this project.

---

## 📂 Directory Structure

```
scripts/
├── postman/              # Postman & API Testing
│   ├── generate-all.js        # Generate Postman collections
│   ├── generate-tests.js      # Generate automated tests
│   ├── analyze-routes.js      # Analyze route comments
│   ├── README.md              # Full documentation
│   └── QUICK_REFERENCE.md     # Quick commands
│
└── load-test/            # Load & Performance Testing
    ├── run.js                 # Simple load test
    ├── scenario.js            # Scenario-based testing
    ├── stress-test.js         # Stress testing
    ├── artillery-generator.js # Generate Artillery configs
    ├── run-artillery.js       # Run Artillery tests
    ├── k6-generator.js        # Generate k6 scripts
    ├── run-k6.js              # Run k6 tests
    ├── README.md              # Full documentation
    └── GETTING_STARTED.md     # Quick start guide
```

---

## 🎯 Quick Links

### Postman & API Testing
- **[Full Documentation](./postman/README.md)**
- **[Quick Reference](./postman/QUICK_REFERENCE.md)**

### Load & Performance Testing
- **[Full Documentation](./load-test/README.md)**
- **[Getting Started Guide](./load-test/GETTING_STARTED.md)**

---

## 🚀 Postman Scripts

### Generate Postman Collection

**Purpose:** Auto-generate Postman collection from route files

```bash
node scripts/postman/generate-all.js
```

**Output:**
- `postman-collections/complete-api-collection.json`
- `postman-collections/environment.json`

**Features:**
- Auto-discovers routes
- Extracts route comments
- Generates folder structure
- Creates environment variables
- Bearer token authentication

---

### Generate Automated Tests

**Purpose:** Add comprehensive test scripts to Postman collection

```bash
node scripts/postman/generate-tests.js
```

**Output:**
- `postman-collections/complete-api-collection-with-tests.json`

**Features:**
- Status code validation
- Schema validation (from Mongoose models)
- Performance regression tests
- Contract testing
- Security vulnerability tests
- AI-powered type consistency checks
- CI/CD config generation

---

### Analyze Routes

**Purpose:** Extract and analyze route documentation

```bash
node scripts/postman/analyze-routes.js
```

**Output:**
- Console report of all routes
- Documentation coverage analysis

**Features:**
- Route discovery
- Comment parsing
- Coverage metrics
- Validation checks

---

## 🔥 Load Testing Scripts

### Simple Load Test

**Purpose:** Test single endpoint performance

```bash
node scripts/load-test/run.js --endpoint /api/v1/auth/login --users 50
```

**Output:**
- Response time metrics (Min, Max, Avg, P50, P95, P99)
- Success/failure rates
- Throughput (req/s)
- Performance assessment

**Use Case:**
- Quick endpoint checks
- Performance validation
- Benchmarking

---

### Scenario Testing

**Purpose:** Test multi-step user workflows

```bash
node scripts/load-test/scenario.js user-journey --users 50 --duration 5m
```

**Output:**
- Per-step performance metrics
- Bottleneck detection
- Journey completion rates
- Detailed analysis table

**Use Case:**
- End-to-end testing
- User flow validation
- Realistic load simulation

---

### Stress Testing

**Purpose:** Find system capacity limits automatically

```bash
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login
```

**Output:**
- Breaking point identification
- Optimal capacity recommendation
- Auto-scaling thresholds
- Bottleneck analysis

**Use Case:**
- Capacity planning
- Infrastructure sizing
- Production readiness

---

### Artillery Integration

**Purpose:** Professional load testing with HTML reports

```bash
# Generate configs
node scripts/load-test/artillery-generator.js --all

# Run test
node scripts/load-test/run-artillery.js user-journey
```

**Output:**
- Beautiful HTML reports
- Visual charts
- Detailed metrics

**Use Case:**
- Professional reports
- Team collaboration
- Stakeholder presentations

---

### k6 Integration

**Purpose:** Modern load testing with JavaScript

```bash
# Generate scripts
node scripts/load-test/k6-generator.js --all

# Run test
node scripts/load-test/run-k6.js user-journey
```

**Output:**
- Terminal metrics
- JSON/CSV exports
- Grafana Cloud integration

**Use Case:**
- Modern dev workflow
- CI/CD integration
- High-performance testing

---

## 🎓 Common Workflows

### Workflow 1: Initial Setup

```bash
# 1. Generate Postman collection
node scripts/postman/generate-all.js

# 2. Add automated tests
node scripts/postman/generate-tests.js

# 3. Import to Postman and run collection
```

**Result:** Complete API documentation with automated tests

---

### Workflow 2: Performance Validation

```bash
# 1. Quick endpoint check
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 10

# 2. Find capacity limits
node scripts/load-test/stress-test.js --endpoint /api/v1/tasks

# 3. Test at optimal capacity
node scripts/load-test/scenario.js user-journey --users 35 --duration 5m
```

**Result:** Complete performance profile of your API

---

### Workflow 3: Pre-Deployment Validation

```bash
# 1. Run API tests
node scripts/postman/generate-tests.js --run-and-report

# 2. Performance regression check
node scripts/load-test/run.js --endpoint /api/v1/auth/login --users 50

# 3. Full user journey test
node scripts/load-test/scenario.js user-journey --users 50 --duration 10m

# 4. Generate professional report
node scripts/load-test/run-artillery.js user-journey
```

**Result:** Comprehensive validation with professional reports

---

### Workflow 4: CI/CD Integration

```bash
# GitHub Actions workflow

# 1. API Tests
- name: Run API Tests
  run: newman run postman-collections/complete-api-collection-with-tests.json

# 2. Performance Tests
- name: Load Test
  run: node scripts/load-test/run.js --endpoint /api/v1/health --users 20

# 3. k6 Tests
- name: k6 Load Test
  run: k6 run k6-scripts/user-journey.js
```

---

## 📊 Feature Comparison

### Postman Scripts

| Script | Purpose | Output | Time |
|--------|---------|--------|------|
| `generate-all.js` | Create collection | JSON | 1 sec |
| `generate-tests.js` | Add tests | JSON | 2 sec |
| `analyze-routes.js` | Analyze docs | Console | 1 sec |

### Load Testing Scripts

| Script | Purpose | Output | Time |
|--------|---------|--------|------|
| `run.js` | Single endpoint | Console | 1-5 min |
| `scenario.js` | User workflows | Tables | 5-10 min |
| `stress-test.js` | Capacity limits | Analysis | 10-30 min |
| `artillery-generator.js` | Generate configs | YAML | 1 sec |
| `run-artillery.js` | Professional test | HTML | 5-15 min |
| `k6-generator.js` | Generate scripts | JS | 1 sec |
| `run-k6.js` | Modern testing | JSON/CSV | 5-15 min |

---

## 🎯 When to Use What?

### Postman Scripts

**Use `generate-all.js` when:**
- Starting new project
- Routes have changed
- Need API documentation
- Sharing with team

**Use `generate-tests.js` when:**
- Need automated testing
- CI/CD integration
- Contract testing
- Performance regression tracking

**Use `analyze-routes.js` when:**
- Checking documentation coverage
- Finding undocumented routes
- Code review

---

### Load Testing Scripts

**Use `run.js` when:**
- Quick performance check
- Single endpoint testing
- Daily smoke tests

**Use `scenario.js` when:**
- Testing user workflows
- Integration testing
- Finding workflow bottlenecks

**Use `stress-test.js` when:**
- Need capacity planning
- Determining server sizing
- Auto-scaling configuration

**Use Artillery when:**
- Need professional reports
- Presenting to stakeholders
- Team collaboration

**Use k6 when:**
- Modern dev workflow
- Grafana integration
- High-performance needs

---

## 💡 Pro Tips

### 1. Combine Tools

```bash
# Generate collection + tests
node scripts/postman/generate-all.js && \
node scripts/postman/generate-tests.js

# Find capacity + test at optimal
node scripts/load-test/stress-test.js --endpoint /api/v1/tasks && \
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 35
```

### 2. Save Results

```bash
# Save output to file
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 50 > results-$(date +%Y%m%d).txt
```

### 3. Compare Runs

```bash
# Before optimization
node scripts/load-test/run.js --endpoint /api/v1/search --users 50 > before.txt

# After optimization
node scripts/load-test/run.js --endpoint /api/v1/search --users 50 > after.txt

# Compare
diff before.txt after.txt
```

### 4. Automate Everything

Create a `test.sh` script:

```bash
#!/bin/bash

echo "🧪 Running API Tests..."
node scripts/postman/generate-tests.js --run-and-report

echo "🔥 Running Load Tests..."
node scripts/load-test/run.js --endpoint /api/v1/health --users 20

echo "✅ All tests completed!"
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Set base URL for all tests
export API_BASE_URL=http://localhost:5000

# Set test duration
export TEST_DURATION=300

# Set max virtual users
export MAX_USERS=100
```

### Custom Scenarios

Create your own scenarios in `scripts/load-test/scenarios/`:

```javascript
// my-scenario.js
module.exports = {
  name: 'My Custom Test',
  steps: [
    // Your custom steps
  ]
};
```

Then run:

```bash
node scripts/load-test/scenario.js my-scenario --users 50
```

---

## 🆘 Troubleshooting

### Script Not Found

```bash
# Make sure you're in project root
cd /path/to/project
node scripts/postman/generate-all.js
```

### Permission Denied

```bash
# On Unix/Mac
chmod +x scripts/postman/*.js
chmod +x scripts/load-test/*.js
```

### Module Not Found

```bash
# Install dependencies
npm install
```

---

## 📚 Learn More

- **Postman Documentation:** [scripts/postman/README.md](./postman/README.md)
- **Load Testing Documentation:** [scripts/load-test/README.md](./load-test/README.md)
- **Quick Start Guide:** [scripts/load-test/GETTING_STARTED.md](./load-test/GETTING_STARTED.md)

---

## 🎉 Summary

You now have access to:

✅ **5 Postman/API Testing Tools:**
- Collection Generator
- Test Generator
- Route Analyzer
- Quick Reference
- CI/CD Integration

✅ **7 Load Testing Tools:**
- Simple Load Test
- Scenario Testing
- Stress Testing
- Artillery Integration
- k6 Integration
- Getting Started Guide
- Comprehensive Documentation

**Total: 12+ automation scripts** to make your testing workflow efficient and professional! 🚀

---

**Happy Testing!** 🎊
