# 🚀 Load Testing Tool

Comprehensive load testing toolkit with scenario-based testing and performance analysis.

## Quick Start

### Simple Load Test (Single Endpoint)
```bash
# Basic test
node scripts/load-test/run.js --endpoint /api/v1/auth/login --users 50 --duration 60

# With request body
node scripts/load-test/run.js \
  --endpoint /api/v1/auth/login \
  --method POST \
  --users 100 \
  --data '{"email":"test@example.com","password":"SecurePass123!"}'
```

### Scenario-Based Testing (Multi-Step Workflows)
```bash
# Complete user journey
node scripts/load-test/scenario.js user-journey --users 50 --duration 5m

# Authentication only
node scripts/load-test/scenario.js auth-only --users 100 --duration 2m

# Payment workflow
node scripts/load-test/scenario.js payment-flow --users 30 --duration 5m
```

### Stress Testing (Find Breaking Point)
```bash
# Basic stress test - find capacity limits
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

# Custom parameters
node scripts/load-test/stress-test.js \
  --endpoint /api/v1/tasks \
  --start-users 20 \
  --max-users 500 \
  --step-size 20 \
  --step-duration 60
```

### Artillery Integration (Professional Load Testing)
```bash
# Generate Artillery configs
node scripts/load-test/artillery-generator.js --all

# Run test with Artillery
node scripts/load-test/run-artillery.js user-journey

# Run with custom target
node scripts/load-test/run-artillery.js auth-only --target http://staging.example.com
```

### k6 Integration (Modern Developer-Focused Testing)
```bash
# Generate k6 scripts
node scripts/load-test/k6-generator.js --all

# Run test with k6
node scripts/load-test/run-k6.js user-journey

# Run with custom base URL and VUs
node scripts/load-test/run-k6.js auth-only --base-url http://staging.example.com --vus 50
```

## Features

### Simple Load Testing
✅ **Single Endpoint Testing** - Focus on one API endpoint
✅ **Response Time Metrics** - Min, Max, Avg, P50, P95, P99
✅ **Success/Failure Tracking** - Status codes and error categorization
✅ **Throughput Calculation** - Requests per second
✅ **Ramp-up Support** - Gradual user increase
✅ **Real-time Progress** - Live statistics during test
✅ **Performance Assessment** - Automatic recommendations

### Scenario-Based Testing
✅ **Multi-Step Workflows** - Test complete user journeys
✅ **Context-Based Flow** - Data flows between steps (register → login → create)
✅ **Dynamic Requests** - Use data from previous steps
✅ **Step-by-Step Metrics** - Performance tracking per step
✅ **Bottleneck Detection** - Identify slow steps automatically
✅ **Journey Analytics** - Track completed vs failed journeys
✅ **Realistic Load Testing** - Simulate actual user behavior

### Stress Testing
✅ **Automatic Breaking Point Detection** - Find capacity limits automatically
✅ **Incremental Load Increase** - Gradually increase from 10 to 1000+ users
✅ **Performance Degradation Detection** - Detect when P95 increases by 50%+
✅ **Capacity Planning** - Get optimal capacity recommendations
✅ **Bottleneck Identification** - Pinpoint system bottlenecks
✅ **Safety Margin Calculation** - Recommended operating capacity
✅ **Auto-Scaling Recommendations** - Thresholds for production

### Artillery Integration
✅ **Professional Load Testing** - Industry-standard Artillery.io integration
✅ **YAML Config Generation** - Auto-generate from scenarios
✅ **Multi-Phase Load** - Warmup, ramp-up, sustained, spike phases
✅ **HTML Reports** - Beautiful visual reports with charts
✅ **Advanced Metrics** - Detailed performance analytics
✅ **Custom Processors** - Dynamic data generation
✅ **Plugin Support** - Extend with Artillery plugins

### k6 Integration (NEW!)
✅ **Modern Load Testing** - Grafana Labs' developer-friendly tool
✅ **JavaScript Test Scripts** - ES6+ syntax with imports
✅ **Built-in Metrics** - Rate, Trend, Counter, Gauge
✅ **Thresholds** - Pass/fail criteria for tests
✅ **Stages Configuration** - Flexible ramp patterns
✅ **Cloud Integration** - Grafana Cloud k6 support
✅ **Multiple Output Formats** - JSON, CSV, InfluxDB, Prometheus

## Commands

### Simple Load Testing

```bash
# Show help
node scripts/load-test/run.js --help

# Test specific endpoint
node scripts/load-test/run.js --endpoint /api/v1/user/profile --users 50

# POST with authentication
node scripts/load-test/run.js \
  --endpoint /api/v1/tasks \
  --method POST \
  --users 100 \
  --header "Authorization: Bearer your-token" \
  --data '{"title":"Test Task","description":"Load test"}'

# Stress test
node scripts/load-test/run.js \
  --endpoint /api/v1/tasks \
  --users 500 \
  --duration 300 \
  --ramp-up 60
```

### Scenario-Based Testing

```bash
# Show available scenarios
node scripts/load-test/scenario.js --help

# Run user journey scenario
node scripts/load-test/scenario.js user-journey --users 50 --duration 5m

# Run authentication test
node scripts/load-test/scenario.js auth-only --users 100 --duration 2m

# Run payment workflow
node scripts/load-test/scenario.js payment-flow --users 30 --duration 10m
```

### Stress Testing

```bash
# Show help
node scripts/load-test/stress-test.js --help

# Basic stress test
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

# Custom stress test with parameters
node scripts/load-test/stress-test.js \
  --endpoint /api/v1/tasks \
  --start-users 20 \
  --max-users 500 \
  --step-size 20 \
  --step-duration 60

# POST endpoint stress test
node scripts/load-test/stress-test.js \
  --endpoint /api/v1/auth/login \
  --method POST \
  --data '{"email":"test@example.com","password":"pass123"}'
```

## Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--url` | - | Base URL | `http://localhost:5000` |
| `--endpoint` | - | API endpoint path | `/` |
| `--method` | `-X` | HTTP method | `GET` |
| `--users` | `-u` | Virtual users | `10` |
| `--duration` | `-d` | Test duration (seconds) | `60` |
| `--ramp-up` | - | Ramp-up time (seconds) | `10` |
| `--header` | `-H` | Custom header | - |
| `--data` | - | Request body (JSON) | - |

## Example Output

```
🚀 Load Test Starting...

Configuration:
  URL: http://localhost:5000/api/v1/auth/login
  Method: POST
  Virtual Users: 100
  Duration: 60s
  Ramp-up: 10s

Running test... ⏳

⏱️  60s | Requests: 5432 | Success: 5420 | Failed: 12 | Avg: 234ms | Active: 45 | Throughput: 90.5 req/s

📊 Load Test Results

============================================================

Requests:
  Total: 5432
  Success: 5420 (99.8%)
  Failed: 12 (0.2%)

Response Time:
  Min: 45ms
  Max: 2300ms
  Avg: 234ms
  P50: 198ms
  P95: 456ms
  P99: 890ms

Throughput:
  90.5 requests/sec

Status Codes:
  200: 5420
  500: 12

Errors:
  Connection timeout: 8
  Database lock: 4

============================================================

🎯 Performance Assessment:

  ✅ Response Time: Good (P95 < 500ms)
  ✅ Reliability: Excellent (< 1% failures)

💡 Recommendations:

  - Response time is acceptable
  - Low failure rate - system is stable
```

## Performance Thresholds

The tool automatically assesses performance:

**Response Time (P95):**
- ✅ Excellent: < 200ms
- ✅ Good: < 500ms
- ⚠️  Acceptable: < 1000ms
- ❌ Poor: > 1000ms

**Reliability (Failure Rate):**
- ✅ Perfect: 0%
- ✅ Excellent: < 1%
- ⚠️  Acceptable: < 5%
- ❌ Poor: > 5%

## Common Use Cases

### 1. API Endpoint Performance
```bash
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 100
```

### 2. Authentication Load
```bash
node scripts/load-test/run.js \
  --endpoint /api/v1/auth/login \
  --method POST \
  --users 200 \
  --data '{"email":"test@example.com","password":"pass123"}'
```

### 3. Authenticated Endpoints
```bash
# Step 1: Get token
TOKEN=$(curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}' \
  | jq -r '.data.accessToken')

# Step 2: Load test with token
node scripts/load-test/run.js \
  --endpoint /api/v1/user/profile \
  --users 50 \
  --header "Authorization: Bearer $TOKEN"
```

### 4. Find API Limits
```bash
# Start with small load
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 10

# Increase gradually
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 50
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 100
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 200
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 500
```

## Tips

### 1. Start Small
Begin with 10-20 users and gradually increase to understand system behavior.

### 2. Monitor Server
Watch server logs, CPU, memory, and database connections during tests.

### 3. Test in Stages
- Baseline: 10 users for 60s
- Normal: 50 users for 5 minutes
- Peak: 200 users for 10 minutes
- Stress: 500+ users until failure

### 4. Use Realistic Data
Test with production-like data sizes and request patterns.

### 5. Test Different Endpoints
Some endpoints are more expensive than others. Test:
- Fast endpoints (GET simple data)
- Medium endpoints (GET with joins)
- Slow endpoints (POST with file uploads, complex queries)

## Troubleshooting

### High Failure Rate
- Check server is running
- Verify database connections
- Check for rate limiting
- Monitor server resources

### Connection Errors
- `ECONNREFUSED`: Server not running
- `TIMEOUT`: Increase timeout or optimize endpoint
- `ECONNRESET`: Connection pool exhausted

### Slow Response Times
- Check database query performance
- Add database indexes
- Implement caching
- Optimize N+1 queries

---

## Scenario-Based Testing Deep Dive

### What is Scenario Testing?

Scenario testing simulates realistic user journeys by executing multiple API calls in sequence, where each step can use data from previous steps. This is much more realistic than testing individual endpoints.

**Example Flow:**
```
Register → Login → Get Profile → Create Task → Browse Tasks → Update Task
   ↓         ↓         ↓              ↓             ↓             ↓
 Get ID   Get Token  Use Token     Use Token    Use Token    Use Task ID
```

### How Context Flow Works

Each virtual user maintains an isolated **context object** that stores data throughout their journey:

```javascript
// Initial context
{
  userId: 1,
  userIndex: 1,
  timestamp: 1234567890
}

// After Step 1 (Register)
{
  userId: 1,
  userIndex: 1,
  timestamp: 1234567890,
  email: "loadtest1@example.com",  // ← Extracted
  accessToken: "eyJhbG..."          // ← Extracted
}

// After Step 2 (Login)
{
  userId: 1,
  userIndex: 1,
  timestamp: 1234567890,
  email: "loadtest1@example.com",
  accessToken: "eyJhbG...",          // ← Updated with new token
  refreshToken: "xYz123..."          // ← Extracted
}
```

### Dynamic Request Building

Request components can be static or dynamic (functions that use context):

```javascript
{
  name: 'Create task',
  method: 'POST',

  // Dynamic endpoint using context
  endpoint: (context) => `/api/v1/users/${context.userId}/tasks`,

  // Dynamic headers using context
  headers: (context) => ({
    Authorization: `Bearer ${context.accessToken}`
  }),

  // Dynamic body using context
  body: (context) => ({
    title: `Task by ${context.email}`,
    deadline: new Date(context.timestamp + 86400000).toISOString()
  }),

  // Extract data for next steps
  extract: {
    taskId: 'data._id',
    taskTitle: 'data.title'
  }
}
```

### Available Scenarios

#### 1. **user-journey** - Complete User Flow
Tests the full user lifecycle from registration to task management.

**Steps:**
1. Register new user
2. Login with credentials
3. Get user profile
4. Create new task
5. Browse all tasks
6. Get specific task
7. Update task status
8. Search tasks

**Best For:**
- Full system integration testing
- Realistic load simulation
- End-to-end performance validation

**Recommended Settings:**
```bash
node scripts/load-test/scenario.js user-journey --users 50 --duration 5m
```

#### 2. **auth-only** - Authentication Focus
Quick test focusing only on authentication system performance.

**Steps:**
1. Register user
2. Login immediately
3. Refresh access token
4. Verify token (get profile)

**Best For:**
- Testing auth system capacity
- Measuring JWT/bcrypt performance
- Quick smoke tests
- High concurrent login scenarios

**Recommended Settings:**
```bash
node scripts/load-test/scenario.js auth-only --users 100 --duration 2m
```

#### 3. **payment-flow** - Payment Workflow
Tests complete payment processing including Stripe integration.

**Steps:**
1. Register user
2. Login
3. Create payment intent
4. Confirm payment
5. Check payment status
6. Get payment history
7. Get payment statistics

**Best For:**
- Payment system reliability
- Stripe API integration testing
- Transaction flow validation
- Rate limit testing

**Recommended Settings:**
```bash
node scripts/load-test/scenario.js payment-flow --users 30 --duration 10m
```

### Example Output

```
🎭 Running Scenario: Complete User Journey

Scenario Steps:
  1. Register user
  2. Login with credentials
  3. Get user profile
  4. Create new task
  5. Browse all tasks
  6. Get task details
  7. Update task status
  8. Search tasks

Configuration:
  Virtual Users: 50 concurrent journeys
  Duration: 300s

Running... ⏳

📊 Results by Step:

┌─────────────────────┬─────────┬─────────┬──────────┬─────────┐
│ Step                │ Avg     │ P95     │ Success  │ Failed  │
├─────────────────────┼─────────┼─────────┼──────────┼─────────┤
│ 1. Register user    │ 890ms   │ 1200ms  │ 50       │ 0       │
│ 2. Login            │ 850ms   │ 1100ms  │ 50       │ 0       │
│ 3. Get profile      │ 45ms    │ 89ms    │ 50       │ 0       │
│ 4. Create task      │ 120ms   │ 230ms   │ 48       │ 2       │
│ 5. Browse tasks     │ 280ms   │ 450ms   │ 48       │ 0       │
│ 6. Get task         │ 50ms    │ 95ms    │ 48       │ 0       │
│ 7. Update task      │ 110ms   │ 200ms   │ 48       │ 0       │
│ 8. Search tasks     │ 320ms   │ 520ms   │ 48       │ 0       │
└─────────────────────┴─────────┴─────────┴──────────┴─────────┘

⚠️  Bottlenecks Detected:

1. 1. Register user - Slow response time
   Problem: P95 = 1200ms (Slow!)
   Avg: 890ms, but P95: 1200ms shows inconsistency
   💡 Recommendations:
   - Add database indexes
   - Implement caching
   - Optimize queries

2. 8. Search tasks - Slow response time
   Problem: P95 = 520ms (Slow!)
   Avg: 320ms, but P95: 520ms shows inconsistency
   💡 Recommendations:
   - Add database indexes
   - Implement caching
   - Optimize queries

📈 Summary:
  Total Journeys: 50
  Completed: 48 (96.0%)
  Failed: 2 (4.0%)
  Duration: 305.4s
```

### Creating Custom Scenarios

You can create your own scenarios by adding files to `scripts/load-test/scenarios/`:

```javascript
// scripts/load-test/scenarios/my-scenario.js

module.exports = {
  name: 'My Custom Scenario',
  description: 'Description of what this tests',

  steps: [
    {
      name: 'Step name',
      method: 'POST',
      endpoint: '/api/v1/endpoint',

      // Optional: Dynamic headers
      headers: (context) => ({
        Authorization: `Bearer ${context.token}`
      }),

      // Optional: Request body (can be static or dynamic)
      body: (context) => ({
        field: context.someValue
      }),

      // Optional: Extract data for next steps
      extract: {
        variableName: 'data.path.to.value'
      },

      // Optional: Validate response
      expect: {
        statusCode: 200
      },

      // Optional: Is this step critical? (default: true)
      critical: true  // If false, journey continues on failure
    }
  ]
};
```

Then run it:
```bash
node scripts/load-test/scenario.js my-scenario --users 50
```

### When to Use Scenario Testing vs Simple Testing

**Use Scenario Testing when:**
- Testing complete user workflows
- Need data flow between steps (register → login → action)
- Want realistic load simulation
- Testing business processes end-to-end
- Need to identify which step is the bottleneck

**Use Simple Testing when:**
- Testing single endpoint performance
- Want quick performance checks
- Testing specific API response times
- Need maximum throughput testing
- Isolating individual endpoint issues

---

## Stress Testing Deep Dive

### What is Stress Testing?

Stress testing automatically finds your system's breaking point by gradually increasing load until performance degrades or failures occur.

**Key Questions Answered:**
- What's the maximum number of concurrent users my system can handle?
- At what point does performance start degrading?
- What's the safe operating capacity for production?
- Where are the bottlenecks in my system?
- When should I trigger auto-scaling?

### How It Works

**Algorithm:**
```
1. Start with small load (10 users by default)
2. Run for step duration (30 seconds by default)
3. Measure: P95 response time, failure rate, throughput
4. Increase by step size (10 users by default)
5. Repeat until:
   - P95 increases by 50%+ (performance degradation)
   - Failure rate exceeds 5%
   - Maximum users reached
6. Calculate:
   - Breaking point (where degradation occurred)
   - Optimal capacity (70% of breaking point)
   - Safety margins and thresholds
```

### Example Output

```
💪 Stress Test Starting...

Configuration:
  URL: http://localhost:5000/api/v1/auth/login
  Method: POST
  Start Users: 10
  Max Users: 1000
  Step Size: +10 users per stage
  Stage Duration: 30s

Strategy: Incrementally increase load until degradation detected

============================================================

📈 Stage 1: Testing with 10 users...

  Results:
    Requests: 245 (245 success, 0 failed)
    Response Time: Avg=120ms, P95=180ms, P99=210ms
    Throughput: 8.2 req/s
    Failure Rate: 0.00%
    Status: ✅ Healthy

📈 Stage 2: Testing with 20 users...

  Results:
    Requests: 490 (490 success, 0 failed)
    Response Time: Avg=135ms, P95=195ms, P99=230ms
    Throughput: 16.3 req/s
    Failure Rate: 0.00%
    Status: ✅ Healthy

📈 Stage 3: Testing with 30 users...

  Results:
    Requests: 720 (715 success, 5 failed)
    Response Time: Avg=180ms, P95=280ms, P99=350ms
    Throughput: 24.0 req/s
    Failure Rate: 0.69%
    Status: ✅ Healthy

📈 Stage 4: Testing with 40 users...

  Results:
    Requests: 890 (870 success, 20 failed)
    Response Time: Avg=250ms, P95=450ms, P99=580ms
    Throughput: 29.7 req/s
    Failure Rate: 2.25%
    Status: ⚠️  Degraded

⚠️  Performance degradation detected!
   P95: 280ms → 450ms (60.7% increase)

📈 Stage 5: Testing with 50 users...

  Results:
    Requests: 980 (920 success, 60 failed)
    Response Time: Avg=380ms, P95=720ms, P99=890ms
    Throughput: 32.7 req/s
    Failure Rate: 6.12%
    Status: ❌ Critical

⚠️  Performance degradation detected!
   P95: 450ms → 720ms (60.0% increase)

🚨 Breaking point reached at 50 users!

============================================================
📊 STRESS TEST RESULTS
============================================================

📈 Performance Progression:

┌────────┬──────────┬─────────┬─────────┬──────────┬─────────┐
│ Users  │ Requests │ Avg     │ P95     │ Fail %   │ Status  │
├────────┼──────────┼─────────┼─────────┼──────────┼─────────┤
│ 10     │ 245      │ 120ms   │ 180ms   │ 0.0%     │ ✅      │
│ 20     │ 490      │ 135ms   │ 195ms   │ 0.0%     │ ✅      │
│ 30     │ 720      │ 180ms   │ 280ms   │ 0.7%     │ ✅      │
│ 40     │ 890      │ 250ms   │ 450ms   │ 2.3%     │ ⚠️       │
│ 50     │ 980      │ 380ms   │ 720ms   │ 6.1%     │ ❌      │
└────────┴──────────┴─────────┴─────────┴──────────┴─────────┘

🚨 Breaking Point Analysis:

  Breaking Point: 50 concurrent users
  Optimal Capacity: 35 concurrent users (recommended)
  Safety Margin: 30% below breaking point

🔍 Bottleneck Analysis:

  ❌ Response Time Bottleneck:
     P95 response time: 720ms (Too slow)
     Recommendations:
     - Optimize database queries
     - Add database indexes
     - Implement caching layer
     - Consider horizontal scaling

  ❌ Reliability Bottleneck:
     Failure rate: 6.1% (Too high)
     Recommendations:
     - Increase connection pool size
     - Add rate limiting
     - Implement circuit breakers
     - Check server resource limits (CPU, Memory)

💡 Capacity Planning Recommendations:

  1. Production Capacity: Set to 35 concurrent users
  2. Auto-Scaling Trigger: Scale up at 28 users (80% of capacity)
  3. Alert Threshold: Warn at 31 users (90% of capacity)
  4. Hard Limit: Block at 50 users to prevent system failure

============================================================
```

### Configuration Options

| Option | Description | Default | Recommendation |
|--------|-------------|---------|----------------|
| `--start-users` | Initial user count | 10 | Start small to establish baseline |
| `--max-users` | Maximum users to test | 1000 | Set based on expected peak load |
| `--step-size` | Users to add per stage | 10 | Smaller steps = more precise results |
| `--step-duration` | Stage duration (seconds) | 30 | Longer = more accurate, slower test |

### Interpretation Guide

**Status Indicators:**
- ✅ **Healthy**: P95 < 500ms AND failure rate < 1%
- ⚠️ **Degraded**: P95 < 1000ms AND failure rate < 5%
- ❌ **Critical**: P95 > 1000ms OR failure rate > 5%

**Performance Degradation:**
- Detected when P95 increases by **50%+** between stages
- Requires **2 consecutive degradations** to confirm breaking point
- Prevents false positives from temporary spikes

**Capacity Recommendations:**
- **Optimal Capacity**: 70% of breaking point (safe operating range)
- **Auto-Scale Trigger**: 80% of optimal (time to add resources)
- **Alert Threshold**: 90% of optimal (approaching limits)
- **Hard Limit**: Breaking point (prevent system failure)

### Use Cases

#### 1. Initial Capacity Planning
```bash
# Find out how many users your system can handle
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login
```

**When to use:**
- Before launch (determine initial server capacity)
- After major refactoring (verify improvements)
- Before scaling decisions (know your limits)

#### 2. Quick Capacity Check
```bash
# Fast test with larger steps
node scripts/load-test/stress-test.js \
  --endpoint /api/v1/tasks \
  --step-size 50 \
  --step-duration 15
```

**When to use:**
- Quick smoke test after deployment
- Regular health checks
- CI/CD pipeline validation

#### 3. Precise Capacity Analysis
```bash
# Detailed test with small steps
node scripts/load-test/stress-test.js \
  --endpoint /api/v1/auth/login \
  --start-users 10 \
  --max-users 200 \
  --step-size 5 \
  --step-duration 60
```

**When to use:**
- Critical endpoints (auth, payment)
- Production capacity planning
- Detailed performance analysis

### Best Practices

**1. Test Realistic Endpoints**
- Test endpoints users actually hit most
- Include authentication if endpoint requires it
- Use realistic request bodies

**2. Monitor Server During Test**
- Watch CPU, memory, disk I/O
- Monitor database connections
- Check for error logs
- Track network bandwidth

**3. Run Multiple Times**
- Results can vary between runs
- Average results from 2-3 runs
- Test at different times of day

**4. Test After Changes**
- After code optimization
- After infrastructure changes
- After adding caching
- After database indexing

**5. Progressive Testing**
```bash
# Step 1: Find breaking point
node scripts/load-test/stress-test.js --endpoint /api/v1/tasks

# Step 2: Test at optimal capacity
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 35 --duration 300

# Step 3: Test specific user journey at optimal capacity
node scripts/load-test/scenario.js user-journey --users 35 --duration 300
```

### Comparison with Other Testing Types

| Feature | Simple Load Test | Scenario Test | Stress Test |
|---------|-----------------|---------------|-------------|
| **Purpose** | Single endpoint performance | Realistic user journeys | Find capacity limits |
| **Load** | Fixed user count | Fixed user count | Gradually increasing |
| **Duration** | Fixed duration | Fixed duration | Until breaking point |
| **Output** | Performance metrics | Step-by-step analysis | Capacity recommendations |
| **Use Case** | Performance validation | Integration testing | Capacity planning |
| **Time Required** | Fast (1-5 min) | Medium (5-10 min) | Slow (10-30 min) |

---

## Artillery Integration Deep Dive

### What is Artillery?

[Artillery](https://www.artillery.io/) is an industry-standard, open-source load testing toolkit used by companies worldwide. It provides advanced features like:
- Multi-phase load testing
- Beautiful HTML reports
- Plugin ecosystem
- Distributed testing
- CI/CD integration

**Why use Artillery?**
- Professional-grade reports
- Widely recognized tool
- Excellent documentation
- Active community
- Enterprise features

### Setup

**1. Generate Artillery Configs:**
```bash
# Generate all scenarios
node scripts/load-test/artillery-generator.js --all

# Generate specific scenario
node scripts/load-test/artillery-generator.js user-journey
```

**2. Install Artillery:**
```bash
# Global installation (recommended)
npm install -g artillery

# Or local installation
npm install --save-dev artillery
npx artillery --version
```

**3. Run Tests:**
```bash
# Using wrapper script (recommended)
node scripts/load-test/run-artillery.js user-journey

# Or run Artillery directly
artillery run artillery-configs/user-journey.yml
```

### Generated Files

After running `artillery-generator.js --all`, you'll get:

```
scripts/load-test/artillery-configs/
├── user-journey.yml           # Complete user flow config
├── auth-only.yml               # Authentication test config
├── payment-flow.yml            # Payment workflow config
├── artillery-processor.js      # Custom functions
└── README.md                   # Artillery usage guide
```

### YAML Configuration Structure

Generated configs follow this structure:

```yaml
config:
  target: http://localhost:5000
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warmup
    - duration: 120
      arrivalRate: 20
      name: Ramp-up
    - duration: 300
      arrivalRate: 50
      name: Sustained Load

  variables:
    timestamp: {{ $timestamp }}
    randomId: {{ $randomNumber(1, 10000) }}

  processor: ./artillery-processor.js

  plugins:
    expect: {}
    metrics:
      namespace: load-test-auth-only

scenarios:
  - name: Authentication Only
    flow:
      - post:
          url: /api/v1/auth/register
          json:
            email: "{{ uniqueEmail }}"
            password: "TestPass123!"
          capture:
            - json: "$.data.accessToken"
              as: accessToken
          expect:
            - statusCode: 201

      - think: 2

      - post:
          url: /api/v1/auth/login
          json:
            email: "{{ email }}"
            password: "TestPass123!"
          capture:
            - json: "$.data.accessToken"
              as: accessToken
```

### Load Phases

Each scenario has customized phases based on its type:

#### **auth-only** (High Volume)
```yaml
phases:
  - duration: 60, arrivalRate: 5   # Warmup
  - duration: 120, arrivalRate: 20  # Ramp-up
  - duration: 300, arrivalRate: 50  # Sustained (high)
```

#### **user-journey** (Medium Volume + Spike)
```yaml
phases:
  - duration: 60, arrivalRate: 2   # Warmup
  - duration: 120, arrivalRate: 5   # Ramp-up
  - duration: 300, arrivalRate: 10  # Sustained
  - duration: 60, arrivalRate: 20   # Spike test
```

#### **payment-flow** (Conservative)
```yaml
phases:
  - duration: 60, arrivalRate: 1   # Warmup
  - duration: 120, arrivalRate: 3   # Ramp-up
  - duration: 300, arrivalRate: 5   # Sustained (low)
```

### Running Tests

**Using Wrapper Script (Recommended):**
```bash
# Run with default target
node scripts/load-test/run-artillery.js user-journey

# Run with custom target
node scripts/load-test/run-artillery.js auth-only --target http://staging.example.com

# List available scenarios
node scripts/load-test/run-artillery.js --list
```

**Benefits of wrapper script:**
- Checks Artillery installation
- Auto-generates HTML reports
- Timestamped outputs
- Clear error messages

**Using Artillery Directly:**
```bash
# Basic run
artillery run artillery-configs/user-journey.yml

# With custom target
artillery run --target http://staging.example.com artillery-configs/auth-only.yml

# With output file
artillery run --output report.json artillery-configs/user-journey.yml

# Generate HTML report
artillery report report.json --output report.html

# Quick test (override phases)
artillery quick --count 10 --num 100 http://localhost:5000/api/v1/tasks
```

### HTML Reports

Artillery generates beautiful HTML reports with:
- Request rate over time (chart)
- Response time distribution (chart)
- Status code distribution
- Scenario completion stats
- Error details
- Percentile metrics (P50, P95, P99)

**Generate Report:**
```bash
# Automatic (using wrapper)
node scripts/load-test/run-artillery.js user-journey

# Manual
artillery run --output report.json artillery-configs/user-journey.yml
artillery report report.json --output report.html
```

**Report Location:**
```
scripts/load-test/artillery-reports/
├── user-journey-1234567890.json
├── user-journey-1234567890.html  ← Open this in browser
```

### Custom Processor Functions

The `artillery-processor.js` file contains custom functions:

```javascript
module.exports = {
  // Generate unique email for each virtual user
  setDynamicVars: function(requestParams, context, ee, next) {
    context.vars.uniqueEmail = `loadtest${Date.now()}_${Math.random()}@example.com`;
    context.vars.timestamp = Date.now();
    return next();
  },

  // Log errors
  logResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
      console.log('Error response:', response.statusCode);
    }
    return next();
  },

  // Inject auth token
  authenticate: function(requestParams, context, ee, next) {
    if (context.vars.accessToken) {
      requestParams.headers.Authorization = `Bearer ${context.vars.accessToken}`;
    }
    return next();
  }
};
```

**Use in YAML:**
```yaml
config:
  processor: ./artillery-processor.js

scenarios:
  - flow:
      - function: "setDynamicVars"
      - post:
          url: /api/v1/auth/register
          json:
            email: "{{ uniqueEmail }}"
```

### Advanced Features

**1. Expectations (Assertions):**
```yaml
- post:
    url: /api/v1/auth/login
    expect:
      - statusCode: 200
      - hasProperty: data.accessToken
      - contentType: json
```

**2. Think Time (Realistic Pauses):**
```yaml
- post:
    url: /api/v1/auth/login
- think: 3  # Wait 3 seconds
- get:
    url: /api/v1/user/profile
```

**3. Variable Capture:**
```yaml
- post:
    url: /api/v1/auth/login
    capture:
      - json: "$.data.accessToken"
        as: token
      - json: "$.data.user._id"
        as: userId
```

**4. Multiple Scenarios:**
```yaml
scenarios:
  - name: Happy Path
    weight: 70
    flow: [...]

  - name: Error Path
    weight: 30
    flow: [...]
```

### Environment-Specific Testing

**Development:**
```bash
artillery run artillery-configs/user-journey.yml
```

**Staging:**
```bash
artillery run --target http://staging.example.com artillery-configs/user-journey.yml
```

**Production (Careful!):**
```bash
artillery run --target https://api.production.com artillery-configs/user-journey.yml
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
name: Load Tests

on: [push]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Artillery
        run: npm install -g artillery

      - name: Run Load Test
        run: artillery run artillery-configs/user-journey.yml

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: artillery-report
          path: report.json
```

### Tips & Best Practices

**1. Start Small:**
```bash
# Test with low load first
artillery run artillery-configs/auth-only.yml
```

**2. Monitor Server:**
- Watch server metrics during tests
- Check database connections
- Monitor error logs

**3. Customize Phases:**
Edit YAML files to adjust load:
```yaml
phases:
  - duration: 30, arrivalRate: 1  # Gentler start
```

**4. Use Realistic Data:**
- Unique emails per user
- Realistic request bodies
- Proper authentication

**5. Compare Results:**
- Save reports from each run
- Track improvements over time
- Identify regressions

### Troubleshooting

**Artillery Not Found:**
```bash
npm install -g artillery
# or
npx artillery --version
```

**Config Not Found:**
```bash
node scripts/load-test/artillery-generator.js --all
```

**Connection Errors:**
- Check server is running
- Verify target URL
- Check firewall/network settings

**High Failure Rate:**
- Reduce arrivalRate in phases
- Check server capacity
- Review error logs

### Comparison: Native Scripts vs Artillery

| Feature | Native Scripts | Artillery |
|---------|---------------|-----------|
| **Setup** | None needed | Install required |
| **Reports** | Console output | Beautiful HTML |
| **Phases** | Manual | Built-in |
| **Plugins** | None | Rich ecosystem |
| **CI/CD** | Easy | Industry standard |
| **Learning Curve** | Easy | Moderate |
| **Flexibility** | High | Very High |
| **Recognition** | Custom | Industry standard |

**Use Native Scripts when:**
- Quick tests needed
- No installation possible
- Custom logic required
- Learning load testing

**Use Artillery when:**
- Professional reports needed
- Sharing results with team
- CI/CD integration
- Industry-standard tool required

---

## k6 Integration Deep Dive

### What is k6?

[k6](https://k6.io/) is a modern, open-source load testing tool created by Grafana Labs. Written in Go, it uses JavaScript (ES6+) for writing test scripts, making it developer-friendly and easy to version control.

**Why k6?**
- 🚀 Modern JavaScript syntax (imports, async/await)
- 📊 Built-in metrics and thresholds
- ☁️ Grafana Cloud integration
- 🎯 Developer-focused CLI tool
- 📈 High performance (written in Go)
- 🔧 Easy CI/CD integration

### Setup

**1. Generate k6 Scripts:**
```bash
# Generate all scenarios
node scripts/load-test/k6-generator.js --all

# Generate specific scenario
node scripts/load-test/k6-generator.js user-journey
```

**2. Install k6:**
```bash
# macOS (Homebrew)
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux (Debian/Ubuntu - see k6.io for full instructions)
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

**3. Run Tests:**
```bash
# Using wrapper (recommended)
node scripts/load-test/run-k6.js user-journey

# Or run k6 directly
k6 run k6-scripts/user-journey.js
```

### Generated Scripts

After running `k6-generator.js --all`, you'll get:

```
scripts/load-test/k6-scripts/
├── user-journey.js         # Complete user flow
├── auth-only.js             # Authentication test
├── payment-flow.js          # Payment workflow
└── README.md                # k6 usage guide
```

### Script Structure

Generated k6 scripts follow this structure:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

// Configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp-up
    { duration: '3m', target: 30 },  // Steady
    { duration: '1m', target: 0 }    // Ramp-down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.05']
  }
};

// Test function (runs per VU)
export default function() {
  const response = makeRequest('POST', '/api/v1/auth/login', {...});
  check(response, {
    'status is 200': (r) => r.status === 200
  });
  sleep(Math.random() * 2 + 1);
}
```

### Load Stages

Each scenario has optimized stages:

**auth-only** (High Volume):
```javascript
stages: [
  { duration: '30s', target: 10 },
  { duration: '1m', target: 50 },
  { duration: '3m', target: 100 },
  { duration: '30s', target: 0 }
]
```

**user-journey** (Medium + Spike):
```javascript
stages: [
  { duration: '1m', target: 5 },
  { duration: '2m', target: 20 },
  { duration: '5m', target: 30 },
  { duration: '1m', target: 50 },  // Spike
  { duration: '1m', target: 0 }
]
```

**payment-flow** (Conservative):
```javascript
stages: [
  { duration: '1m', target: 3 },
  { duration: '2m', target: 10 },
  { duration: '5m', target: 15 },
  { duration: '1m', target: 0 }
]
```

### Running Tests

**Using Wrapper:**
```bash
# Default
node scripts/load-test/run-k6.js user-journey

# Custom base URL
node scripts/load-test/run-k6.js auth-only --base-url http://staging.example.com

# Override VUs and duration
node scripts/load-test/run-k6.js user-journey --vus 50 --duration 5m

# CSV output
node scripts/load-test/run-k6.js payment-flow --output csv

# List scenarios
node scripts/load-test/run-k6.js --list
```

**Using k6 Directly:**
```bash
# Basic
k6 run k6-scripts/user-journey.js

# With environment variable
k6 run --env BASE_URL=http://staging.example.com k6-scripts/auth-only.js

# Override VUs
k6 run --vus 50 --duration 5m k6-scripts/user-journey.js

# JSON output
k6 run --out json=results.json k6-scripts/user-journey.js
```

### Thresholds & Checks

**Thresholds** (pass/fail criteria):
```javascript
thresholds: {
  'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  'http_req_failed': ['rate<0.05'],  // <5% errors
  'errors': ['rate<0.05'],
  'checks': ['rate>0.95']  // >95% success
}
```

**Checks** (in-test validation):
```javascript
check(response, {
  'status is 200': (r) => r.status === 200,
  'has token': (r) => r.json('data.accessToken') !== undefined,
  'response time OK': (r) => r.timings.duration < 500
});
```

### Custom Metrics

Scripts include custom metrics:

```javascript
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Usage
errorRate.add(1);
requestDuration.add(duration);
successfulRequests.add(1);
```

### Output Formats

**Terminal** (default):
- Real-time progress
- Checks pass/fail
- HTTP request stats
- Threshold results

**JSON**:
```bash
k6 run --out json=results.json k6-scripts/user-journey.js
```

**CSV**:
```bash
k6 run --out csv=results.csv k6-scripts/user-journey.js
```

**InfluxDB**:
```bash
k6 run --out influxdb=http://localhost:8086/k6 k6-scripts/user-journey.js
```

**Grafana Cloud**:
```bash
k6 cloud k6-scripts/user-journey.js
```

### Environment Variables

```bash
# Set base URL
k6 run --env BASE_URL=http://localhost:5000 k6-scripts/user-journey.js

# Multiple variables
k6 run \
  --env BASE_URL=http://staging.example.com \
  --env API_KEY=secret123 \
  k6-scripts/user-journey.js
```

### CI/CD Integration

**GitHub Actions:**
```yaml
name: k6 Load Tests

on: [push]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1

      - name: Run k6 test
        run: |
          ./k6 run k6-scripts/user-journey.js \
            --out json=results.json

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: results.json
```

### Comparison: Artillery vs k6

| Feature | Artillery | k6 |
|---------|-----------|-----|
| **Language** | JavaScript (Node.js) | JavaScript (Go runtime) |
| **Performance** | Good | Excellent (Go) |
| **Syntax** | YAML + JS | Pure JavaScript ES6+ |
| **Reports** | HTML (built-in) | JSON/CSV (external viz) |
| **Cloud** | Artillery Cloud | Grafana Cloud |
| **Learning Curve** | Easy | Easy-Medium |
| **CI/CD** | Excellent | Excellent |
| **Thresholds** | Plugin | Built-in |
| **Community** | Large | Very Large |

**Use Artillery when:**
- Want HTML reports out-of-the-box
- Prefer YAML configuration
- Need built-in report generation

**Use k6 when:**
- Want modern JavaScript syntax
- Need high performance
- Prefer code over config
- Want Grafana integration
- Need built-in thresholds

---

## Next Steps

**Coming Soon:**
- ✨ Database monitoring
- ✨ HTML reports (for native scripts)

## Related Tools

- [Postman Collection Generator](../postman/generate-all.js) - Generate API collections
- [Test Script Generator](../postman/generate-tests.js) - Generate automated tests
- [Route Analyzer](../postman/analyze-routes.js) - Analyze route comments

---

**Happy Load Testing! 🚀**
