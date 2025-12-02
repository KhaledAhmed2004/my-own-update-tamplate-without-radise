# 🎯 সিনিয়র ইঞ্জিনিয়ার কোড রিভিউয়ার - সম্পূর্ণ বাংলা ডকুমেন্টেশন

এই টুলটি আপনার codebase কে **top 1% senior software engineer** এর মত review করে - যেভাবে একজন অভিজ্ঞ সিনিয়র ইঞ্জিনিয়ার production code review করেন।

**দর্শন**: Over-engineering avoid করা, production-ready code ensure করা যা readable, maintainable, secure এবং scalable।

---

## 📑 বিষয়সূচি

1. [সিস্টেম আর্কিটেকচার](#সিস্টেম-আর্কিটেকচার)
2. [Critical Rules Analyzer](#critical-rules-analyzer---জটিল-নিয়ম-বিশ্লেষক)
3. [Architecture Analyzer](#architecture-analyzer---আর্কিটেকচার-বিশ্লেষক)
4. [Over-Engineering Analyzer](#over-engineering-analyzer---অতিরিক্ত-ইঞ্জিনিয়ারিং-সনাক্তকারী)
5. [Readability Analyzer](#readability-analyzer---পঠনযোগ্যতা-বিশ্লেষক)
6. [Maintainability Analyzer](#maintainability-analyzer---রক্ষণাবেক্ষণযোগ্যতা-বিশ্লেষক)
7. [Security Analyzer](#security-analyzer---নিরাপত্তা-বিশ্লেষক)
8. [Scalability Analyzer](#scalability-analyzer---মাপযোগ্যতা-বিশ্লেষক)
9. [Pragmatism Analyzer](#pragmatism-analyzer---বাস্তবসম্মত-বিশ্লেষক)
10. [Reporter System](#reporter-system---রিপোর্ট-সিস্টেম)
11. [ব্যবহার পদ্ধতি](#ব্যবহার-পদ্ধতি)

---

## সিস্টেম আর্কিটেকচার

### ডিরেক্টরি স্ট্রাকচার

```
scripts/code-review/
├── reviewer.js                    # মূল CLI entry point
├── analyzers/                     # বিশ্লেষক মডিউল (৮টি)
│   ├── critical-rules.js          # Critical নিয়ম চেক
│   ├── architecture.js            # আর্কিটেকচার প্যাটার্ন
│   ├── over-engineering.js        # অপ্রয়োজনীয় জটিলতা
│   ├── readability.js             # কোডের পঠনযোগ্যতা
│   ├── maintainability.js         # রক্ষণাবেক্ষণযোগ্যতা
│   ├── security.js                # নিরাপত্তা সমস্যা
│   ├── scalability.js             # স্কেলেবিলিটি ইস্যু
│   └── pragmatism.js              # বাস্তবসম্মত পরামর্শ
├── reporters/                     # রিপোর্ট জেনারেটর
│   ├── console-reporter.js        # টার্মিনাল আউটপুট
│   └── json-reporter.js           # JSON রিপোর্ট
├── utils/                         # সহায়ক টুলস
│   ├── file-scanner.js            # ফাইল খুঁজে বের করা
│   └── pattern-matcher.js         # কোড প্যাটার্ন ডিটেক্ট
└── README.md                      # ইংরেজি ডকুমেন্টেশন
```

### কিভাবে কাজ করে

```
১. File Scanner
   ↓
   সব .ts এবং .js files খুঁজে বের করা

২. Analyzers (৮টি parallel চলে)
   ↓
   প্রতিটি analyzer নির্দিষ্ট সমস্যা খুঁজে

৩. Issue Collection
   ↓
   সব issues একসাথে জমা

৪. Reporter
   ↓
   সুন্দর রিপোর্ট তৈরি (Console/JSON)
```

---

## Critical Rules Analyzer - জটিল নিয়ম বিশ্লেষক

**ফাইল**: `analyzers/critical-rules.js`

এই analyzer এমন সব সমস্যা খুঁজে বের করে যেগুলো আপনার **production system ভেঙে দিতে পারে**।

### Rule ১: Import Order Enforcement

**কেন গুরুত্বপূর্ণ?**

আপনার প্রজেক্টে OpenTelemetry logging system আছে যেটা একটা **নির্দিষ্ট ক্রমে** load হতে হবে। ভুল ক্রমে load হলে পুরো logging system কাজ করবে না।

**সঠিক ক্রম**:

```typescript
// ১. প্রথমে: Mongoose metrics (models compile হওয়ার আগে)
import './app/logging/mongooseMetrics';

// ২. দ্বিতীয়: Auto-label (routes load হওয়ার আগে)
import './app/logging/autoLabelBootstrap';

// ৩. তৃতীয়: OpenTelemetry SDK
import './app/logging/opentelemetry';

// ৪. চতুর্থ: Third-party patches
import './app/logging/patchBcrypt';
import './app/logging/patchJWT';

// ৫. সবশেষে: Routes
import router from './routes';
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/critical-rules.js লাইন 26-95

checkImportOrder(files, rootDir) {
  // ১. app.ts file খুঁজে বের করা
  const appFile = files.find(f => f.name === 'app.ts' && f.relativeDir === 'src');

  // ২. সব import statements এর লাইন নাম্বার বের করা
  const imports = PatternMatcher.getImportOrder(content);

  // ৩. Critical imports এর লাইন নাম্বার চেক করা
  const found = {};
  for (const imp of imports) {
    if (imp.path.includes('mongooseMetrics')) {
      found.mongooseMetrics = imp.line;
    }
    if (imp.path.includes('routes')) {
      found.routes = imp.line;
    }
  }

  // ৪. যদি mongooseMetrics, routes এর পরে থাকে → Issue!
  if (found.mongooseMetrics > found.routes) {
    this.issues.push({
      severity: 'critical',
      message: 'mongooseMetrics imported AFTER routes',
      impact: 'This will break your entire logging system'
    });
  }
}
```

**Detection Algorithm**:

```
Step 1: app.ts file পড়া
Step 2: Regex দিয়ে সব import statements খুঁজে বের করা
        Pattern: /import\s+.*\s+from\s+['"](.+)['"]/
Step 3: প্রতিটি critical import এর line number রেকর্ড করা
Step 4: যদি order ভুল হয় → Critical Issue তৈরি করা
```

**উদাহরণ সমস্যা**:

```typescript
// ❌ ভুল - mongooseMetrics শেষে
import router from './routes';
import './app/logging/mongooseMetrics';  // ← দেরি হয়ে গেছে!

// ✅ সঠিক - mongooseMetrics প্রথমে
import './app/logging/mongooseMetrics';  // ← সময়মত
import router from './routes';
```

**Production-এ Impact**:

- Mongoose queries এর execution time track হবে না
- Database bottleneck খুঁজে পাবেন না
- Slow query optimization করতে পারবেন না
- **Result**: Production-এ performance issue debug করা impossible

---

### Rule ২: Module Pattern Compliance

**কেন গুরুত্বপূর্ণ?**

এই প্রজেক্টে প্রতিটি module এ **ঠিক ৬টি file** থাকতে হবে:

1. `{module}.interface.ts` - TypeScript types
2. `{module}.model.ts` - Mongoose schema
3. `{module}.controller.ts` - Request handlers
4. `{module}.service.ts` - Business logic
5. `{module}.route.ts` - Express routes
6. `{module}.validation.ts` - Zod schemas

**কীভাবে Detect করে?**

```javascript
// File: analyzers/critical-rules.js লাইন 97-157

checkModulePattern(rootDir) {
  // ১. modules directory খুঁজে বের করা
  const modulesDir = path.join(rootDir, 'src', 'app', 'modules');

  // ২. প্রতিটি module folder পড়া
  const modules = fs.readdirSync(modulesDir);

  for (const module of modules) {
    // ৩. ৬টি required file আছে কিনা চেক করা
    const required = [
      `${module}.interface.ts`,
      `${module}.model.ts`,
      `${module}.controller.ts`,
      `${module}.service.ts`,
      `${module}.route.ts`,
      `${module}.validation.ts`
    ];

    const missing = [];
    for (const file of required) {
      const fullPath = path.join(modulePath, file);
      if (!fs.existsSync(fullPath)) {
        missing.push(file);
      }
    }

    // ৪. যদি কোনো file missing থাকে → Critical Issue
    if (missing.length > 0) {
      this.issues.push({
        severity: 'critical',
        category: 'module-pattern',
        message: `Missing required files: ${missing.join(', ')}`,
        impact: 'Violates 6-file module pattern'
      });
    }
  }
}
```

**Detection Algorithm**:

```
Step 1: src/app/modules/ directory scan করা
Step 2: প্রতিটি subdirectory (module) এর জন্য:
        a) ৬টি required file name তৈরি করা
        b) fs.existsSync() দিয়ে চেক করা file আছে কিনা
        c) যদি কোনো file না থাকে → missing array-তে add করা
Step 3: যদি missing.length > 0 → Issue report করা
```

**কোন file missing হলে কি সমস্যা?**

| Missing File | Impact | Security Risk |
|-------------|--------|---------------|
| `.validation.ts` | ⚠️ **CRITICAL** | ✅ YES - No input validation |
| `.interface.ts` | 🟡 Medium | ❌ No - TypeScript will catch |
| `.service.ts` | ⚠️ High | ⚠️ Maybe - Logic in controller |
| `.controller.ts` | 🔴 Critical | ❌ Route won't work |
| `.route.ts` | 🔴 Critical | ❌ Endpoint not accessible |
| `.model.ts` | 🔴 Critical | ❌ Database won't work |

**সবচেয়ে বিপজ্জনক**: `.validation.ts` missing থাকলে - কারণ এটা **security vulnerability**।

**উদাহরণ**:

```
src/app/modules/user/
├── user.interface.ts   ✅
├── user.model.ts       ✅
├── user.controller.ts  ✅
├── user.service.ts     ✅
├── user.route.ts       ✅
└── user.validation.ts  ❌ MISSING!  ← Security risk!
```

---

### Rule ৩: Error Handling Pattern

**কেন গুরুত্বপূর্ণ?**

Express.js-এ async function থেকে error throw হলে সেটা automatically catch হয় না। আপনাকে **manually catch করতে হয়**। না করলে **server crash** হবে।

**সমাধান**: সব async controller `catchAsync()` দিয়ে wrap করতে হবে।

**কীভাবে Detect করে?**

```javascript
// File: analyzers/critical-rules.js লাইন 159-220

checkErrorHandling(files) {
  // ১. শুধু controller files filter করা
  const controllerFiles = files.filter(f =>
    f.name.endsWith('.controller.ts') || f.name.endsWith('.controller.js')
  );

  for (const file of controllerFiles) {
    const content = fs.readFileSync(file.path, 'utf8');
    const lines = content.split('\n');

    let hasAsyncFunction = false;
    let hasCatchAsync = false;

    // ২. Line by line চেক করা
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ৩. async function আছে কিনা খুঁজে বের করা
      if (line.includes('async') &&
          (line.includes('function') || line.includes('const'))) {
        hasAsyncFunction = true;

        // ৪. এর আগের ২ লাইনে catchAsync আছে কিনা দেখা
        const prevLines = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
        if (prevLines.includes('catchAsync')) {
          hasCatchAsync = true;
        }
      }
    }

    // ৫. যদি async function থাকে কিন্তু catchAsync না থাকে → Issue!
    if (hasAsyncFunction && !hasCatchAsync) {
      this.issues.push({
        severity: 'critical',
        message: 'Async controller without catchAsync wrapper',
        impact: 'Uncaught promise rejections will crash your server'
      });
    }
  }
}
```

**Detection Algorithm**:

```
Step 1: সব .controller.ts files খুঁজে বের করা
Step 2: প্রতিটি file এর জন্য:
        a) Line by line পড়া
        b) "async function" বা "async const" খুঁজে বের করা
        c) সেই line এর আগের ২ লাইনে "catchAsync" আছে কিনা চেক করা
        d) যদি async থাকে কিন্তু catchAsync না থাকে → Flag করা
Step 3: Issue report তৈরি করা
```

**কেন এটা Critical?**

```javascript
// ❌ BAD - Server crash করবে
export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id);  // যদি error হয় → 💥 CRASH
  res.json(user);
};

// ✅ GOOD - Error properly handled
export const getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);  // Error automatically caught
  sendResponse(res, { data: user });
});
```

**Production Scenario**:

```
১. User invalid ID দেয় → "63f5a1b2c3d4e5f6g7h8i9j0"
২. MongoDB error throw করে: "Cast to ObjectId failed"
৩. যদি catchAsync না থাকে → Unhandled Promise Rejection
৪. Node.js process crash করে
৫. সব users এর জন্য server down!
```

---

### Rule ৪: Generic Error vs ApiError

**কেন গুরুত্বপূর্ণ?**

Generic `Error()` throw করলে:
- HTTP status code থাকে না
- Proper JSON response format হয় না
- Client error vs server error distinguish করা যায় না

**সমাধান**: `ApiError(statusCode, message)` use করা।

**কীভাবে Detect করে?**

```javascript
// File: analyzers/critical-rules.js লাইন 192-220

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // "throw new Error(" pattern খুঁজে বের করা
  if (line.includes('throw new Error(')) {
    this.issues.push({
      severity: 'critical',
      category: 'error-handling',
      file: file.relativePath,
      line: i + 1,
      message: 'Using generic Error instead of ApiError',
      impact: 'Error won\'t be properly formatted for API response'
    });
  }
}
```

**Detection Pattern**:

```
Regex: /throw new Error\(/
Match: throw new Error('...')
Report: Line number + File path
```

**উদাহরণ**:

```typescript
// ❌ BAD - Generic Error
if (!user) {
  throw new Error('User not found');
  // Response: 500 Internal Server Error (ভুল!)
}

// ✅ GOOD - ApiError with status code
if (!user) {
  throw new ApiError(404, 'User not found');
  // Response: 404 Not Found (সঠিক!)
}
```

---

## Architecture Analyzer - আর্কিটেকচার বিশ্লেষক

**ফাইল**: `analyzers/architecture.js`

এই analyzer আপনার code এর **architectural patterns** চেক করে - যেমন service layer, middleware order, route flow।

### Rule ১: Service Layer Pattern

**কেন গুরুত্বপূর্ণ?**

**Thin Controller, Fat Service** principle:
- Controller: শুধু request/response handle করবে
- Service: সব business logic থাকবে
- Model: Database queries থাকবে

**ভুল Pattern**: Controller-এ direct database query

```typescript
// ❌ BAD - Controller-এ DB query
export const getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);  // ← ভুল!
  sendResponse(res, { data: user });
});
```

**সঠিক Pattern**: Service layer use করা

```typescript
// ✅ GOOD - Service layer
// Controller:
export const getUser = catchAsync(async (req, res) => {
  const user = await UserService.getUserById(req.params.id);
  sendResponse(res, { data: user });
});

// Service:
static async getUserById(id: string) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/architecture.js লাইন 21-70

checkServiceLayer(files) {
  // ১. Controller files খুঁজে বের করা
  const controllerFiles = files.filter(f => f.name.includes('.controller.'));

  for (const file of controllerFiles) {
    const content = fs.readFileSync(file.path, 'utf8');

    // ২. Direct DB queries খুঁজে বের করা
    const queries = PatternMatcher.findDirectQueries(content);

    // ৩. যদি controller-এ query পাওয়া যায় → Issue!
    if (queries.length > 0) {
      this.issues.push({
        severity: 'architecture',
        message: 'Controller has direct database query',
        impact: 'Violates thin controller pattern'
      });
    }
  }
}
```

**PatternMatcher.findDirectQueries() কীভাবে কাজ করে?**

```javascript
// File: utils/pattern-matcher.js লাইন 44-77

findDirectQueries(content) {
  const queries = [];
  const lines = content.split('\n');

  // Query patterns যেগুলো খুঁজতে হবে
  const queryPatterns = [
    /(\w+Model|\w+)\.(find|findOne|findById|create|updateOne|deleteOne)\(/g,
    /await\s+(\w+)\.(find|findOne|findById)/g
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of queryPatterns) {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        queries.push({
          line: i + 1,
          code: line.trim(),
          model: match[1],    // e.g., "User"
          method: match[2]    // e.g., "findById"
        });
      }
    }
  }

  return queries;
}
```

**Detection Patterns**:

```javascript
// Pattern 1: Model.method()
User.find()
User.findOne()
User.findById()
Task.create()
Post.updateOne()

// Pattern 2: await Model.method()
await User.find({ ... })
await User.findById(id)
```

**কেন এটা সমস্যা?**

```
❌ Controller-এ Direct Query থাকলে:
   1. Testing কঠিন (mock করা যায় না)
   2. Reusability নেই (অন্য controller থেকে use করা যায় না)
   3. Business logic scattered (একই logic বারবার লিখতে হয়)
   4. Error handling inconsistent (প্রতিবার আলাদা আলাদা)

✅ Service Layer থাকলে:
   1. Testing সহজ (service mock করা যায়)
   2. Reusable (যেকোনো জায়গা থেকে call করা যায়)
   3. Centralized logic (একই জায়গায় সব logic)
   4. Consistent error handling (একবার লিখলেই হয়)
```

---

### Rule ২: Service-এ Direct Query vs Model Method

**কেন Model Method ব্যবহার করা উচিত?**

Service-এ direct query থাকতে পারে, কিন্তু **model static method** হলে আরও ভালো।

**উদাহরণ**:

```typescript
// ❌ সরাসরি Service-এ query (কাজ করবে, কিন্তু best practice না)
static async getActiveUsers() {
  return await User.find({ status: 'active' });
}

// ✅ Model static method (Best practice)
// user.model.ts:
UserSchema.statics.findActiveUsers = function() {
  return this.find({ status: 'active' });
};

// user.service.ts:
static async getActiveUsers() {
  return await User.findActiveUsers();
}
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/architecture.js লাইন 25-47

const serviceFiles = files.filter(f => f.name.includes('.service.'));

for (const file of serviceFiles) {
  const content = fs.readFileSync(file.path, 'utf8');
  const queries = PatternMatcher.findDirectQueries(content);

  for (const query of queries) {
    // শুধু simple CRUD methods flag করা
    if (['find', 'findOne', 'findById'].includes(query.method)) {
      this.issues.push({
        severity: 'architecture',
        category: 'service-layer',
        message: `Direct ${query.method}() call in service`,
        impact: 'Reduces testability and reusability',
        fix: `Create ${query.model}.${query.method}Static() model method`
      });
    }
  }
}
```

**কেন এটা ভালো Practice?**

```
Model Static Method এর সুবিধা:

1. Testing:
   // Test-এ mock করা সহজ
   jest.spyOn(User, 'findActiveUsers').mockResolvedValue([...]);

2. Reusability:
   // যেকোনো service থেকে call করা যায়
   const users = await User.findActiveUsers();

3. Single Source of Truth:
   // Logic শুধু এক জায়গায়
   // Change করতে হলে শুধু model-এ change করলেই হবে

4. Query Optimization:
   // Model method-এ complex query logic রাখা যায়
   UserSchema.statics.findActiveUsers = function() {
     return this.find({ status: 'active' })
       .select('-password')  // Password exclude
       .sort({ createdAt: -1 });  // Latest first
   };
```

---

### Rule ৩: Middleware Order

**কেন Middleware Order গুরুত্বপূর্ণ?**

Middleware যে **order-এ** থাকবে:

```typescript
router.post(
  '/',
  auth(),              // ১. প্রথমে: Authentication
  fileHandler(),       // ২. দ্বিতীয়: File upload
  validateRequest(),   // ৩. তৃতীয়: Input validation
  Controller.create    // ৪. সবশেষে: Controller
);
```

**ভুল Order**: `validateRequest` → `auth` (Resource waste!)

```typescript
// ❌ BAD - Validation আগে
router.post(
  '/',
  validateRequest(Schema),  // ১. আগে validate করছে
  auth(),                    // ২. পরে auth check
  Controller.create
);

// কেন সমস্যা?
// Hacker malicious input পাঠাবে → Validation চলবে → CPU waste
// তারপর auth check → Unauthorized!
// Result: Resource waste করে দিল হ্যাকার
```

**সঠিক Order**: `auth` → `validateRequest` (Efficient!)

```typescript
// ✅ GOOD - Auth আগে
router.post(
  '/',
  auth(),                    // ১. প্রথমে check: Authorized কিনা?
  validateRequest(Schema),   // ২. Authorized হলে validate
  Controller.create
);

// কেন ভালো?
// Unauthorized হলে immediately reject → No CPU waste
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/architecture.js লাইন 72-120

checkMiddlewareOrder(files) {
  const routeFiles = files.filter(f => f.name.includes('.route.'));

  for (const file of routeFiles) {
    const content = fs.readFileSync(file.path, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // POST/PUT/PATCH route খুঁজে বের করা
      if (line.includes('.post(') || line.includes('.put(')) {
        let authLine = -1;
        let validateLine = -1;

        // পরবর্তী ১০ লাইনে auth এবং validateRequest খুঁজে বের করা
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].includes('auth(')) authLine = j;
          if (lines[j].includes('validateRequest')) validateLine = j;
        }

        // যদি validateRequest, auth এর আগে থাকে → Issue!
        if (validateLine > 0 && authLine > 0 && validateLine < authLine) {
          this.issues.push({
            severity: 'architecture',
            category: 'middleware-order',
            message: 'validateRequest before auth()',
            impact: 'Wastes resources validating malicious input',
            seniorSays: 'Validate AFTER auth. Why parse malicious input before checking if they\'re even allowed?'
          });
        }
      }
    }
  }
}
```

**Detection Algorithm**:

```
Step 1: সব .route.ts files scan করা
Step 2: POST/PUT/PATCH routes খুঁজে বের করা
Step 3: সেই route এর পরবর্তী ১০ লাইনে:
        a) auth() এর line number খুঁজে বের করা
        b) validateRequest() এর line number খুঁজে বের করা
Step 4: যদি validateLine < authLine → Wrong order!
Step 5: Issue report করা
```

**Production Impact**:

```
Scenario: DDoS Attack

❌ Wrong Order (validate → auth):
   - Hacker 10,000 requests পাঠায় malicious input দিয়ে
   - Server সব requests validate করতে থাকে
   - CPU 100% হয়ে যায়
   - Auth check করার আগেই server slow
   - Result: Server down / Very slow

✅ Correct Order (auth → validate):
   - Hacker 10,000 requests পাঠায়
   - Server immediately reject (no auth token)
   - CPU impact: Minimal
   - Result: Server safe!
```

---

### Rule ৪: Missing Validation on Routes

**কেন গুরুত্বপূর্ণ?**

**সব POST/PUT/PATCH routes-এ `validateRequest()` থাকতে হবে।**

কারণ:
- User input কখনো trust করা যায় না
- SQL injection, XSS attack হতে পারে
- Invalid data database-এ যেতে পারে

**উদাহরণ**:

```typescript
// ❌ DANGEROUS - কোনো validation নেই!
router.post('/create', UserController.createUser);

// User যেকোনো input পাঠাতে পারবে:
{
  "name": "<script>alert('XSS')</script>",
  "email": "not-an-email",
  "age": "abc",
  "role": "admin"  // Escalate to admin!
}

// ✅ SAFE - Validation আছে
router.post(
  '/create',
  validateRequest(UserValidation.createUser),  // ← এটা protect করে
  UserController.createUser
);
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/architecture.js লাইন 122-145

checkRouteFlow(files) {
  const routeFiles = files.filter(f => f.name.includes('.route.'));

  for (const file of routeFiles) {
    const content = fs.readFileSync(file.path, 'utf8');

    // Pattern Matcher দিয়ে missing validation খুঁজে বের করা
    const missingValidation = PatternMatcher.findMissingValidation(content);

    for (const issue of missingValidation) {
      this.issues.push({
        severity: 'architecture',
        category: 'route-flow',
        message: 'POST/PUT route without validateRequest()',
        impact: 'Data entry point without schema validation',
        seniorSays: 'This route accepts ANY input. That\'s a SQL injection waiting to happen.'
      });
    }
  }
}
```

**PatternMatcher.findMissingValidation() বিস্তারিত**:

```javascript
// File: utils/pattern-matcher.js লাইন 157-188

findMissingValidation(content) {
  const issues = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // POST/PUT/PATCH route detect করা
    if ((line.includes('.post(') ||
         line.includes('.put(') ||
         line.includes('.patch(')) &&
        !line.includes('validateRequest')) {

      // পরবর্তী ৫ লাইনে validateRequest আছে কিনা দেখা
      let hasValidation = false;
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes('validateRequest')) {
          hasValidation = true;
          break;
        }
      }

      // যদি না থাকে → Issue report করা
      if (!hasValidation) {
        issues.push({
          line: i + 1,
          code: line.trim()
        });
      }
    }
  }

  return issues;
}
```

**Detection Logic**:

```
Step 1: Line scan করা
Step 2: যদি line-এ থাকে:
        - .post( অথবা
        - .put( অথবা
        - .patch(
        এবং সেই line-এ 'validateRequest' নেই
Step 3: পরবর্তী ৫ লাইন চেক করা
        (কারণ multiline route definition থাকতে পারে)
Step 4: যদি ৫ লাইনেও 'validateRequest' না পাওয়া যায়
        → Missing validation!
```

**Real-world Attack Scenario**:

```
১. হ্যাকার discover করে: POST /api/v1/users route-এ validation নেই

২. Malicious request পাঠায়:
   POST /api/v1/users
   {
     "name": "'; DROP TABLE users; --",
     "email": "<script>document.cookie</script>",
     "role": "admin"
   }

৩. যদি validation না থাকে:
   - SQL injection হতে পারে
   - XSS attack হতে পারে
   - Privilege escalation হতে পারে

৪. যদি validation থাকে (Zod schema):
   const createUserSchema = z.object({
     name: z.string().min(1).max(50),
     email: z.string().email(),
     role: z.enum(['user'])  // admin allow করবে না!
   });

   → Request automatically rejected!
```

---

## Over-Engineering Analyzer - অতিরিক্ত ইঞ্জিনিয়ারিং সনাক্তকারী

**ফাইল**: `analyzers/over-engineering.js`

এই analyzer খুঁজে বের করে যেখানে আপনি **অপ্রয়োজনীয় জটিল code** লিখেছেন।

**Philosophy**: YAGNI - You Aren't Gonna Need It

### Rule ১: Premature Abstraction Detection

**কেন এটা সমস্যা?**

যখন আপনি **২টা case এর জন্য Factory pattern** use করেন - এটা over-engineering!

**উদাহরণ**:

```typescript
// ❌ OVER-ENGINEERED - 45 lines for 2 types!
class UserTypeFactory {
  static create(type: string): IUser {
    switch(type) {
      case 'admin':
        return new AdminUser();
      case 'user':
        return new RegularUser();
      default:
        throw new Error('Invalid user type');
    }
  }
}

class AdminUser implements IUser {
  constructor() {
    // 15 lines of code
  }
}

class RegularUser implements IUser {
  constructor() {
    // 15 lines of code
  }
}

// Usage (Complex!)
const user = UserTypeFactory.create(userType);

// ✅ SIMPLE - 3 lines!
const isAdmin = user.role === 'admin';

if (isAdmin) {
  // Admin logic
} else {
  // User logic
}
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/over-engineering.js লাইন 21-55

checkPrematureAbstraction(files) {
  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');

    // PatternMatcher দিয়ে abstraction patterns খুঁজে বের করা
    const abstractions = PatternMatcher.findPrematureAbstraction(content);

    for (const abstraction of abstractions) {
      this.issues.push({
        severity: 'over-engineering',
        category: 'premature-abstraction',
        message: `${abstraction.pattern} pattern for only ${abstraction.cases} case(s)`,
        impact: `${abstraction.pattern === 'Factory' ? '45' : '30'} lines of unnecessary complexity`,
        seniorSays: `You're solving a problem you don't have yet. Start simple.`
      });
    }
  }
}
```

**PatternMatcher.findPrematureAbstraction() বিস্তারিত**:

```javascript
// File: utils/pattern-matcher.js লাইন 213-252

findPrematureAbstraction(content) {
  const issues = [];
  const lines = content.split('\n');

  // প্যাটার্ন খুঁজে বের করা
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // যদি Factory, Builder, Strategy, Adapter শব্দ থাকে
    if (line.includes('Factory') ||
        line.includes('Builder') ||
        line.includes('Strategy') ||
        line.includes('Adapter')) {

      // কতগুলো cases handle করে সেটা count করা
      let caseCount = 0;

      // পরবর্তী ৫০ লাইনে case বা if statement count করা
      for (let j = i; j < Math.min(i + 50, lines.length); j++) {
        if (lines[j].includes('case ') ||
            lines[j].includes('if (type ===')) {
          caseCount++;
        }
      }

      // যদি ২ বা তার কম cases থাকে → Over-engineering!
      if (caseCount <= 2) {
        issues.push({
          line: i + 1,
          pattern: line.includes('Factory') ? 'Factory' :
                   line.includes('Builder') ? 'Builder' : 'Strategy',
          cases: caseCount
        });
      }
    }
  }

  return issues;
}
```

**Detection Algorithm**:

```
Step 1: File line by line scan করা
Step 2: যদি কোনো line-এ থাকে:
        - "Factory" অথবা
        - "Builder" অথবা
        - "Strategy" অথবা
        - "Adapter"
Step 3: সেই line থেকে পরবর্তী ৫০ লাইন চেক করা
Step 4: Count করা কতগুলো "case" বা "if (type ===" আছে
Step 5: যদি cases <= 2 → Over-engineered!
```

**কখন এই Patterns ব্যবহার করা উচিত?**

| Pattern | Use When | Don't Use When |
|---------|----------|----------------|
| **Factory** | 5+ types, complex construction | 2-3 simple types |
| **Builder** | 10+ properties, optional params | 2-3 properties |
| **Strategy** | 5+ algorithms, runtime selection | 2 simple conditions |
| **Adapter** | Multiple external APIs | Single API |

**Real Example from Your Codebase**:

```typescript
// যদি এরকম পাওয়া যায়:
class PaymentTypeFactory {
  static create(type: string) {
    switch(type) {
      case 'stripe':
        return new StripeAdapter();
      case 'paypal':
        return new PaypalAdapter();
    }
  }
}

// Senior Engineer Says:
"২টা payment method এর জন্য Factory?
 শুধু if-else use করো।
 যখন ৫টা payment method হবে তখন Factory বানাবে।"

// Better:
const adapter = type === 'stripe' ? new StripeAdapter() : new PaypalAdapter();
```

---

### Rule ২: Unnecessary Patterns

এছাড়াও অন্যান্য unnecessary patterns detect করা হয়:

#### Singleton Pattern (যেখানে প্রয়োজন নেই)

```javascript
// ❌ UNNECESSARY - JavaScript modules already singletons!
class DatabaseSingleton {
  private static instance: DatabaseSingleton;

  static getInstance() {
    if (!this.instance) {
      this.instance = new DatabaseSingleton();
    }
    return this.instance;
  }
}

// ✅ SIMPLE - Just export!
const db = createConnection();
export default db;
```

**Detection**:

```javascript
// File: analyzers/over-engineering.js লাইন 57-80

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('class') && lines[i].includes('Singleton')) {
    this.issues.push({
      severity: 'over-engineering',
      message: 'Singleton pattern where simple module export works',
      seniorSays: 'JavaScript modules are already singletons. You don\'t need this.'
    });
  }
}
```

#### Builder Pattern for Simple Objects

```typescript
// ❌ OVER-KILL - Builder for 3 properties!
const user = new UserBuilder()
  .setName('John')
  .setEmail('john@example.com')
  .setAge(25)
  .build();

// ✅ SIMPLE - Object literal!
const user = {
  name: 'John',
  email: 'john@example.com',
  age: 25
};
```

**Detection**:

```javascript
// File: analyzers/over-engineering.js লাইন 82-108

if (lines[i].includes('class') && lines[i].includes('Builder')) {
  // Property count করা
  let propertyCount = 0;
  for (let j = i; j < Math.min(i + 30, lines.length); j++) {
    if (lines[j].includes('this.') && lines[j].includes('=')) {
      propertyCount++;
    }
  }

  // যদি ৩ বা কম properties → Over-engineered!
  if (propertyCount <= 3) {
    this.issues.push({
      severity: 'over-engineering',
      message: `Builder pattern for object with only ${propertyCount} properties`
    });
  }
}
```

#### Feature Flag System (১টা Flag এর জন্য!)

```typescript
// ❌ OVER-KILL - Infrastructure for 1 flag!
const featureFlags = {
  NEW_UI: process.env.FEATURE_NEW_UI === 'true'
};

if (featureFlags.NEW_UI) {
  // new code
} else {
  // old code
}

// ✅ SIMPLE - Just delete old code!
// new code (remove old code completely)
```

**Detection**:

```javascript
// File: analyzers/over-engineering.js লাইন 110-129

if (file.name.includes('feature') || file.name.includes('flag')) {
  let flagCount = 0;

  for (const line of lines) {
    if (line.includes('FEATURE_') || line.includes('FLAG_')) {
      flagCount++;
    }
  }

  if (flagCount === 1) {
    this.issues.push({
      severity: 'over-engineering',
      message: 'Feature flag system with only 1 flag',
      seniorSays: 'Just delete the old code. Version control is your feature flag.'
    });
  }
}
```

---

## Readability Analyzer - পঠনযোগ্যতা বিশ্লেষক

**ফাইল**: `analyzers/readability.js`

এই analyzer এমন code খুঁজে বের করে যা **পড়তে কঠিন** বা **বুঝতে সময় লাগে**।

### Rule ১: Magic Numbers

**কি সমস্যা?**

Code-এ সরাসরি number লিখলে সেটার meaning বোঝা যায় না।

```typescript
// ❌ BAD - What's 3600000?
setTimeout(callback, 3600000);

// ✅ GOOD - Ah, 1 hour!
const ONE_HOUR_MS = 60 * 60 * 1000;
setTimeout(callback, ONE_HOUR_MS);
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/readability.js লাইন 12-35

analyze(files) {
  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');

    // Hardcoded numbers খুঁজে বের করা
    const hardcoded = PatternMatcher.findHardcodedValues(content);

    for (const item of hardcoded) {
      // যদি number type হয় এবং ১০০ এর বেশি হয়
      if (item.type === 'number' && parseInt(item.value) > 100) {
        this.issues.push({
          severity: 'readability',
          category: 'magic-number',
          message: `Magic number: ${item.value}`,
          seniorSays: `What's ${item.value}? Name it properly.`
        });
      }
    }
  }
}
```

**PatternMatcher.findHardcodedValues() বিস্তারিত**:

```javascript
// File: utils/pattern-matcher.js লাইন 79-128

findHardcodedValues(content) {
  const hardcoded = [];
  const lines = content.split('\n');

  // Patterns for different types
  const patterns = {
    time: /(\d+)\s*\*\s*(\d+)/g,        // 3 * 60000
    numbers: /:\s*(\d{4,})/g,            // : 3600000 (4+ digits)
    strings: /(password|secret|key):\s*['"](.+?)['"]/gi,
    urls: /(http:\/\/|https:\/\/)[\w.-]+/g
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      continue;
    }

    // Check numbers pattern
    const numberMatches = line.matchAll(patterns.numbers);
    for (const match of numberMatches) {
      hardcoded.push({
        line: i + 1,
        type: 'number',
        code: line.trim(),
        value: match[1]
      });
    }
  }

  return hardcoded;
}
```

**Detection Patterns**:

```
Pattern 1: Time calculations
Regex: /(\d+)\s*\*\s*(\d+)/g
Match: "3 * 60000" → Flag if >= 1000

Pattern 2: Large numbers
Regex: /:\s*(\d{4,})/g
Match: "maxRetries: 3600000" → Flag if > 100

Examples:
✅ OK:  maxRetries: 3
✅ OK:  timeout: 500
❌ BAD: timeout: 3600000  ← What's this?
❌ BAD: limit: 999999     ← Magic number!
```

---

### Rule ২: Clever Code Detection

**কি সমস্যা?**

"Clever" code মানে এমন code যেটা **পড়তে ৫ মিনিট** লাগে।

**উদাহরণ**:

```typescript
// ❌ CLEVER (BAD!) - Takes 5 min to understand
const result = items
  .filter(x => x.status === 'active')
  .map(x => ({ ...x, price: x.price * 1.1 }))
  .reduce((acc, x) => acc + x.price, 0);

// ✅ BORING (GOOD!) - Obvious at first glance
const activeItems = items.filter(item => item.status === 'active');
const itemsWithTax = activeItems.map(item => ({
  ...item,
  price: item.price * 1.1  // 10% tax
}));
const totalPrice = itemsWithTax.reduce((total, item) => total + item.price, 0);
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/readability.js লাইন 37-61

const clever = PatternMatcher.findCleverCode(content);

for (const item of clever) {
  this.issues.push({
    severity: 'readability',
    category: 'clever-code',
    message: `${item.type}: Takes 5min to understand`,
    seniorSays: 'Clever code is BAD code. Write boring, obvious code.'
  });
}
```

**PatternMatcher.findCleverCode() বিস্তারিত**:

```javascript
// File: utils/pattern-matcher.js লাইন 254-300

findCleverCode(content) {
  const issues = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip comments
    if (line.startsWith('//') || line.startsWith('*') || !line) {
      continue;
    }

    // ১. Nested ternaries খুঁজে বের করা
    const ternaryCount = (line.match(/\?/g) || []).length;
    if (ternaryCount >= 2) {
      issues.push({
        line: i + 1,
        type: 'nested-ternary',
        code: line
      });
    }

    // ২. Long method chains খুঁজে বের করা (5+ chains)
    const chainCount = (line.match(/\./g) || []).length;
    if (chainCount >= 5) {
      issues.push({
        line: i + 1,
        type: 'long-chain',
        code: line
      });
    }

    // ৩. Complex regex খুঁজে বের করা
    if (line.includes('RegExp') || line.includes('/') &&
        line.length > 80 && line.includes('[') && line.includes('+')) {
      issues.push({
        line: i + 1,
        type: 'complex-regex',
        code: line
      });
    }
  }

  return issues;
}
```

**Detection Patterns**:

```
১. Nested Ternary:
   Pattern: Count "?" symbols
   Threshold: >= 2
   Example: const x = a ? b ? c : d : e;

২. Long Method Chain:
   Pattern: Count "." symbols
   Threshold: >= 5
   Example: obj.method1().method2().method3().method4().method5()

৩. Complex Regex:
   Pattern: Line length > 80 AND contains RegExp/[]/+
   Example: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
```

**সঠিক পদ্ধতি**:

```typescript
// ❌ Nested ternary (Clever!)
const status = user
  ? user.isActive
    ? user.isPremium
      ? 'premium'
      : 'active'
    : 'inactive'
  : 'guest';

// ✅ If-else (Boring but clear!)
let status;
if (!user) {
  status = 'guest';
} else if (!user.isActive) {
  status = 'inactive';
} else if (user.isPremium) {
  status = 'premium';
} else {
  status = 'active';
}
```

---

## Maintainability Analyzer - রক্ষণাবেক্ষণযোগ্যতা বিশ্লেষক

**ফাইল**: `analyzers/maintainability.js`

এই analyzer এমন সমস্যা খুঁজে বের করে যেগুলো **ভবিষ্যতে maintain করা কঠিন** করবে।

### Rule ১: Hardcoded Configuration Values

**কি সমস্যা?**

Config values code-এ hardcode করলে:
- পরিবর্তন করতে অনেক জায়গায় edit করতে হয়
- Environment-specific values handle করা যায় না
- Testing এ problem হয়

**উদাহরণ**:

```typescript
// ❌ BAD - Hardcoded in 12 different files!
const otpExpiry = new Date(Date.now() + 3 * 60000);  // 3 minutes

// PM বলল: "5 minutes করো"
// তোমাকে 12টা file edit করতে হবে! 😰

// ✅ GOOD - Config-এ একবার define
// config/index.ts:
OTP_EXPIRY_MS: 3 * 60 * 1000,

// Code-এ use:
const otpExpiry = new Date(Date.now() + config.OTP_EXPIRY_MS);

// PM বলল: "5 minutes করো"
// শুধু config file edit করো! ✅
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/maintainability.js লাইন 12-37

analyze(files) {
  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');

    // Hardcoded values খুঁজে বের করা
    const hardcoded = PatternMatcher.findHardcodedValues(content);

    for (const item of hardcoded) {
      if (item.type === 'time') {
        this.issues.push({
          severity: 'maintainability',
          category: 'hardcoded-config',
          message: `Hardcoded time value: ${item.value}`,
          impact: 'PM changes requirement? Edit 12 files instead of 1',
          seniorSays: 'Extract this to config. When PM asks to change from 3min to 5min, you\'ll edit 1 file, not 12.'
        });
      }
    }
  }
}
```

**Hardcoded Time Values Detection**:

```javascript
// File: utils/pattern-matcher.js লাইন 98-108

// Pattern for time calculations
const timePattern = /(\d+)\s*\*\s*(\d+)/g;

const timeMatches = line.matchAll(timePattern);
for (const match of timeMatches) {
  // যদি multiplication করা হয় >= 60 বা >= 1000
  if (parseInt(match[1]) >= 60 || parseInt(match[2]) >= 1000) {
    hardcoded.push({
      line: i + 1,
      type: 'time',
      value: match[0]  // e.g., "3 * 60000"
    });
  }
}
```

**Detection Examples**:

```typescript
// ❌ Detected as hardcoded time:
3 * 60000          // 3 minutes in ms
5 * 60 * 1000      // 5 minutes in ms
24 * 60 * 60 * 1000  // 24 hours in ms

// ✅ Should be:
config.OTP_EXPIRY_MS
config.SESSION_TIMEOUT_MS
config.TOKEN_EXPIRY_MS
```

---

### Rule ২: Console.log Usage

**কি সমস্যা?**

`console.log()` production-এ কাজ করে না:
- Log file-এ save হয় না
- Log level নেই (info/warn/error)
- Production debug করা impossible

**উদাহরণ**:

```typescript
// ❌ BAD - Production-এ কোনো কাজে আসবে না
console.log('Sending email to:', user.email);

// Production crash করলে log কোথায়? 🤷‍♂️

// ✅ GOOD - Logger use করো
logger.info('Sending email to:', user.email);

// Production-এ file-এ save হবে, search করা যাবে!
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/maintainability.js লাইন 39-53

// Console.log খুঁজে বের করা
const logs = PatternMatcher.findConsoleLogs(content);

for (const log of logs) {
  this.issues.push({
    severity: 'maintainability',
    category: 'logging',
    message: 'Using console.log instead of logger',
    impact: 'Won\'t help in production when server crashes',
    seniorSays: 'Use logger. Console.log won\'t help in production.'
  });
}
```

**PatternMatcher.findConsoleLogs()**:

```javascript
// File: utils/pattern-matcher.js লাইন 145-160

findConsoleLogs(content) {
  const logs = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // console.log বা console.error খুঁজে বের করা
    if (line.includes('console.log') || line.includes('console.error')) {
      logs.push({
        line: i + 1,
        code: line.trim()
      });
    }
  }

  return logs;
}
```

**Detection Pattern**:

```
Simple string matching:
  - "console.log" found → Issue
  - "console.error" found → Issue
  - "console.warn" found → Issue

Ignores:
  - Comments (// console.log)
  - Commented code (/* console.log */)
```

---

## Security Analyzer - নিরাপত্তা বিশ্লেষক

**ফাইল**: `analyzers/security.js`

এই analyzer **security vulnerabilities** খুঁজে বের করে।

### Rule ১: Missing Input Validation

**কি সমস্যা?**

User input validate না করলে:
- SQL injection
- XSS attack
- Data corruption
- Privilege escalation

সব হতে পারে!

**উদাহরণ**:

```typescript
// ❌ CRITICAL SECURITY RISK!
router.post('/create', UserController.createUser);

// Hacker পাঠাবে:
{
  "name": "'; DROP TABLE users; --",
  "role": "admin"
}

// ✅ SAFE
router.post(
  '/create',
  validateRequest(UserValidation.createUser),  // ← Security!
  UserController.createUser
);
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/security.js লাইন 15-41

checkValidation(files) {
  const routeFiles = files.filter(f => f.name.includes('.route.'));

  for (const file of routeFiles) {
    const content = fs.readFileSync(file.path, 'utf8');

    // Missing validation খুঁজে বের করা
    const missing = PatternMatcher.findMissingValidation(content);

    for (const issue of missing) {
      this.issues.push({
        severity: 'security',
        category: 'missing-validation',
        message: 'Data entry route without validation',
        impact: 'Potential SQL injection, XSS, or data corruption',
        seniorSays: 'This route accepts ANY input. That\'s a security vulnerability.',
        cve: 'Similar to CVE-2021-3129 (unvalidated input)'
      });
    }
  }
}
```

**Real Attack Scenarios**:

```
Scenario 1: SQL Injection
  POST /api/v1/users
  { "email": "test@example.com'; DROP TABLE users; --" }
  → Without validation: Database destroyed!

Scenario 2: XSS Attack
  POST /api/v1/posts
  { "content": "<script>steal(document.cookie)</script>" }
  → Without validation: Cookie stolen!

Scenario 3: Privilege Escalation
  POST /api/v1/users
  { "role": "admin" }
  → Without validation: Normal user becomes admin!

Scenario 4: Data Corruption
  POST /api/v1/orders
  { "price": -1000 }
  → Without validation: Negative price in database!
```

---

### Rule ২: Hardcoded Secrets

**কি সমস্যা?**

Secret values code-এ রাখলে:
- GitHub-এ public হয়ে যায়
- Anyone access করতে পারে
- Rotate করা impossible

**উদাহরণ**:

```typescript
// ❌ CRITICAL - Secret exposed!
const apiKey = 'sk_live_123abc456def';
const jwtSecret = 'my-super-secret-key';

// This goes to GitHub → Anyone can see! 🚨

// ✅ SAFE - Environment variable
const apiKey = process.env.STRIPE_SECRET_KEY;
const jwtSecret = process.env.JWT_SECRET;
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/security.js লাইন 43-67

checkHardcodedSecrets(files) {
  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');
    const hardcoded = PatternMatcher.findHardcodedValues(content);

    for (const item of hardcoded) {
      if (item.type === 'secret') {
        this.issues.push({
          severity: 'security',
          category: 'hardcoded-secret',
          message: `Hardcoded ${item.key}: "${item.value}"`,
          impact: 'CRITICAL: Secret exposed in code repository',
          seniorSays: 'Hardcoded secrets? That\'s a critical security vulnerability.',
          cwe: 'CWE-798: Use of Hard-coded Credentials'
        });
      }
    }
  }
}
```

**PatternMatcher Secret Detection**:

```javascript
// File: utils/pattern-matcher.js লাইন 110-125

// Pattern for secrets
const secretPattern = /(password|secret|key|token):\s*['"](.+?)['"]/gi;

const secretMatches = line.matchAll(secretPattern);
for (const match of secretMatches) {
  // যদি value length > 5 এবং process.env না থাকে
  if (match[2].length > 5 && !match[2].includes('process.env')) {
    hardcoded.push({
      line: i + 1,
      type: 'secret',
      key: match[1],      // e.g., "password"
      value: match[2]     // e.g., "admin123"
    });
  }
}
```

**Detection Patterns**:

```typescript
// ❌ Detected as hardcoded secret:
password: "admin123"
apiKey: "sk_live_abc123"
jwtSecret: "my-secret-key"
stripeKey: "pk_test_xyz789"

// ✅ Not flagged (using env vars):
password: process.env.ADMIN_PASSWORD
apiKey: process.env.STRIPE_KEY
jwtSecret: process.env.JWT_SECRET
```

**CWE Reference**: CWE-798 - Use of Hard-coded Credentials

---

## Scalability Analyzer - মাপযোগ্যতা বিশ্লেষক

**ফাইল**: `analyzers/scalability.js`

এই analyzer এমন সমস্যা খুঁজে বের করে যেগুলো **production-এ scale করবে না**।

### Rule ১: N+1 Query Detection

**কি সমস্যা?**

N+1 query মানে **loop এর ভিতরে database query**।

**উদাহরণ**:

```typescript
// ❌ N+1 Query - 500 users = 501 queries! 💥
const users = await User.find();  // 1 query

for (const user of users) {
  const tasks = await Task.find({ userId: user.id });  // 500 queries!
  user.tasks = tasks;
}
// Total: 1 + 500 = 501 queries

// Production-এ 10,000 users থাকলে?
// 10,001 queries → Server crash! 💀

// ✅ Single Query - Always 1 query! ✅
const usersWithTasks = await User.aggregate([
  {
    $lookup: {
      from: 'tasks',
      localField: '_id',
      foreignField: 'userId',
      as: 'tasks'
    }
  }
]);
// Total: Just 1 query!
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/scalability.js লাইন 12-43

analyze(files) {
  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');

    // N+1 queries খুঁজে বের করা
    const n1Issues = PatternMatcher.findN1Queries(content);

    for (const issue of n1Issues) {
      this.issues.push({
        severity: 'scalability',
        category: 'n+1-query',
        message: 'Potential N+1 query pattern',
        impact: 'This N+1 query will crash production with 500+ users',
        seniorSays: 'This N+1 query will crash production with 500+ users. Use aggregation or populate.',
        loopCode: issue.loopLine,
        queryCode: issue.queryCode
      });
    }
  }
}
```

**PatternMatcher.findN1Queries() বিস্তারিত**:

```javascript
// File: utils/pattern-matcher.js লাইন 190-225

findN1Queries(content) {
  const issues = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Loop খুঁজে বের করা (for/forEach/map)
    if (line.includes('for') ||
        line.includes('forEach') ||
        line.includes('.map(')) {

      // পরবর্তী ১০ লাইনে DB query আছে কিনা দেখা
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j];

        // যদি query পাওয়া যায়
        if (nextLine.includes('.find') ||
            nextLine.includes('.findOne') ||
            nextLine.includes('.findById')) {

          issues.push({
            line: i + 1,
            loopLine: line.trim(),
            queryLine: j + 1,
            queryCode: nextLine.trim()
          });

          break;  // একবার পেলেই break
        }
      }
    }
  }

  return issues;
}
```

**Detection Algorithm**:

```
Step 1: Line by line scan করা
Step 2: যদি loop পাওয়া যায়:
        - "for (" বা
        - ".forEach(" বা
        - ".map("
Step 3: সেই line থেকে পরবর্তী ১০ লাইন চেক করা
Step 4: যদি query পাওয়া যায়:
        - ".find(" বা
        - ".findOne(" বা
        - ".findById("
Step 5: → N+1 Query detected!
```

**Real-world Impact**:

```
Scenario: User List with Tasks

❌ N+1 Query:
   1 user  = 2 queries   (0.02s)
   10 users = 11 queries  (0.1s)
   100 users = 101 queries (1s)
   500 users = 501 queries (5s) ⚠️
   1000 users = 1001 queries (10s+) 💥 SLOW!
   5000 users = 5001 queries → Server crash! 💀

✅ Aggregation:
   1 user  = 1 query (0.01s)
   10 users = 1 query (0.01s)
   100 users = 1 query (0.02s)
   500 users = 1 query (0.05s)
   1000 users = 1 query (0.1s)
   5000 users = 1 query (0.5s) ✅ FAST!
```

**সমাধান**:

```typescript
// Solution 1: Aggregation (Best!)
const usersWithTasks = await User.aggregate([
  {
    $lookup: {
      from: 'tasks',
      localField: '_id',
      foreignField: 'userId',
      as: 'tasks'
    }
  }
]);

// Solution 2: Populate (Good)
const users = await User.find().populate('tasks');

// Solution 3: Batch query (OK)
const userIds = users.map(u => u.id);
const tasks = await Task.find({ userId: { $in: userIds } });
const tasksByUser = groupBy(tasks, 'userId');
```

---

## Transaction Safety Analyzer - ট্রানজেকশন নিরাপত্তা বিশ্লেষক 🆕

**ফাইল**: `analyzers/transaction-safety.js`

এই analyzer এমন সব সমস্যা খুঁজে বের করে যেখানে **MongoDB transaction এবং rollback** ব্যবহার করা উচিত কিন্তু করা হয়নি।

**দর্শন**: Data consistency হলো production system-এর মেরুদণ্ড। Multi-step operations-এ ACID guarantees ছাড়া data corruption হওয়া সময়ের ব্যাপার।

---

### Rule ১: Multi-Step Operations Without Transaction

**কেন গুরুত্বপূর্ণ?**

যখন একটা function-এ **একাধিক database write operation** থাকে, তখন যদি মাঝখানে একটা fail করে, data **partial state-এ** থেকে যায়।

**উদাহরণ**:

```typescript
// ❌ CRITICAL - কোনো transaction নেই!
export const createEscrowPayment = async (data) => {
  // Step 1: Stripe payment intent তৈরি
  const paymentIntent = await stripe.createPaymentIntent({
    amount: data.amount,
    currency: 'usd'
  });

  // Step 2: Database-এ payment save
  const payment = await PaymentModel.create({
    stripePaymentIntentId: paymentIntent.id,
    taskId: data.taskId,
    amount: data.amount
  });

  // Step 3: Bid status update
  await BidModel.findByIdAndUpdate(data.bidId, {
    paymentStatus: 'PENDING'
  });

  return payment;
};

// 🚨 সমস্যা: যদি Step 3 fail করে?
// → Stripe payment created ✅
// → Payment record saved ✅
// → Bid update failed ❌
// Result: Data inconsistency!
```

**✅ সঠিক পদ্ধতি - Transaction সহ:**

```typescript
import { withTransaction } from '@/helpers/serviceHelpers';

export const createEscrowPayment = async (data) => {
  return withTransaction(async (session) => {
    // Step 1: Stripe payment (external API)
    const paymentIntent = await stripe.createPaymentIntent({
      amount: data.amount,
      currency: 'usd'
    });

    // Step 2: Database save (with session)
    const payment = await PaymentModel.create([{
      stripePaymentIntentId: paymentIntent.id,
      taskId: data.taskId,
      amount: data.amount
    }], { session });

    // Step 3: Bid update (with session)
    await BidModel.findByIdAndUpdate(
      data.bidId,
      { paymentStatus: 'PENDING' },
      { session }
    );

    return payment[0];
  }, {
    maxRetries: 3  // Transient errors retry করবে
  });
  // ✅ এখন যদি কোনো step fail করে → সব rollback!
};
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/transaction-safety.js লাইন 44-90

checkMultiStepOperations(file, content) {
  // ১. Multi-step operations খুঁজে বের করা
  const operations = PatternMatcher.findMultiStepOperations(content);

  for (const op of operations) {
    // ২. withTransaction wrapper আছে কিনা check করা
    const hasTransaction = this.hasTransactionWrapper(
      content,
      op.startLine,
      op.endLine
    );

    // ৩. যদি 2+ operations থাকে কিন্তু transaction না থাকে
    if (!hasTransaction && op.operationCount >= 2) {
      // ৪. Payment/order file হলে → Critical
      const isCritical = file.relativePath.includes('payment') ||
                        file.relativePath.includes('order');

      this.issues.push({
        severity: isCritical ? 'critical' : 'architecture',
        message: `${op.operationCount} database operations without transaction`,
        impact: isCritical
          ? 'CRITICAL: Money/order data corruption possible'
          : 'Partial state on error possible',
        seniorSays: 'Multiple DB operations without transaction = data inconsistency waiting to happen.'
      });
    }
  }
}
```

**Detection Algorithm - বিস্তারিত:**

```
PatternMatcher.findMultiStepOperations() কীভাবে কাজ করে:

Step 1: File line by line scan করা

Step 2: Function detect করা:
        - "async function" বা
        - "async const" বা
        - "export async"

Step 3: Function-এর ভিতরে write operations count করা:
        Write patterns:
        - .create(
        - .save(
        - .update(
        - .updateOne(
        - .findOneAndUpdate(
        - .findByIdAndUpdate(
        - .delete(
        - .remove(

Step 4: Function শেষ হলে:
        যদি operations >= 2 → Multi-step operation!

Step 5: Transaction wrapper check করা:
        Relevant lines-এ খুঁজে দেখা:
        - "withTransaction" আছে?
        - "startTransaction" আছে?
        - "session" parameter আছে?

Step 6: যদি না থাকে → Issue report করা
```

**Production Impact Scenario:**

```
Real-world incident (without transaction):

১. User "Place Order" button click করে
২. Order তৈরি হয় → Database-এ save হয় ✅
৩. Payment record তৈরি করতে গিয়ে network error ❌
৪. User error দেখে, আবার try করে
৫. আরেকটা order তৈরি হয় (duplicate!)
৬. User 2টা order পায়, 1টার payment নেই
৭. Customer support-এ complaint
৮. Manual investigation → 2 hours wasted
৯. Refund process → Customer angry
১০. Bad review on app store 😱

With transaction:

১. User "Place Order" button click করে
২. Transaction শুরু হয়
৩. Order তৈরি হয় (transaction-এর ভিতরে)
৪. Payment record তৈরি করতে network error হয়
৫. Automatic rollback! Order deleted
৬. User clean error message পায়
৭. User safely retry করতে পারে
৮. New attempt = new transaction
৯. Success! ✅
```

---

### Rule ২: Payment/Money Operations Without Transaction

**কেন এটা CRITICAL?**

Payment এবং money-related operations-এ **যেকোনো inconsistency = financial loss**!

**উদাহরণ**:

```typescript
// ❌ CRITICAL SECURITY RISK!
export const refundPayment = async (paymentId, reason) => {
  // Step 1: Stripe refund করা
  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    reason: 'requested_by_customer'
  });

  // Step 2: Database update করা
  await PaymentModel.findByIdAndUpdate(paymentId, {
    status: 'REFUNDED',
    refundId: refund.id,
    refundReason: reason
  });

  // 🚨 যদি Step 2 fail করে?
  // → Stripe-এ refund হয়ে গেছে (টাকা দিয়ে দিয়েছেন)
  // → Database-এ status "PENDING" আছে
  // → Report-এ show করবে money still held
  // → Accounting mismatch! 💸
};

// ✅ SAFE - Transaction সহ
export const refundPayment = async (paymentId, reason) => {
  const payment = await PaymentModel.findById(paymentId);

  return withTransaction(async (session) => {
    // Step 1: Database status update (first!)
    await PaymentModel.findByIdAndUpdate(
      paymentId,
      {
        status: 'REFUNDING',
        refundReason: reason
      },
      { session }
    );

    // Step 2: Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason: 'requested_by_customer'
    });

    // Step 3: Final status update
    await PaymentModel.findByIdAndUpdate(
      paymentId,
      {
        status: 'REFUNDED',
        refundId: refund.id
      },
      { session }
    );

    return refund;
  });
  // ✅ যদি Stripe fail করে → DB rollback!
  // ✅ Data consistent থাকবে
};
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/transaction-safety.js লাইন 92-130

checkPaymentOperations(file, content) {
  // ১. Payment-related operations খুঁজে বের করা
  const paymentOps = PatternMatcher.detectPaymentOperations(content);

  for (const op of paymentOps) {
    // ২. Transaction wrapper আছে কিনা check
    const hasTransaction = this.hasTransactionWrapper(
      content,
      op.line - 5,
      op.line + 10
    );

    // ৩. যদি transaction না থাকে → CRITICAL ISSUE!
    if (!hasTransaction) {
      this.issues.push({
        severity: 'critical',
        category: 'transaction-safety',
        message: 'Payment/money operation without transaction',
        impact: 'CRITICAL: Money charged but record not saved, or vice versa',
        seniorSays: 'Handling MONEY without transactions? Production incident waiting to happen.',
        productionScenario: [
          'User pays via Stripe → Success',
          'Database save fails → Error',
          'Money taken, no record',
          'Customer complains, support can\'t find payment',
          'Manual refund, reputation damaged'
        ].join('\n')
      });
    }
  }
}
```

**PatternMatcher.detectPaymentOperations() বিস্তারিত:**

```javascript
// File: utils/pattern-matcher.js লাইন 499-544

detectPaymentOperations(content) {
  const paymentOps = [];
  const lines = content.split('\n');

  // Money-related keywords
  const moneyKeywords = [
    'stripe',
    'payment',
    'charge',
    'refund',
    'price',
    'amount',
    'money',
    'transaction',
    'invoice',
    'billing',
    'checkout'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    // Skip comments
    if (line.trim().startsWith('//')) continue;

    // Check করা: money keyword + DB operation
    const hasMoneyKeyword = moneyKeywords.some(k => line.includes(k));
    const hasDbOperation = line.includes('.create') ||
                          line.includes('.save') ||
                          line.includes('.update');

    if (hasMoneyKeyword && hasDbOperation) {
      paymentOps.push({
        line: i + 1,
        code: lines[i].trim(),
        keywords: moneyKeywords.filter(k => line.includes(k))
      });
    }
  }

  return paymentOps;
}
```

**Detection Logic:**

```
Step 1: Line by line scan করা
Step 2: প্রতিটি line-এ check করা:
        a) Money-related keyword আছে?
           (stripe, payment, charge, refund, amount, etc.)
        b) Database operation আছে?
           (.create, .save, .update, etc.)
Step 3: যদি দুটোই থাকে → Payment operation!
Step 4: Transaction wrapper check করা
        (line এর আগের 5 এবং পরের 10 lines-এ)
Step 5: যদি transaction না থাকে → CRITICAL issue!
```

---

### Rule ৩: Loop Updates Without Transaction

**কেন সমস্যা?**

Loop-এর ভিতরে database update করলে, যদি মাঝখানে fail করে তাহলে **কিছু data update হয়েছে, কিছু হয়নি**।

**উদাহরণ**:

```typescript
// ❌ DANGEROUS - Loop update without transaction
export const updateProductStock = async (productIds, decrementBy) => {
  for (const productId of productIds) {
    await Product.updateOne(
      { _id: productId },
      { $inc: { stock: -decrementBy } }
    );
  }
  // 🚨 যদি 3rd iteration-এ fail করে?
  // → First 2 products: stock decreased ✅
  // → Last 3 products: stock unchanged ❌
  // → Inventory mismatch!
};

// ✅ SAFE - Transaction সহ
export const updateProductStock = async (productIds, decrementBy) => {
  return withTransaction(async (session) => {
    for (const productId of productIds) {
      await Product.updateOne(
        { _id: productId },
        { $inc: { stock: -decrementBy } },
        { session }  // ← session parameter
      );
    }
  });
  // ✅ সব update success অথবা সব rollback!
};

// 🌟 BETTER - Bulk operation (faster + safer)
export const updateProductStock = async (productIds, decrementBy) => {
  await Product.updateMany(
    { _id: { $in: productIds } },
    { $inc: { stock: -decrementBy } }
  );
  // ✅ Single atomic operation!
};
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/transaction-safety.js লাইন 132-170

checkLoopUpdates(file, content) {
  // ১. Loop-এর ভিতরে update operations খুঁজে বের করা
  const loopUpdates = PatternMatcher.findLoopUpdates(content);

  for (const loop of loopUpdates) {
    // ২. Transaction wrapper আছে কিনা check
    const hasTransaction = this.hasTransactionWrapper(
      content,
      loop.loopLine - 5,
      loop.queryLine + 5
    );

    if (!hasTransaction) {
      this.issues.push({
        severity: 'architecture',
        message: 'Database updates in loop without transaction',
        impact: 'Partial updates on error - data inconsistency',
        seniorSays: 'Loop updates halfway crash = half your data updated. Not acceptable.',
        teaching: {
          why: 'Loops execute sequentially. Iteration 5 fails = iterations 1-4 already modified DB.',
          alternatives: [
            'Use withTransaction() for consistency',
            'Use bulkWrite() for performance',
            'Use updateMany() if updates identical'
          ]
        }
      });
    }
  }
}
```

**PatternMatcher.findLoopUpdates() বিস্তারিত:**

```javascript
// File: utils/pattern-matcher.js লাইন 549-599

findLoopUpdates(content) {
  const loopUpdates = [];
  const lines = content.split('\n');

  // Update operation patterns
  const updatePatterns = [
    '.update(',
    '.updateOne(',
    '.updateMany(',
    '.findOneAndUpdate(',
    '.findByIdAndUpdate(',
    '.save(',
    '.create(',
    '.delete('
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip comments
    if (line.startsWith('//')) continue;

    // Loop detect করা
    if (line.includes('for (') ||
        line.includes('.forEach(') ||
        line.includes('.map(') ||
        line.includes('while (')) {

      // পরবর্তী 15 lines-এ update operation খুঁজে বের করা
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        const nextLine = lines[j];

        for (const pattern of updatePatterns) {
          if (nextLine.includes('await') && nextLine.includes(pattern)) {
            loopUpdates.push({
              loopLine: i + 1,
              loopCode: line,
              queryLine: j + 1,
              queryCode: nextLine.trim()
            });
            break;
          }
        }
      }
    }
  }

  return loopUpdates;
}
```

**Detection Steps:**

```
Step 1: Line scan করা
Step 2: Loop keywords খুঁজে বের করা:
        - "for ("
        - ".forEach("
        - ".map("
        - "while ("
Step 3: Loop থেকে পরবর্তী 15 lines check করা
Step 4: Update operations খুঁজে বের করা:
        - .update, .updateOne, .save, etc.
Step 5: যদি পাওয়া যায় → Loop update detected!
Step 6: Transaction wrapper check করা
Step 7: না থাকলে → Issue report
```

**Production Scenario:**

```
Inventory Update (50 products):

Without Transaction:
  Product 1-20: Stock decreased ✅
  Product 21: Network error ❌ [CRASH]
  Product 22-50: Stock unchanged ❌
  Result: Inventory data corrupted!
  Fix: Manual database correction (hours of work)

With Transaction:
  Product 1-20: Stock decreasing...
  Product 21: Network error ❌
  Automatic Rollback!
  Product 1-20: Stock restored to original ✅
  Result: Data consistent!
  Fix: Just retry the operation
```

---

### Rule ৪: Try-Catch Without Rollback

**কেন সমস্যা?**

Developer try-catch লিখেছে error handling-এর জন্য, কিন্তু **partial changes rollback করেনি**!

**উদাহরণ**:

```typescript
// ❌ Error handling আছে, কিন্তু rollback নেই!
export const transferFunds = async (fromUserId, toUserId, amount) => {
  try {
    // Step 1: From user থেকে কেটে নেওয়া
    await Wallet.updateOne(
      { userId: fromUserId },
      { $inc: { balance: -amount } }
    );

    // Step 2: To user-কে দেওয়া
    await Wallet.updateOne(
      { userId: toUserId },
      { $inc: { balance: amount } }
    );

    // Step 3: Transaction log তৈরি
    await TransactionLog.create({
      from: fromUserId,
      to: toUserId,
      amount
    });

  } catch (error) {
    // 🚨 Error catch করেছে, কিন্তু rollback নেই!
    // যদি Step 2 বা 3 fail করে?
    // → Step 1 already executed!
    // → From user-এর টাকা কেটে গেছে
    // → To user পায়নি
    // → Money lost! 💸

    throw new ApiError(500, 'Transfer failed');
  }
};

// ✅ SAFE - withTransaction automatic rollback করে
export const transferFunds = async (fromUserId, toUserId, amount) => {
  return withTransaction(async (session) => {
    // All operations with session
    await Wallet.updateOne(
      { userId: fromUserId },
      { $inc: { balance: -amount } },
      { session }
    );

    await Wallet.updateOne(
      { userId: toUserId },
      { $inc: { balance: amount } },
      { session }
    );

    await TransactionLog.create([{
      from: fromUserId,
      to: toUserId,
      amount
    }], { session });
  });
  // ✅ Error হলে automatic rollback!
  // ✅ No money lost!
};
```

**কীভাবে Detect করে?**

```javascript
// File: analyzers/transaction-safety.js লাইন 172-230

checkErrorHandlingWithoutRollback(file, content) {
  const lines = content.split('\n');
  let inTryCatch = false;
  let tryStartLine = -1;
  let dbOperationsInTry = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Try block শুরু detect করা
    if (line.startsWith('try') && line.includes('{')) {
      inTryCatch = true;
      tryStartLine = i + 1;
      dbOperationsInTry = [];
    }

    // Try block-এর ভিতরে DB operations count করা
    if (inTryCatch) {
      if (line.includes('await') &&
          (line.includes('.create') || line.includes('.save') ||
           line.includes('.update'))) {
        dbOperationsInTry.push(i + 1);
      }
    }

    // Catch block detect করা
    if (inTryCatch && line.includes('catch')) {
      // Catch block-এ rollback logic আছে কিনা check করা
      const catchBlockEnd = this.findCatchBlockEnd(lines, i);
      const catchBlock = lines.slice(i, catchBlockEnd).join('\n');

      const hasRollback = catchBlock.includes('abortTransaction') ||
                         catchBlock.includes('rollback') ||
                         catchBlock.includes('withTransaction');

      // যদি 2+ operations থাকে কিন্তু rollback না থাকে
      if (dbOperationsInTry.length >= 2 && !hasRollback) {
        this.issues.push({
          severity: 'architecture',
          message: `Try-catch with ${dbOperationsInTry.length} DB ops but no rollback`,
          impact: 'Error handling exists but doesn\'t undo partial changes',
          seniorSays: 'You catch errors but don\'t rollback. Use withTransaction().'
        });
      }

      inTryCatch = false;
    }
  }
}
```

**Detection Algorithm:**

```
State machine approach:

State 1: Looking for "try {" block
         Found → Go to State 2

State 2: Inside try block
         Count DB write operations (.create, .save, .update)
         Found "catch" → Go to State 3

State 3: Inside catch block
         Find catch block end (matching braces)
         Check if catch has rollback logic:
         - "abortTransaction"
         - "rollback"
         - "withTransaction"

State 4: Analysis
         যদি DB operations >= 2
         এবং rollback logic নেই
         → Issue report করা

Reset: Back to State 1
```

---

### সারাংশ: Transaction Safety Rules

| Rule | Severity | When to Apply | Fix |
|------|----------|--------------|-----|
| **Multi-step Operations** | Critical (payment) / Architecture | 2+ DB writes in function | Wrap in `withTransaction()` |
| **Payment Operations** | Critical | Any money-related code | ALWAYS use transaction |
| **Loop Updates** | Architecture | DB update inside loop | Use transaction or bulkWrite() |
| **Try-Catch No Rollback** | Architecture | Multiple ops in try-catch | Replace with `withTransaction()` |

---

### ACID Guarantees কী?

**A - Atomicity (পরমাণুত্ব)**
- সব operations একসাথে success অথবা একসাথে fail
- Partial state কখনো থাকবে না

**C - Consistency (সামঞ্জস্যতা)**
- Data সবসময় valid state-এ থাকবে
- Constraints violate হবে না

**I - Isolation (বিচ্ছিন্নতা)**
- Concurrent transactions একে অপরকে affect করবে না
- Dirty reads হবে না

**D - Durability (স্থায়িত্ব)**
- Committed data সবসময় persist করবে
- Server crash হলেও data safe

---

### `withTransaction()` কীভাবে কাজ করে?

**Source**: `src/helpers/serviceHelpers.ts:195-227`

```typescript
export const withTransaction = async <T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
  opts?: TransactionOptions
): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    // ১. Transaction শুরু করা
    await session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority', j: true }
    });

    // ২. User callback execute করা (session pass করে)
    const result = await fn(session);

    // ৩. সব কিছু ঠিক থাকলে commit করা
    await session.commitTransaction();

    return result;

  } catch (error) {
    // ৪. Error হলে automatic rollback!
    await session.abortTransaction();

    // ৫. Transient error হলে retry করা
    if (error?.errorLabels?.includes('TransientTransactionError')) {
      // Retry logic...
    }

    throw error;

  } finally {
    // ৬. Session cleanup
    session.endSession();
  }
};
```

**Flow Diagram:**

```
User Code:
  withTransaction(async (session) => {
    await Model1.create([data], { session });
    await Model2.update(query, update, { session });
  })
    ↓
  System:
    1. Start session
    2. Begin transaction
    3. Execute operations (with session)
    4a. Success? → Commit → Return result
    4b. Error? → Abort → Rollback → Throw error
    5. End session (cleanup)
```

---

## Pragmatism Analyzer - বাস্তবসম্মত বিশ্লেষক

**ফাইল**: `analyzers/pragmatism.js`

এই analyzer জানে **কখন rules break করা OK**!

### Philosophy: Context-Aware Rules

সব rules সব জায়গায় apply হয় না। কিছু কিছু জায়গায় rules break করা **sensible**।

**উদাহরণ**:

```typescript
// ❌ Normally: Direct query in service = BAD
const users = await User.find({ status: 'active' });

// ✅ But in one-off analytics script = OK!
// scripts/analytics/monthly-report.js:
const stats = await User.aggregate([
  { $match: { createdAt: { $gte: lastMonth } } },
  { $group: { _id: '$country', count: { $sum: 1 } } }
]);
// This doesn't need a model method!
```

**কীভাবে কাজ করে?**

```javascript
// File: analyzers/pragmatism.js লাইন 12-48

analyze(files) {
  this.issues = [];

  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');

    // ১. যদি scripts/ folder-এ থাকে → Relax rules
    if (file.relativePath.includes('scripts/') &&
        !file.relativePath.includes('code-review')) {
      // Scripts can have:
      // - Direct queries ✅
      // - console.log ✅
      // - Hardcoded values ✅
      continue;
    }

    // ২. যদি migration folder-এ থাকে → Different rules
    if (file.relativePath.includes('migration')) {
      // Migrations can break normal patterns
      continue;
    }

    // ৩. যদি payment/auth code হয় → Over-engineering OK!
    if (file.relativePath.includes('payment') ||
        file.relativePath.includes('auth')) {
      // These are OK to have extra safety checks
      continue;
    }
  }

  return this.issues;
}
```

**Context-Aware Advice**:

```javascript
// File: analyzers/pragmatism.js লাইন 50-75

getContextAdvice(issue, file) {
  // Analytics/Report files
  if (file.relativePath.includes('analytics') ||
      file.relativePath.includes('report')) {
    return {
      seniorSays: 'Don\'t follow rules blindly. This one-off report doesn\'t need a model method.',
      exception: true
    };
  }

  // Internal admin tools
  if (file.relativePath.includes('admin')) {
    return {
      seniorSays: 'Admin dashboards don\'t need the same level of abstraction as public APIs.',
      relaxed: true
    };
  }

  return null;
}
```

**Context-Based Exceptions**:

| File Location | Rules Relaxed | Why? |
|--------------|---------------|------|
| `scripts/` | Direct queries, console.log | One-off scripts don't need production patterns |
| `migrations/` | All architecture rules | Migrations are temporary, different purpose |
| `analytics/` | Service layer pattern | Complex queries better in one place |
| `admin/` | Over-engineering rules | Internal tools can be simpler |
| `payment/` | Over-engineering rules | Money-related code needs extra safety |
| `auth/` | Over-engineering rules | Security code can be more defensive |

**Real Examples**:

```typescript
// 1. Scripts folder - Direct query OK
// scripts/cleanup-old-users.js
const oldUsers = await User.find({
  lastLogin: { $lt: sixMonthsAgo }
});
// ✅ This doesn't need UserService.findOldUsers()

// 2. Migration - Breaking patterns OK
// migrations/add-default-role.js
for (const user of users) {
  await User.updateOne({ _id: user.id }, { role: 'user' });
}
// ✅ N+1 query OK here, runs once

// 3. Analytics - Complex query OK
// scripts/analytics/revenue-report.js
const revenue = await Order.aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: '$month', total: { $sum: '$amount' } } },
  { $sort: { _id: -1 } }
]);
// ✅ Complex aggregate OK, don't need model method

// 4. Admin panel - Simple code OK
// admin/users/list.ts
const users = await User.find().limit(100);
// ✅ Admin panel doesn't need QueryBuilder

// 5. Payment - Over-engineering OK
// payment/stripe.service.ts
class PaymentRetryManager {
  // Lots of safety checks, logging, retries
  // ✅ Over-engineered but necessary for money!
}

// 6. Auth - Defensive code OK
// auth/token-validator.ts
if (!token) throw new Error('No token');
if (!token.startsWith('Bearer')) throw new Error('Invalid format');
if (token.length < 10) throw new Error('Too short');
// ✅ Lots of checks OK for security!
```

---

## Reporter System - রিপোর্ট সিস্টেম

**ফাইল**: `reporters/console-reporter.js`

এই reporter **beautiful terminal output** তৈরি করে।

### ANSI Colors

```javascript
// File: reporters/console-reporter.js লাইন 13-28

this.colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};
```

**কীভাবে Color করে?**

```javascript
// File: reporters/console-reporter.js লাইন 220-228

colorize(text, color, style) {
  if (!this.options.colorize) return text;

  let code = this.colors[color] || '';
  if (style === 'bright') code = this.colors.bright + code;
  if (style === 'dim') code = this.colors.dim + code;

  return code + text + this.colors.reset;
}
```

**উদাহরণ**:

```javascript
// Red, bright text:
this.colorize('🔴 CRITICAL', 'red', 'bright');
// Output: \x1b[1m\x1b[31m🔴 CRITICAL\x1b[0m

// Dim gray text:
this.colorize('  📁 src/app.ts:35', 'dim');
// Output: \x1b[2m  📁 src/app.ts:35\x1b[0m
```

---

### Issue Formatting

**Single Issue Display**:

```javascript
// File: reporters/console-reporter.js লাইন 113-175

printIssue(issue, severity) {
  const icon = this.getSeverityIcon(severity);
  const color = this.getSeverityColor(severity);

  // ১. Title
  console.log(this.colorize(`  ${icon} ${issue.message}`, color, 'bright'));

  // ২. File location
  console.log(this.colorize(`  📁 ${issue.file}:${issue.line}`, 'dim'));

  // ৩. Senior Engineer feedback
  if (issue.seniorSays) {
    console.log(this.colorize(`  💬 Senior Engineer Says:`, 'cyan', 'bright'));
    console.log(`  "${issue.seniorSays}"`);
  }

  // ৪. Impact
  if (issue.impact) {
    console.log(this.colorize(`  💥 Impact:`, 'yellow'));
    console.log(`  ${issue.impact}`);
  }

  // ৫. Fix suggestion
  if (issue.fix) {
    console.log(this.colorize(`  🔧 Fix:`, 'green'));
    console.log(`  ${issue.fix}`);
  }

  // ৬. Before/After code
  if (issue.before && issue.after) {
    console.log(this.colorize(`  📝 Before (WRONG):`, 'red'));
    this.printCodeBlock(issue.before, 'red');

    console.log(this.colorize(`  📝 After (CORRECT):`, 'green'));
    this.printCodeBlock(issue.after, 'green');
  }

  // ৭. Teaching moment
  if (issue.teaching) {
    console.log(this.colorize(`  🎓 Teaching Moment:`, 'blue'));
    if (issue.teaching.why) {
      console.log(`  Why? ${issue.teaching.why}`);
    }
  }

  // ৮. Separator
  console.log(this.colorize('─'.repeat(70), 'dim'));
}
```

**Output Example**:

```
  ❌ Import Order Violation
  📁 src/app.ts:35

  💬 Senior Engineer Says:
  "OpenTelemetry imported AFTER routes. Move it BEFORE routes."

  💥 Impact:
  This will break your entire logging system in production

  🔧 Fix:
  Move import to line 27 (before routes)

  📝 Before (WRONG):
  import router from './routes';
  import './app/logging/opentelemetry';

  📝 After (CORRECT):
  import './app/logging/opentelemetry';
  import router from './routes';

  🎓 Teaching Moment:
  Why? Auto-instrumentation must run before code loads

──────────────────────────────────────────────────────────────
```

---

### Summary Generation

```javascript
// File: reporters/console-reporter.js লাইন 177-218

printSummary(results) {
  const counts = {
    critical: results.critical?.length || 0,
    architecture: results.architecture?.length || 0,
    overEngineering: results.overEngineering?.length || 0,
    quality: results.quality?.length || 0,
    good: results.goodPatterns?.length || 0
  };

  console.log(`  🔴 Critical:      ${counts.critical}  (Fix immediately)`);
  console.log(`  ⚠️  Architecture:  ${counts.architecture}  (Fix in sprint)`);
  console.log(`  💡 Over-eng:      ${counts.overEngineering}  (Simplify later)`);
  console.log(`  🟡 Quality:       ${counts.quality}  (Improve gradually)`);
  console.log(`  ✅ Good patterns: ${counts.good}  (Keep doing!)`);

  // Overall assessment
  console.log(this.getOverallAssessment(counts));
}
```

**Assessment Logic**:

```javascript
// File: reporters/console-reporter.js লাইন 220-242

getOverallAssessment(counts) {
  if (counts.critical > 5) {
    return `"You have ${counts.critical} critical issues. Focus on those first.
     They will break production."`;
  } else if (counts.critical > 0) {
    return `"Fix the ${counts.critical} critical issues, then you're good.
     Other issues can wait."`;
  } else if (counts.architecture > 10) {
    return `"No critical issues! Now address architecture issues."`;
  } else {
    return `"Your codebase is solid! Keep shipping features."`;
  }
}
```

---

## ব্যবহার পদ্ধতি

### Basic Usage

```bash
# সম্পূর্ণ codebase review
node scripts/code-review/reviewer.js

# Specific module review
node scripts/code-review/reviewer.js --module user

# Specific file review
node scripts/code-review/reviewer.js --file src/app/modules/auth/auth.service.ts
```

### Severity Filtering

```bash
# শুধু Critical issues
node scripts/code-review/reviewer.js --severity critical

# Critical + Architecture
node scripts/code-review/reviewer.js --severity critical,architecture

# All except quality
node scripts/code-review/reviewer.js --severity critical,architecture,over-engineering
```

### Output Formats

```bash
# Console output (default, with colors)
node scripts/code-review/reviewer.js --format console

# JSON output (for CI/CD)
node scripts/code-review/reviewer.js --format json

# Save to file
node scripts/code-review/reviewer.js --format json > report.json
```

### CI/CD Mode

```bash
# Exit code 1 if critical issues found
node scripts/code-review/reviewer.js --ci

# Combine with JSON
node scripts/code-review/reviewer.js --ci --format json > report.json
```

**Exit Codes**:

```
0 = No critical issues (build passes)
1 = Critical issues found (build fails)
```

---

## সম্পূর্ণ Example Output

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

──────────────────────────────────────────────────────────────

  ❌ Missing validation.ts
  📁 src/app/modules/payment/

  💬 Senior Engineer Says:
  "Missing validation? That's a security vulnerability waiting to happen."

  💥 Impact:
  Payment routes accept ANY input - SQL injection risk!

  🔧 Fix:
  Create payment.validation.ts with Zod schemas

──────────────────────────────────────────────────────────────

⚠️  ARCHITECTURE ISSUES (Fix Soon) ───────────── 4

  ⚠️  Direct Database Query in Service
  📁 src/app/modules/user/user.service.ts:49

  💬 Senior Engineer Says:
  "You're calling Model.find() directly in service. This should
   be a model static method. Why? Testability and reusability."

  🎓 Teaching Moment:
  Why? Model methods can be mocked in tests
  Benefits:
    - Testable (mock model method)
    - Reusable (other services can call)
    - Single source of truth

──────────────────────────────────────────────────────────────

💡 OVER-ENGINEERING DETECTED ────────────── 1

  💡 Factory Pattern for 2 Types
  📁 src/app/helpers/userTypeFactory.ts:15

  💬 Senior Engineer Says:
  "You created a factory for only 2 user types.
   You're solving a problem you don't have yet."

  💾 Impact: Removes 42 lines, increases readability

──────────────────────────────────────────────────────────────

✅ GOOD PATTERNS FOUND ──────────────── 18

  ✅ Excellent Module Structure: bookmark
  📁 src/app/modules/bookmark/

  💬 Senior Engineer Says:
  "This is textbook architecture. Use this as template."

──────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════
                            📊 SUMMARY
═══════════════════════════════════════════════════════════════════

  🔴 Critical:      3  (Fix immediately before deploy)
  ⚠️  Architecture:  4  (Fix in current sprint)
  💡 Over-eng:      1  (Simplify when you refactor)
  🟡 Quality:       4  (Improve in next sprint)
  ✅ Good patterns: 18 (Keep doing this!)

💬 Overall Assessment:

"Your codebase is solid. Fix the 3 critical issues, then you're
 good to deploy. Everything else can be addressed incrementally.

 Focus: Import order → Validation → Architecture cleanup

 Keep doing: Module structure, error handling, QueryBuilder usage"

═══════════════════════════════════════════════════════════════════
```

---

## সমাপনী

এই টুলটি আপনার code কে **top 1% senior engineer** এর মত review করে:

✅ **Thorough** - সব ধরনের সমস্যা খুঁজে বের করে
✅ **Practical** - Context বুঝে পরামর্শ দেয়
✅ **Pragmatic** - কখন rules break করা OK সেটা জানে
✅ **Teaching** - কেন এবং কীভাবে fix করতে হবে শেখায়
✅ **Production-focused** - Production-এ যা crash করবে সেটা priority দেয়

**এখন ব্যবহার করুন এবং আপনার code quality improve করুন!** 🚀
