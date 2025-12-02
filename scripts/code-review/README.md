# 🎯 Senior Engineer Code Reviewer

Reviews code like a **top 1% senior engineer** worldwide: thorough, practical, and pragmatic.

**Philosophy**: Avoids over-engineering. Focuses on production-ready code that's readable, maintainable, secure, and scalable.

---

## ✨ Features

### What Makes This "Senior Engineer Level"

1. **Pragmatic > Perfect** - Knows when to break rules
2. **Impact-Focused** - Prioritizes by production impact
3. **Teaching Style** - Explains reasoning, not just rules
4. **Context-Aware** - "This is OK for admin dashboard, NOT for payments"
5. **Over-Engineering Detection** - Prevents premature optimization
6. **Production Experience** - "This will crash with 500+ users"
7. **Trade-off Analysis** - "42 lines removed, readability increased"
8. **Celebrates Good Code** - Not just criticism
9. **Actionable Feedback** - Exact code fixes, not vague suggestions
10. **Wisdom > Rules** - Knows WHY rules exist

### Zero External Dependencies

- Uses only Node.js built-ins (fs, path)
- No NPM packages required
- Portable across projects

### Beautiful Console Output

- ANSI colors with Bangla text support
- Before/after code examples
- Senior engineer feedback style
- Teaching moments and principles

---

## 🚀 Quick Start

```bash
# Review entire codebase
node scripts/code-review/reviewer.js

# Review specific module
node scripts/code-review/reviewer.js --module user

# Review specific file
node scripts/code-review/reviewer.js --file src/app/modules/auth/auth.service.ts

# Critical issues only
node scripts/code-review/reviewer.js --severity critical

# JSON output for CI/CD
node scripts/code-review/reviewer.js --format json --ci
```

---

## 📊 What It Checks

### 🔴 Critical Issues (Fix Immediately)

**Import Order Violations**
- mongooseMetrics must load BEFORE routes
- autoLabelBootstrap must run BEFORE routes
- OpenTelemetry must initialize BEFORE instrumented code

**Module Pattern Compliance**
- All modules must have 6 files (interface, model, controller, service, route, validation)
- Missing validation.ts = security vulnerability

**Error Handling**
- Async controllers must use `catchAsync()`
- Services must throw `ApiError(statusCode, message)`
- No generic `Error()` throwing

**Transaction Safety** 🆕
- Multi-step operations must use `withTransaction()`
- Payment/money operations require ACID guarantees
- Loop updates need transaction wrapper
- No partial state on errors

### ⚠️ Architecture Issues (Fix Soon)

**Service Layer Pattern**
- No direct DB queries in controllers
- Services should use model static methods
- Thin controllers, fat services

**Middleware Order**
- `auth()` → `fileHandler()` → `validateRequest()` → controller
- Never validate before auth (wastes resources)

**Route Flow Validation**
- All POST/PUT routes need `validateRequest(ZodSchema)`
- Data entry points without validation = security risk

### 💡 Over-Engineering Detected

**Premature Abstraction**
- Factory pattern for only 2 cases → Use simple `if` statement
- Builder pattern for 3-property objects → Use object literal
- Singleton where module export works → Just use `module.exports`

**Unnecessary Patterns**
- Feature flag system with 1 flag → Delete old code instead
- Abstract classes with single implementation → Remove abstraction

**YAGNI Violations**
- "Extensible" code for features not in roadmap
- Configurable systems with zero config options

### 🟡 Quality Issues (Improve Code Quality)

**Readability**
- Magic numbers → Extract to named constants
- Clever code (nested ternaries, long chains) → Break into clear steps
- Complex regex → Simplify or add comments

**Maintainability**
- Hardcoded time values → Extract to `config/index.ts`
- `console.log()` → Use `logger.info()`
- Copy-pasted code → DRY principle

**Security**
- Hardcoded secrets → Environment variables
- Missing input validation → Add Zod schemas
- Potential SQL injection → Use parameterized queries

**Scalability**
- N+1 queries → Use aggregation or populate
- Missing database indexes → Add for frequently queried fields
- No pagination on list endpoints → Add pagination

---

## 📋 Example Output

```
═══════════════════════════════════════════════════════════════════
          🎯 Senior Engineer Code Review Report
          Total Files: 109 | Issues Found: 12
═══════════════════════════════════════════════════════════════════

🔴 CRITICAL ISSUES (Fix Immediately) ─────────────── 3

  ❌ Import Order Violation
  📁 src/app.ts:35

  💬 Senior Engineer Says:
  "OpenTelemetry imported AFTER routes. This breaks your entire
   logging system. Move it BEFORE routes import."

  💥 Impact:
  This will break your entire logging system in production

  🔧 Fix:
  Move import to line 27 (before routes)

  📝 Before (WRONG):
  import router from './routes';
  import './app/logging/opentelemetry';  // ← TOO LATE

  📝 After (CORRECT):
  import './app/logging/opentelemetry';  // ← FIRST
  import router from './routes';

────────────────────────────────────────────────────────────

⚠️  ARCHITECTURE ISSUES (Fix Soon) ───────────── 4

  ⚠️  Direct Database Query in Service
  📁 src/app/modules/user/user.service.ts:49

  💬 Senior Engineer Says:
  "You're calling Model.find() directly in service. This should
   be a model static method. Why? Testability and reusability."

  🎓 Teaching Moment:
  Why? Model methods can be mocked in tests, services can't easily mock direct queries
  Benefits:
    - Testable (mock model method)
    - Reusable (other services can call)
    - Single source of truth

  📝 Before (WRONG):
  const users = await User.find({ status: 'active' });

  📝 After (CORRECT):
  // In user.model.ts:
  UserSchema.statics.findActiveUsers = function() {
    return this.find({ status: 'active' });
  };

  // In user.service.ts:
  const users = await User.findActiveUsers();

────────────────────────────────────────────────────────────

💡 OVER-ENGINEERING DETECTED ────────────── 1

  💡 Unnecessary Abstraction
  📁 src/app/helpers/userTypeFactory.ts:1-45

  💬 Senior Engineer Says:
  "You created a factory pattern for only 2 user types.
   You're solving a problem you don't have yet."

  🎓 Teaching Moment:
  Principle: YAGNI - You Aren't Gonna Need It
  When: Add Factory WHEN you have 5+ types or complex logic
  Why: Premature abstraction makes code harder to read and change

  💾 Impact: Removes 42 lines, increases readability

────────────────────────────────────────────────────────────

✅ GOOD PATTERNS FOUND ──────────────── 18

  ✅ Excellent Module Structure: bookmark
  📁 src/app/modules/bookmark/

  💬 Senior Engineer Says:
  "This is textbook architecture. Use this as template for new modules."

────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════
                            📊 SUMMARY
═══════════════════════════════════════════════════════════════════

  🔴 Critical:      3  (Fix immediately before deploy)
  ⚠️  Architecture:  4  (Fix in current sprint)
  💡 Over-eng:      1  (Simplify when you refactor)
  🟡 Quality:       4  (Improve in next sprint)
  ✅ Good patterns: 18 (Keep doing this!)

💬 Overall Assessment:

"Your codebase is solid. The critical issues are mostly import order
 (breaks logging) and missing validation (security risk).

 The over-engineering is minor - just a factory you don't need yet.

 Focus on: Fix critical issues → Add validation → Extract hardcoded values

 Good work on: Module structure, error handling, QueryBuilder usage

 Ship it after fixing the 3 critical issues. Everything else can wait."

═══════════════════════════════════════════════════════════════════
```

---

## 🔧 Usage

### Basic Usage

```bash
# Review all source code
node scripts/code-review/reviewer.js

# Verbose mode (show progress)
node scripts/code-review/reviewer.js --verbose
```

### Review Specific Files

```bash
# Single file
node scripts/code-review/reviewer.js --file src/app/modules/auth/auth.service.ts

# Specific module
node scripts/code-review/reviewer.js --module auth
```

### Filter by Severity

```bash
# Critical only
node scripts/code-review/reviewer.js --severity critical

# Critical + Architecture
node scripts/code-review/reviewer.js --severity critical,architecture

# All except quality issues
node scripts/code-review/reviewer.js --severity critical,architecture,over-engineering
```

### Output Formats

```bash
# Console (default, with colors)
node scripts/code-review/reviewer.js --format console

# JSON (for CI/CD)
node scripts/code-review/reviewer.js --format json

# JSON with pretty print
node scripts/code-review/reviewer.js --format json > report.json
```

### CI/CD Integration

```bash
# CI mode (exit 1 if critical issues found)
node scripts/code-review/reviewer.js --ci

# Combine with JSON output
node scripts/code-review/reviewer.js --format json --ci > report.json
```

---

## 🎓 Teaching Moments

The reviewer doesn't just flag issues - it **teaches you WHY**.

### Example: Service Layer Pattern

**❌ Bad:**
```typescript
export const getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  sendResponse(res, { data: user });
});
```

**✅ Good:**
```typescript
// In controller:
export const getUser = catchAsync(async (req, res) => {
  const user = await UserService.getUserById(req.params.id);
  sendResponse(res, { data: user });
});

// In service:
static async getUserById(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}
```

**💬 Why:**
- Controllers should be dumb routers
- Business logic belongs in services
- Services are easier to test
- Services can be reused

### Example: Premature Abstraction

**❌ Over-Engineered (45 lines):**
```typescript
class UserTypeFactory {
  static create(type) {
    switch(type) {
      case 'admin':
        return new AdminUser();
      case 'user':
        return new RegularUser();
      default:
        throw new Error('Invalid type');
    }
  }
}

const user = UserTypeFactory.create(userType);
```

**✅ Simple (3 lines):**
```typescript
const isAdmin = user.role === 'admin';
if (isAdmin) {
  // admin logic
} else {
  // user logic
}
```

**💬 When to use Factory:**
- You have 5+ user types
- Complex construction logic
- Need dependency injection

**Don't use it for 2 cases. YAGNI.**

### Example: Transaction Safety 🆕

**❌ Dangerous (No Transaction):**
```typescript
export const createOrderWithPayment = async (data) => {
  // Step 1: Create order
  const order = await Order.create({
    userId: data.userId,
    items: data.items,
    total: data.total
  });

  // Step 2: Create payment record
  const payment = await Payment.create({
    orderId: order._id,
    amount: data.total,
    status: 'PENDING'
  });

  // 🚨 Problem: What if payment.create() fails?
  // Order already created → Data inconsistency!

  return { order, payment };
};
```

**✅ Safe (With Transaction):**
```typescript
import { withTransaction } from '@/helpers/serviceHelpers';

export const createOrderWithPayment = async (data) => {
  return withTransaction(async (session) => {
    // Step 1: Create order (with session)
    const order = await Order.create([{
      userId: data.userId,
      items: data.items,
      total: data.total
    }], { session });

    // Step 2: Create payment record (with session)
    const payment = await Payment.create([{
      orderId: order[0]._id,
      amount: data.total,
      status: 'PENDING'
    }], { session });

    return { order: order[0], payment: payment[0] };
  }, {
    maxRetries: 3  // Retry transient errors
  });
  // ✅ If any step fails → automatic rollback!
  // All or nothing - ACID guaranteed
};
```

**💬 Why Transactions Matter:**
- **Atomicity**: All operations succeed or all fail (no partial state)
- **Consistency**: Data always in valid state
- **Isolation**: Concurrent operations don't interfere
- **Durability**: Committed data survives crashes

**Production Scenario Without Transaction:**
```
User clicks "Place Order"
→ Order created successfully ✅
→ Payment record fails (network issue) ❌
→ Result: Order exists, no payment record
→ User sees error, tries again
→ Creates duplicate order!
→ Customer support nightmare 😱
```

**With Transaction:**
```
User clicks "Place Order"
→ Transaction starts
→ Order created ✅
→ Payment record fails ❌
→ Automatic rollback!
→ Result: No order, no payment (consistent state)
→ User can safely retry ✅
```

**When to use `withTransaction()`:**
- Payment/money operations (ALWAYS)
- Multi-step database operations (2+ writes)
- Update operations in loops
- Any operation where partial failure = data corruption

---

## 🏗️ Architecture

```
scripts/code-review/
├── reviewer.js                 # Main CLI entry point
├── analyzers/
│   ├── critical-rules.js       # Import order, module pattern
│   ├── architecture.js         # Service layer, middleware order
│   ├── transaction-safety.js   # 🆕 Transaction & rollback handling
│   ├── over-engineering.js     # Premature abstraction, YAGNI
│   ├── readability.js          # Magic numbers, complexity
│   ├── maintainability.js      # DRY, hardcoded config
│   ├── security.js             # Validation, secrets
│   ├── scalability.js          # N+1 queries, indexes
│   └── pragmatism.js           # Context-aware rules
├── reporters/
│   ├── console-reporter.js     # Beautiful terminal output
│   └── json-reporter.js        # CI/CD integration
├── utils/
│   ├── file-scanner.js         # Recursive file discovery
│   └── pattern-matcher.js      # Code pattern detection (+ transaction patterns)
└── README.md
```

---

## 🤝 Integration with Existing Tools

This code reviewer **complements** existing tools:

| Tool | What It Does | Code Reviewer Adds |
|------|-------------|-------------------|
| **ESLint** | Syntax and formatting | Architecture patterns, pragmatism |
| **Prettier** | Code formatting | Readability beyond formatting |
| **TypeScript** | Type checking | Production experience, over-engineering detection |
| **SonarQube** | Code quality metrics | Senior engineer wisdom, teaching |

**Use together:**
```bash
# Run all checks
npm run lint && \
npm run type-check && \
node scripts/code-review/reviewer.js
```

---

## 💡 Tips & Best Practices

### 1. Run Before Every Commit

```bash
# Add to pre-commit hook
#!/bin/bash
node scripts/code-review/reviewer.js --severity critical --ci
```

### 2. Focus on Critical Issues First

```bash
# Quick pre-deploy check
node scripts/code-review/reviewer.js --severity critical
```

### 3. Use in Code Review Process

```bash
# Generate report for PR review
node scripts/code-review/reviewer.js --format json > review-$(git rev-parse --short HEAD).json
```

### 4. Track Progress Over Time

```bash
# Save reports
node scripts/code-review/reviewer.js --format json > reports/review-$(date +%Y%m%d).json

# Compare over time
```

### 5. Learn from Good Patterns

The reviewer highlights what you're doing RIGHT. Use those as templates for new code.

---

## 🔄 GitHub Actions Integration

**.github/workflows/code-review.yml:**
```yaml
name: Code Review

on: [push, pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Code Review
        run: node scripts/code-review/reviewer.js --ci --format json > review.json

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: code-review-report
          path: review.json

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('review.json', 'utf8'));

            const comment = `## 🎯 Code Review Results

            - 🔴 Critical: ${report.summary.critical}
            - ⚠️ Architecture: ${report.summary.architecture}
            - 💡 Over-engineering: ${report.summary.overEngineering}
            - 🟡 Quality: ${report.summary.quality}

            ${report.summary.critical > 0 ? '❌ Fix critical issues before merging' : '✅ No critical issues'}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

---

## 🆘 Troubleshooting

### "No files found to review"

Make sure you're running from project root:
```bash
cd /path/to/project
node scripts/code-review/reviewer.js
```

### Colors not showing in CI

Use `--ci` flag to disable colors:
```bash
node scripts/code-review/reviewer.js --ci
```

### Too many quality issues

Focus on critical first:
```bash
node scripts/code-review/reviewer.js --severity critical,architecture
```

---

## 🎉 Summary

You now have a code reviewer that thinks like a **top 1% senior engineer**:

✅ **Thorough** - Checks critical rules, architecture, quality, security, scalability
✅ **Practical** - Knows when to break rules, context-aware feedback
✅ **Pragmatic** - Focuses on shipping working code, not perfect code
✅ **Teaching** - Explains WHY, shows before/after, provides learning moments
✅ **Production-focused** - Flags issues that will crash in production
✅ **Celebrates success** - Highlights good patterns you should keep

**Philosophy**: Ship working code, not impressive code. Simple beats clever. Production-ready beats ideal.

---

**Happy Code Reviewing! 🚀**

Remember: The goal is not to write perfect code, but to write code that works reliably in production and is easy for your team to maintain.
