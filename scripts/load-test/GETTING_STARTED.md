# 🚀 Load Testing - Getting Started Guide

Complete guide to choosing and using the right load testing tool for your needs.

---

## 📋 Quick Decision Tree

**Start here to find the right tool:**

```
Do you need to test...

├─ A single endpoint performance?
│  └─ Use: Simple Load Test (run.js)
│     Time: 1-5 minutes
│     Setup: None needed
│
├─ A complete user workflow (register → login → action)?
│  └─ Use: Scenario Testing (scenario.js)
│     Time: 5-10 minutes
│     Setup: None needed
│
├─ System capacity limits?
│  └─ Use: Stress Testing (stress-test.js)
│     Time: 10-30 minutes
│     Setup: None needed
│
├─ Need professional HTML reports?
│  └─ Use: Artillery Integration
│     Time: 5-15 minutes
│     Setup: npm install -g artillery
│
└─ Need modern JS with Grafana integration?
   └─ Use: k6 Integration
      Time: 5-15 minutes
      Setup: brew install k6
```

---

## 🎯 Tools Comparison

| Tool | Best For | Setup Time | Output | Complexity |
|------|----------|------------|--------|------------|
| **Simple Load Test** | Quick endpoint checks | None | Console | ⭐ Easy |
| **Scenario Testing** | User workflows | None | Console + Tables | ⭐⭐ Medium |
| **Stress Testing** | Finding capacity limits | None | Console + Analysis | ⭐⭐ Medium |
| **Artillery** | Professional reports | 2 min | HTML + Charts | ⭐⭐⭐ Advanced |
| **k6** | Modern dev workflow | 2 min | Terminal + JSON | ⭐⭐⭐ Advanced |

---

## 🏃 Quick Start Examples

### 1️⃣ Simple Load Test (Fastest)

**When to use:**
- Test single endpoint performance
- Quick health check
- Benchmark specific API

**Run:**
```bash
node scripts/load-test/run.js \
  --endpoint /api/v1/auth/login \
  --method POST \
  --users 50 \
  --duration 60 \
  --data '{"email":"test@example.com","password":"pass123"}'
```

**Output:**
```
📊 Load Test Results
Total: 2,430 requests
Success: 2,425 (99.8%)
Avg Response Time: 156ms
P95: 245ms
Throughput: 40.5 req/s
```

---

### 2️⃣ Scenario Testing (Recommended)

**When to use:**
- Test complete user journeys
- Validate multi-step workflows
- Find bottlenecks in user flow

**Run:**
```bash
node scripts/load-test/scenario.js user-journey --users 50 --duration 5m
```

**Output:**
```
📊 Results by Step:
┌─────────────────────┬─────────┬─────────┬──────────┬─────────┐
│ Step                │ Avg     │ P95     │ Success  │ Failed  │
├─────────────────────┼─────────┼─────────┼──────────┼─────────┤
│ 1. Register user    │ 890ms   │ 1200ms  │ 50       │ 0       │
│ 2. Login            │ 850ms   │ 1100ms  │ 50       │ 0       │
│ 3. Get profile      │ 45ms    │ 89ms    │ 50       │ 0       │
└─────────────────────┴─────────┴─────────┴──────────┴─────────┘
```

---

### 3️⃣ Stress Testing (Capacity Planning)

**When to use:**
- Find system capacity limits
- Determine optimal production capacity
- Get auto-scaling thresholds

**Run:**
```bash
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login
```

**Output:**
```
📈 Performance Progression:
┌────────┬─────────┬──────────┬─────────┐
│ Users  │ P95     │ Fail %   │ Status  │
├────────┼─────────┼──────────┼─────────┤
│ 10     │ 180ms   │ 0.0%     │ ✅      │
│ 20     │ 195ms   │ 0.0%     │ ✅      │
│ 30     │ 280ms   │ 0.7%     │ ✅      │
│ 40     │ 450ms   │ 2.3%     │ ⚠️       │
│ 50     │ 720ms   │ 6.1%     │ ❌      │
└────────┴─────────┴──────────┴─────────┘

🚨 Breaking Point: 50 concurrent users
💡 Optimal Capacity: 35 concurrent users
```

---

### 4️⃣ Artillery (Professional Reports)

**When to use:**
- Need HTML reports for stakeholders
- Share results with team
- Industry-standard tool

**Setup:**
```bash
npm install -g artillery
node scripts/load-test/artillery-generator.js --all
```

**Run:**
```bash
node scripts/load-test/run-artillery.js user-journey
```

**Output:**
- Beautiful HTML report with charts
- Request rate over time
- Response time distribution
- Percentile metrics

---

### 5️⃣ k6 (Modern Developer Tool)

**When to use:**
- Modern JavaScript workflow
- Grafana Cloud integration
- High performance needed

**Setup:**
```bash
brew install k6  # macOS
choco install k6  # Windows
node scripts/load-test/k6-generator.js --all
```

**Run:**
```bash
node scripts/load-test/run-k6.js user-journey
```

**Output:**
- Terminal with real-time metrics
- Built-in thresholds (pass/fail)
- JSON/CSV exports
- Grafana Cloud integration

---

## 📊 Feature Matrix

| Feature | Simple | Scenario | Stress | Artillery | k6 |
|---------|--------|----------|--------|-----------|-----|
| **Multi-step workflows** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Context flow** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Breaking point detection** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **HTML reports** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Pass/fail thresholds** | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| **Setup required** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Cloud integration** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Real-time metrics** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🎓 Learning Path

### Beginner (Day 1)
```bash
# 1. Start with simple load test
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 10

# 2. Increase load gradually
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 50

# 3. Test different endpoints
node scripts/load-test/run.js --endpoint /api/v1/auth/login --users 20
```

### Intermediate (Week 1)
```bash
# 1. Run scenario tests
node scripts/load-test/scenario.js auth-only --users 50 --duration 2m

# 2. Find capacity limits
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

# 3. Test at optimal capacity
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 35 --duration 300
```

### Advanced (Week 2+)
```bash
# 1. Generate Artillery configs
node scripts/load-test/artillery-generator.js --all

# 2. Run professional tests
node scripts/load-test/run-artillery.js user-journey

# 3. Generate k6 scripts
node scripts/load-test/k6-generator.js --all

# 4. Run with k6
node scripts/load-test/run-k6.js user-journey
```

---

## 🏆 Best Practices

### 1. Start Small, Scale Gradually

```bash
# Bad ❌
node scripts/load-test/run.js --users 1000

# Good ✅
node scripts/load-test/run.js --users 10
node scripts/load-test/run.js --users 50
node scripts/load-test/run.js --users 100
```

### 2. Monitor Server During Tests

Watch these metrics during load tests:
- CPU usage
- Memory usage
- Database connections
- Response times
- Error logs

### 3. Test Realistic Scenarios

```bash
# Bad ❌ - No authentication
node scripts/load-test/run.js --endpoint /api/v1/user/profile

# Good ✅ - With authentication
node scripts/load-test/scenario.js user-journey
```

### 4. Run Multiple Times

Results vary between runs. Average 2-3 runs:

```bash
# Run 1
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

# Run 2 (after cool-down)
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

# Run 3
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

# Compare results
```

### 5. Test After Changes

Run load tests after:
- Code optimization
- Database indexing
- Caching implementation
- Infrastructure changes

---

## 🔥 Common Scenarios

### Scenario 1: New Feature Launch

```bash
# Step 1: Find current capacity
node scripts/load-test/stress-test.js --endpoint /api/v1/tasks

# Step 2: Test new feature at optimal capacity
node scripts/load-test/run.js --endpoint /api/v1/new-feature --users 35

# Step 3: Run complete user journey
node scripts/load-test/scenario.js user-journey --users 35 --duration 5m
```

### Scenario 2: Performance Regression Check

```bash
# Before optimization
node scripts/load-test/run.js --endpoint /api/v1/search --users 50 > before.txt

# Apply optimization (indexes, caching, etc.)

# After optimization
node scripts/load-test/run.js --endpoint /api/v1/search --users 50 > after.txt

# Compare results
diff before.txt after.txt
```

### Scenario 3: Production Readiness

```bash
# 1. Find breaking point
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

# 2. Test at 80% of optimal capacity
node scripts/load-test/scenario.js user-journey --users 28 --duration 10m

# 3. Generate professional reports
node scripts/load-test/run-artillery.js user-journey

# 4. Share HTML report with team
```

---

## 🚨 Troubleshooting

### High Response Times

**Symptom:** P95 > 1000ms

**Diagnosis:**
```bash
# Test with fewer users
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 10
```

**Solutions:**
- Add database indexes
- Implement caching
- Optimize N+1 queries
- Check slow query logs

### High Failure Rate

**Symptom:** >5% failures

**Diagnosis:**
```bash
# Check with very low load
node scripts/load-test/run.js --endpoint /api/v1/tasks --users 5
```

**Solutions:**
- Increase connection pool size
- Add rate limiting
- Check server resource limits
- Review error logs

### Connection Errors

**Symptom:** ECONNREFUSED, TIMEOUT

**Solutions:**
- Verify server is running
- Check firewall settings
- Increase timeout values
- Check max connections limit

---

## 📚 Next Steps

1. **Read Full Documentation:**
   - [Complete README](./README.md)

2. **Try All Tools:**
   - Start with Simple Load Test
   - Progress to Scenario Testing
   - Master Stress Testing
   - Learn Artillery/k6

3. **Create Custom Scenarios:**
   - Add files to `scenarios/` folder
   - Follow existing patterns
   - Test your specific workflows

4. **Integrate with CI/CD:**
   - Add to GitHub Actions
   - Automate performance testing
   - Track metrics over time

---

## 🎯 Recommended Workflow

```bash
# Daily: Quick smoke test
node scripts/load-test/run.js --endpoint /api/v1/health --users 10

# Weekly: Capacity check
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login

# Monthly: Full regression test
node scripts/load-test/scenario.js user-journey --users 50 --duration 10m
node scripts/load-test/run-artillery.js user-journey

# Before Deploy: Comprehensive validation
node scripts/load-test/stress-test.js --endpoint /api/v1/auth/login
node scripts/load-test/scenario.js user-journey --users 35 --duration 15m
node scripts/load-test/run-k6.js user-journey
```

---

## 💡 Pro Tips

1. **Use Descriptive Names:** Name your test runs with timestamps
2. **Save Results:** Keep a history of test results for comparison
3. **Test Different Times:** Run during peak and off-peak hours
4. **Document Findings:** Note what you learn from each test
5. **Share Results:** Discuss findings with team

---

## 🆘 Need Help?

- Full documentation: [README.md](./README.md)
- Scenario examples: [scenarios/](./scenarios/)
- Artillery configs: [artillery-configs/](./artillery-configs/)
- k6 scripts: [k6-scripts/](./k6-scripts/)

---

**Happy Load Testing! 🚀**

Remember: The goal is not to break your system, but to understand its limits and improve its performance.
