# 📮 Postman Collection Generator

Automatically generate Postman collections for your API with smart merge, auto-authentication, and token management.

---

## 🚀 Quick Start

### Generate Complete Collection (All Modules)

```bash
node scripts/postman/generate-all.js
```

This creates `postman-collections/complete-api-collection.json` with:
- ✅ All 7 modules (Auth, User, Chat, Message, Payment, Bookmark, Notification)
- ✅ Auto-authentication (Bearer token injection)
- ✅ Auto-token extraction (from login/register responses)
- ✅ Smart merge (preserves your saved data)
- ✅ Collection variables

### Generate Environment File

```bash
node scripts/postman/generate-all.js --env
```

Creates:
- `postman-collections/environment.json` (Development environment for localhost)

### Generate Single Module

```bash
node scripts/postman/generate-all.js auth
```

---

## 📋 Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Route Comment Analyzer](#route-comment-analyzer)
- [Test Script Generator](#test-script-generator)
- [Features](#features)
- [Postman Workflow](#postman-workflow)
- [Collection Variables](#collection-variables)
- [API Endpoints](#api-endpoints)
- [File Upload](#file-upload)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

---

## 📦 Installation

No installation required! This is a Node.js script that uses built-in modules only.

**Requirements:**
- Node.js (already installed in your project)
- Your API codebase with modules in `src/app/modules/`

---

## 🎯 Usage

### All Commands

```bash
# Generate all modules collection
node scripts/postman/generate-all.js

# Generate single module collection
node scripts/postman/generate-all.js auth
node scripts/postman/generate-all.js user
node scripts/postman/generate-all.js message

# Generate environment files
node scripts/postman/generate-all.js --env

# Force fresh generation (ignore existing)
node scripts/postman/generate-all.js --force

# Skip backup creation
node scripts/postman/generate-all.js --no-backup

# Show help
node scripts/postman/generate-all.js --help
```

### Available Modules

- `auth` - Authentication (login, register, password reset, etc.)
- `user` - User management (profile, CRUD operations)
- `chat` - Chat rooms
- `message` - Messages (with file upload support)
- `payment` - Payment processing (Stripe)
- `bookmark` - Bookmarks
- `notification` - Notifications

---

## 🔍 Route Comment Analyzer

A companion tool to ensure all your route files have proper comments for better Postman collection generation.

### What It Does

- Scans all route files in `src/app/modules/`
- Detects routes without comments
- Generates smart suggestions based on route patterns
- Auto-fixes route files by adding comments (optional)

### Usage

```bash
# Analyze all modules
node scripts/postman/analyze-routes.js

# Analyze specific module
node scripts/postman/analyze-routes.js auth

# Show suggestions (default behavior)
node scripts/postman/analyze-routes.js --suggest

# Auto-add comments to route files
node scripts/postman/analyze-routes.js --fix

# Fix specific module
node scripts/postman/analyze-routes.js chat --fix

# Show help
node scripts/postman/analyze-routes.js --help
```

### Example Output

```bash
$ node scripts/postman/analyze-routes.js

🔍 Starting route comment analysis...

📊 Route Comment Analysis Report

============================================================

Module: Auth
  ✅ 10 routes with comments
  🎉 All routes have comments!

Module: Chat
  ⚠️  2 routes missing comments:
    - POST /:otherUserId → Suggested: "Create Chat"
    - GET / → Suggested: "Get User Chats"

Module: Message
  ✅ 1 routes with comments
  ⚠️  2 routes missing comments:
    - POST / → Suggested: "Send Message"
    - GET /:id → Suggested: "Get Messages"

============================================================

Summary:
  Total Routes: 42
  With Comments: 38 (90%)
  Missing Comments: 4 (10%)

💡 Tip: Run with --fix to automatically add suggested comments
   Example: node scripts/postman/analyze-routes.js --fix
```

### Using --fix Option

```bash
$ node scripts/postman/analyze-routes.js chat --fix

🔍 Starting route comment analysis...

📦 Backup created: chat.route.backup-1763901456611.ts
✅ Added 2 comments to chat.route.ts

✅ Successfully added 2 comments to route files!
```

**Before:**
```typescript
router.post('/:otherUserId', auth(...), ChatController.createChat);
router.get('/', auth(...), ChatController.getChat);
```

**After:**
```typescript
// Create Chat
router.post('/:otherUserId', auth(...), ChatController.createChat);

// Get User Chats
router.get('/', auth(...), ChatController.getChat);
```

### Smart Suggestions

The analyzer generates intelligent suggestions based on:

- **HTTP Method**: GET, POST, PUT, PATCH, DELETE
- **Route Path Pattern**: `/login`, `/:id`, `/profile`, etc.
- **Module Context**: Chat, message, auth-specific patterns
- **Common API Patterns**: CRUD operations, authentication flows

**Example Suggestions:**

| Route | Suggestion |
|-------|------------|
| `POST /login` | "User Login" |
| `POST /refresh-token` | "Refresh Access Token" |
| `GET /:id` | "Get by ID" |
| `PUT /:id` | "Update by ID" |
| `DELETE /:id` | "Delete by ID" |
| `POST /:otherUserId` (in chat module) | "Create Chat" |
| `POST /` (in message module) | "Send Message" |

### Safety Features

- ✅ **Automatic Backups**: Creates backup before modifying files
- ✅ **Suggestion Preview**: Review suggestions before applying with `--suggest`
- ✅ **Non-Destructive**: Only adds comments, never modifies existing code
- ✅ **Module-Specific**: Understands context-specific patterns

### Workflow

**Recommended workflow when adding new routes:**

1. **Add routes** to your route file
2. **Run analyzer** to see missing comments:
   ```bash
   node scripts/postman/analyze-routes.js
   ```
3. **Review suggestions** to ensure they're accurate
4. **Auto-fix** if suggestions look good:
   ```bash
   node scripts/postman/analyze-routes.js --fix
   ```
5. **Generate Postman collection** with better request names:
   ```bash
   node scripts/postman/generate-all.js
   ```

---

## 🧪 Test Script Generator

An advanced tool to automatically generate comprehensive test scripts for your Postman collection with enterprise-grade testing capabilities.

### What It Does

- Automatically generates test scripts for all endpoints
- Intelligent test categorization based on endpoint type
- Schema validation using Mongoose models
- AI-powered dynamic test generation
- Performance regression tracking
- Security vulnerability testing
- Contract testing (detect breaking changes)
- HTML coverage reports
- CI/CD integration (GitHub Actions)

### Usage

```bash
# Basic test generation
node scripts/postman/generate-tests.js

# With Mongoose schema validation
node scripts/postman/generate-tests.js --use-schemas

# AI-powered dynamic tests
node scripts/postman/generate-tests.js --ai-powered

# Create contract baseline
node scripts/postman/generate-tests.js --create-baseline

# Verify contract (detect breaking changes)
node scripts/postman/generate-tests.js --verify-contract

# Generate with HTML report
node scripts/postman/generate-tests.js --run-and-report

# Generate CI/CD configuration
node scripts/postman/generate-tests.js --ci-config

# Full-featured generation
node scripts/postman/generate-tests.js --use-schemas --ai-powered --run-and-report --ci-config

# Merge into existing collection
node scripts/postman/generate-tests.js --merge

# Show help
node scripts/postman/generate-tests.js --help
```

### Example Output

```bash
$ node scripts/postman/generate-tests.js --run-and-report

🧪 Enhanced Test Script Generator

🔨 Generating tests...

📂 Processing: auth Module
   ✓ Generated 10 tests

📂 Processing: user Module
   ✓ Generated 8 tests

[... other modules ...]

📊 Test Generation Summary
============================================================

Total Endpoints: 42
Tests Generated: 42

By Module:
  ✅ Auth - 10 tests
  ✅ User - 8 tests
  ✅ Chat - 2 tests
  ✅ Message - 3 tests
  ✅ Payment - 11 tests
  ✅ Bookmark - 2 tests
  ✅ Notification - 6 tests

Test Types:
  ✓ Status Code Tests: 42
  ✓ Schema Validation: 42
  ✓ Response Time: 42
  ✓ Security Tests: 42
  ✓ Performance Tests: 42

Total Test Assertions: ~630
============================================================

📄 Generating HTML report...
✅ HTML report generated: test-reports/test-coverage-1763992823019.html
```

### Generated Test Types

#### 1. Status Code Validation
```javascript
pm.test("✓ Status code is 200", () => {
    pm.response.to.have.status(200);
});

pm.test("✓ Response has success property", () => {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
});
```

#### 2. Authentication Tests (for login/register)
```javascript
pm.test("✓ Access token received", () => {
    const response = pm.response.json();
    pm.expect(response.data).to.have.property("accessToken");
    pm.expect(response.data.accessToken.length).to.be.above(20);

    // Auto-save token
    pm.collectionVariables.set("accessToken", response.data.accessToken);
});

pm.test("✓ Password not exposed in response", () => {
    const responseBody = pm.response.text();
    pm.expect(responseBody.toLowerCase()).to.not.include("password");
});
```

#### 3. Schema Validation Tests
```javascript
pm.test("✓ Response has data property", () => {
    const response = pm.response.json();
    pm.expect(response).to.have.property("data");
});

// With --use-schemas option
pm.test("✓ User schema validation", () => {
    const data = pm.response.json().data;

    // Required fields (from Mongoose model)
    pm.expect(data).to.have.property("email");
    pm.expect(data).to.have.property("name");

    // Field types
    pm.expect(data.email).to.be.a("string");
    pm.expect(data.age).to.be.a("number");
});
```

#### 4. Performance Regression Tests
```javascript
pm.test("✓ No performance regression", () => {
    const currentTime = pm.response.responseTime;
    const baselineTime = pm.collectionVariables.get("login_baseline") || currentTime;
    const threshold = baselineTime * 1.3; // 30% tolerance

    pm.expect(currentTime).to.be.below(threshold,
        `Response time ${currentTime}ms exceeds baseline by more than 30%`
    );

    // Update rolling average
    const newBaseline = Math.round((baselineTime + currentTime) / 2);
    pm.collectionVariables.set("login_baseline", newBaseline);
});
```

#### 5. Security Tests
```javascript
pm.test("✓ Authorization required", () => {
    const hasAuthHeader = pm.request.headers.has("Authorization");
    pm.expect(hasAuthHeader).to.be.true;
});

pm.test("✓ No sensitive data exposed", () => {
    const responseBody = pm.response.text().toLowerCase();
    pm.expect(responseBody).to.not.include("password");
    pm.expect(responseBody).to.not.include("secret");
});
```

#### 6. AI-Powered Dynamic Tests
```javascript
pm.test("✓ Response data types consistent", () => {
    const response = pm.response.json();
    const data = response.data;

    // Learn and validate data types dynamically
    if (data && typeof data === "object") {
        Object.keys(data).forEach(key => {
            const value = data[key];
            const valueType = typeof value;

            // Store type for future validation
            const storedType = pm.collectionVariables.get(`user_${key}_type`);
            if (!storedType) {
                pm.collectionVariables.set(`user_${key}_type`, valueType);
            } else {
                pm.expect(valueType).to.equal(storedType,
                    `Field ${key} type changed from ${storedType} to ${valueType}`
                );
            }
        });
    }
});
```

### Advanced Features

#### Contract Testing

Create a baseline of your API responses and detect breaking changes:

```bash
# Step 1: Create baseline
node scripts/postman/generate-tests.js --create-baseline

# Step 2: Make API changes

# Step 3: Verify contract
node scripts/postman/generate-tests.js --verify-contract
```

**Benefits:**
- Detect breaking changes before deployment
- Track API evolution
- Prevent accidental field removal
- Ensure backward compatibility

#### Mongoose Schema Integration

Automatically extract validation rules from your Mongoose models:

```bash
node scripts/postman/generate-tests.js --use-schemas
```

**Automatically validates:**
- Required fields
- Data types
- Enum values
- Min/max values (from schema constraints)

#### HTML Coverage Report

Generate beautiful HTML reports with test coverage statistics:

```bash
node scripts/postman/generate-tests.js --run-and-report
```

**Report includes:**
- Overall coverage percentage
- Module-wise breakdown
- Test type distribution
- Visual charts and graphs

**Output:** `test-reports/test-coverage-{timestamp}.html`

#### CI/CD Integration

Generate GitHub Actions workflow for automated testing:

```bash
node scripts/postman/generate-tests.js --ci-config
```

**Generated file:** `.github/workflows/api-tests.yml`

**Features:**
- Runs on push/pull request
- Uses Newman for test execution
- Generates HTML reports
- Comments PR with test results
- Uploads test artifacts

**Example PR comment:**
```markdown
## 🧪 API Test Results

- **Total Tests**: 630
- **Passed**: ✅ 625
- **Failed**: ❌ 5
- **Avg Response Time**: 234ms
```

### Output Files

| File | Description |
|------|-------------|
| `complete-api-collection-with-tests.json` | Collection with generated tests |
| `test-reports/test-coverage-{timestamp}.html` | HTML coverage report |
| `test-baseline/contract-baseline.json` | Contract baseline (if --create-baseline) |
| `.github/workflows/api-tests.yml` | CI/CD workflow (if --ci-config) |

### Workflow

**Recommended workflow for comprehensive testing:**

1. **Generate collection**:
   ```bash
   node scripts/postman/generate-all.js
   ```

2. **Ensure routes have comments**:
   ```bash
   node scripts/postman/analyze-routes.js --fix
   ```

3. **Generate tests**:
   ```bash
   node scripts/postman/generate-tests.js --use-schemas --ai-powered
   ```

4. **Create baseline** (first time):
   ```bash
   node scripts/postman/generate-tests.js --create-baseline
   ```

5. **Generate report and CI/CD**:
   ```bash
   node scripts/postman/generate-tests.js --run-and-report --ci-config
   ```

6. **Import to Postman** and run tests

7. **Future updates** - verify contract:
   ```bash
   node scripts/postman/generate-tests.js --verify-contract --run-and-report
   ```

### Benefits

✅ **Time-Saving**: Generates 600+ test assertions automatically
✅ **Comprehensive**: Covers status, schema, performance, security
✅ **Intelligent**: Learns from responses and Mongoose schemas
✅ **Quality Assurance**: Catches regressions and breaking changes
✅ **CI/CD Ready**: Automated testing in pipelines
✅ **Maintainable**: Regenerate tests as API evolves
✅ **Professional**: Enterprise-grade testing patterns

---

## ✨ Features

### 🔄 Smart Merge

The script intelligently merges changes with existing collections:

- ✅ **Preserves your data**: Saved tokens, test responses, custom notes
- ✅ **Adds new endpoints**: Automatically detected from code
- ✅ **Updates changed endpoints**: Body structure updates
- ✅ **Keeps unchanged**: No unnecessary modifications
- ✅ **Automatic backups**: Before every update

**Example:**

```bash
$ node scripts/postman/generate-all.js

📂 Found existing collection: complete-api-collection.json
💾 Backup created: complete-api-collection-backup-2025-01-21.json
🔍 Analyzing changes...

📊 Module: Auth
  ✅ Added: 1 endpoint (POST /auth/verify-email)
  ✓ Unchanged: 9 endpoints

📊 Module: Message
  ✅ Added: 3 endpoints
  ✓ Unchanged: 0 endpoints

💾 Variables merged (existing values preserved)

📈 Summary:
  Total endpoints: 44
  ✅ New: 4
  ✓ Unchanged: 40

✅ Collection saved: postman-collections/complete-api-collection.json
```

---

### 🔐 Auto-Authentication

**Pre-request Script** (runs before every request):

Automatically injects Bearer token from collection variables:

```javascript
// You don't need to manually add Authorization header!
// Script automatically adds:
Authorization: Bearer {{accessToken}}
```

**How it works:**
1. You login via `POST /auth/login`
2. Token automatically saved to `{{accessToken}}`
3. All subsequent requests automatically include the token
4. No manual copy-paste needed!

---

### 💾 Auto-Token Extraction

**Test Scripts** (run after response):

Automatically save important data from responses:

| Endpoint | Auto-Saved Variables |
|----------|---------------------|
| `POST /auth/login` | `accessToken`, `refreshToken`, `userId` |
| `POST /auth/register` | `accessToken`, `refreshToken`, `userId` |
| `POST /chats/:otherUserId` | `chatId` |
| `POST /messages/` | `messageId` |
| Payment endpoints | `paymentId`, `clientSecret` |

**Example:**

```javascript
// After login, you'll see in Postman console:
✅ Access token saved
✅ Refresh token saved
✅ User ID saved: 507f1f77bcf86cd799439011
```

---

### 📁 File Upload Support

Automatically detects and configures file upload endpoints:

**Message Module** - Send files:
```
POST /messages/
Body: multipart/form-data
├── chatId (text) = {{chatId}}
├── text (text) = "Message with files"
├── image (file) - Image attachments
├── media (file) - Audio/Video
└── doc (file) - Documents
```

**User Module** - Profile picture:
```
PATCH /user/profile
Body: multipart/form-data
├── name (text) = {{UPDATED_NAME}}
├── email (text) = {{TEST_EMAIL}}
└── profilePicture (file) - Profile image
```

---

### 🌍 Environment File

Generate development environment:

```bash
node scripts/postman/generate-all.js --env
```

**Output:** `postman-collections/environment.json`

**Development Environment:**
```json
{
  "name": "Development",
  "values": [
    {"key": "BASE_URL", "value": "http://localhost:5000/api/v1"},
    {"key": "accessToken", "value": ""},
    {"key": "refreshToken", "value": ""},
    {"key": "userId": "value": ""},
    {"key": "TEST_EMAIL", "value": "test@example.com"},
    {"key": "TEST_PASSWORD", "value": "SecurePass123!"}
  ]
}
```

**For Production:**
1. Import `environment.json` in Postman
2. Duplicate "Development" environment
3. Rename to "Production"
4. Update `BASE_URL` to your production URL
5. Remove test credentials

---

## 🔄 Postman Workflow

### Step-by-Step Guide

#### 1. Generate Collection

```bash
node scripts/postman/generate-all.js
```

#### 2. Import to Postman

1. Open Postman
2. Click **Import** button
3. Select file: `postman-collections/complete-api-collection.json`
4. Click **Import**

✅ Collection imported!

#### 3. Import Environment (Optional but Recommended)

```bash
# Generate environment first
node scripts/postman/generate-all.js --env
```

1. In Postman, click **Environments** (left sidebar)
2. Click **Import**
3. Select: `postman-collections/environment.json`
4. Click **Import**
5. **Select "Development"** from environment dropdown (top-right)

**For Production:**
- Duplicate "Development" environment in Postman
- Rename to "Production"
- Change `BASE_URL` to your production API URL

#### 4. Login to Get Token

1. Open collection: **Complete API Collection**
2. Navigate to: **📁 Auth Module → POST - Login**
3. Check body:
   ```json
   {
     "email": "{{TEST_EMAIL}}",
     "password": "{{TEST_PASSWORD}}"
   }
   ```
4. Click **Send**

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "_id": "507f...",
      "email": "test@example.com"
    }
  }
}
```

**Automatically saved:**
- ✅ `accessToken` → Collection variable
- ✅ `refreshToken` → Collection variable
- ✅ `userId` → Collection variable

Check **Console** tab (bottom) to see:
```
✅ Access token saved
✅ Refresh token saved
✅ User ID saved: 507f1f77bcf86cd799439011
```

#### 5. Make Authenticated Requests

Now all other requests automatically include the token!

**Example: Get Profile**

1. Navigate to: **📁 User Module → GET - Get Profile**
2. Click **Send**
3. No need to add Authorization header - it's automatic!

**Under the hood:**
```
GET /api/v1/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ Request succeeds with your profile data!

#### 6. Create Chat & Send Message

**Create Chat:**

1. **📁 Chat Module → POST - Create Chat**
2. URL: `{{BASE_URL}}/chats/:otherUserId`
3. Replace `:otherUserId` with actual user ID
4. Click **Send**

**Auto-saved:** `chatId`

**Send Message:**

1. **📁 Message Module → POST - Send Message**
2. Body already uses `{{chatId}}`!
   ```json
   {
     "chatId": "{{chatId}}",
     "text": "Hello!"
   }
   ```
3. Click **Send**

**Auto-saved:** `messageId`

---

## 📊 Collection Variables

### Dynamic Variables (Auto-Saved)

| Variable | Description | Auto-Saved From |
|----------|-------------|-----------------|
| `accessToken` | JWT access token | Login/Register |
| `refreshToken` | JWT refresh token | Login/Register |
| `userId` | Current user ID | Login/Register |
| `chatId` | Current chat ID | Create Chat |
| `messageId` | Latest message ID | Send Message |
| `paymentId` | Latest payment ID | Payment endpoints |
| `clientSecret` | Stripe client secret | Payment Intent |
| `TARGET_ID` | Generic target ID | Bookmark/other |

### Static Variables (Test Data)

| Variable | Default Value | Usage |
|----------|---------------|-------|
| `BASE_URL` | `http://localhost:5000/api/v1` | API base URL |
| `TEST_EMAIL` | `test@example.com` | Login/Register |
| `TEST_PASSWORD` | `SecurePass123!` | Login/Register |
| `TEST_NAME` | `John Doe` | Register |
| `NEW_PASSWORD` | `NewSecure123!` | Change Password |
| `UPDATED_NAME` | `Updated Name` | Update Profile |

### How to Use Variables

In request bodies, use double curly braces:

```json
{
  "email": "{{TEST_EMAIL}}",
  "password": "{{TEST_PASSWORD}}",
  "chatId": "{{chatId}}"
}
```

In URLs:
```
{{BASE_URL}}/chats/{{chatId}}
```

### View/Edit Variables

1. Click on **Collection** name
2. Go to **Variables** tab
3. See all variables with current values
4. Edit as needed

---

## 🗂️ API Endpoints

### Auth Module (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password |
| POST | `/user/` | Register new user |
| POST | `/auth/logout` | Logout current user |
| POST | `/auth/forget-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/change-password` | Change password (authenticated) |
| POST | `/auth/verify-email` | Verify email with OTP |
| POST | `/auth/resend-verify-email` | Resend verification email |
| POST | `/auth/refresh-token` | Refresh access token |
| GET | `/auth/google` | Google OAuth login |

### User Module (7 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Get own profile |
| PATCH | `/user/profile` | Update profile (with file upload) |
| GET | `/user/` | Get all users (admin) |
| GET | `/user/:id` | Get user by ID (admin) |
| GET | `/user/:id/user` | Get public user profile |
| PATCH | `/user/:id/block` | Block user (admin) |
| PATCH | `/user/:id/unblock` | Unblock user (admin) |

### Chat Module (2 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chats/:otherUserId` | Create/get chat with user |
| GET | `/chats/` | Get all user's chats |

### Message Module (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/messages/` | Send message (with file upload) |
| GET | `/messages/:id` | Get chat messages |
| POST | `/messages/chat/:chatId/read` | Mark messages as read |

### Payment Module (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/webhook` | Stripe webhook |
| POST | `/payments/stripe/account` | Create Stripe account |
| GET | `/payments/stripe/onboarding` | Get onboarding link |
| GET | `/payments/stripe/onboarding-status` | Check onboarding status |
| GET | `/payments/history` | Get payment history |
| GET | `/payments/by-bid/:bidId/current-intent` | Get payment intent |
| POST | `/payments/refund/:paymentId` | Refund payment |
| GET | `/payments/:paymentId` | Get payment details |
| GET | `/payments/` | Get all payments (admin) |
| GET | `/payments/stats` | Payment statistics (admin) |

### Bookmark Module (2 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookmarks/` | Toggle bookmark |
| GET | `/bookmarks/my-bookmarks` | Get user bookmarks |

### Notification Module (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications/` | Get notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| GET | `/notifications/admin` | Admin notifications |
| PATCH | `/notifications/admin/:id/read` | Mark admin notification read |
| PATCH | `/notifications/admin/read-all` | Mark all admin notifications read |

**Total: 40+ endpoints**

---

## 📤 File Upload

### Message Module - Send Files

**Endpoint:** `POST /messages/`

**Configuration:**
```
Body: multipart/form-data

Fields:
├── chatId (text) = {{chatId}}
├── text (text) = "Your message" (optional if files attached)
├── image (file) - Upload images (optional)
├── media (file) - Upload audio/video (optional)
└── doc (file) - Upload documents (optional)
```

**How to use:**

1. Open **POST /messages/**
2. Go to **Body** tab
3. Select **form-data** (already configured)
4. For file fields:
   - Hover over field
   - Click **Select Files**
   - Choose file from computer
5. Click **Send**

**Supported file types:**
- **Images:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **Media:** `.mp4`, `.webm`, `.mov`, `.mp3`, `.wav`
- **Documents:** `.pdf`, `.doc`, `.docx`, `.txt`

---

### User Module - Profile Picture

**Endpoint:** `PATCH /user/profile`

**Configuration:**
```
Body: multipart/form-data

Fields:
├── name (text) = {{UPDATED_NAME}}
├── email (text) = {{TEST_EMAIL}}
└── profilePicture (file) - Profile image (optional)
```

**How to use:**

1. Open **PATCH /user/profile**
2. Go to **Body** tab
3. For `profilePicture` field:
   - Click **Select Files**
   - Choose image
4. Update `name` and `email` if needed
5. Click **Send**

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error

**Problem:** 401 Unauthorized when calling protected endpoints

**Solution:**

1. Check if you're logged in:
   ```
   Collection → Variables tab → Check if accessToken has value
   ```

2. If empty, login again:
   ```
   Auth Module → POST - Login → Send
   ```

3. Check token in request:
   ```
   Open any request → Headers tab → Should see:
   Authorization: Bearer eyJhbGciOiJ...
   ```

---

### Issue: "Token expired"

**Problem:** Token expired after some time

**Solution:**

Use refresh token endpoint:

```
Auth Module → POST - Refresh Token
```

This will generate new `accessToken` automatically.

---

### Issue: Variables not auto-saving

**Problem:** After login, variables still empty

**Solution:**

1. Check **Console** tab (bottom of Postman) for errors
2. Ensure response is successful (200 OK)
3. Check response structure matches expected format
4. Try manually:
   ```
   Collection → Variables → Manually paste token
   ```

---

### Issue: "Module not found" when generating

**Problem:** Script can't find module

**Solution:**

```bash
# Check available modules
node scripts/postman/generate-all.js --help

# Verify module exists
ls src/app/modules/
```

Module must exist in `src/app/modules/[module-name]/`

---

### Issue: Collection merge not working

**Problem:** Changes not being merged

**Solution:**

Force fresh generation:

```bash
node scripts/postman/generate-all.js --force
```

This ignores existing collection and creates fresh one.

---

### Issue: Restore from backup

**Problem:** Need to restore previous collection

**Solution:**

1. Go to `postman-collections/backups/`
2. Find backup file (named with timestamp)
3. Copy to `postman-collections/`
4. Rename to original filename
5. Re-import in Postman

---

## 📚 Examples

### Example 1: Complete Workflow (বাংলা)

**১. Collection এবং Environment তৈরি করুন:**

```bash
node scripts/postman/generate-all.js
node scripts/postman/generate-all.js --env
```

**২. Postman এ import করুন:**

- Import → `postman-collections/complete-api-collection.json`
- Environments → Import → `postman-collections/environment.json`
- "Development" environment select করুন

**৩. Login করুন:**

- Auth Module → POST - Login
- Send button click করুন
- Console এ দেখবেন: ✅ Access token saved

**৪. Profile দেখুন:**

- User Module → GET - Get Profile
- Send করুন (automatically authenticated!)
- আপনার profile data পাবেন

**৫. Chat তৈরি করুন:**

- Chat Module → POST - Create Chat
- URL এ user ID দিন
- Send করুন
- Console এ: ✅ Chat ID saved

**৬. Message পাঠান:**

- Message Module → POST - Send Message
- Body তে already `{{chatId}}` আছে
- Send করুন
- Message sent!

---

### Example 2: File Upload Workflow (English)

**1. Login first:**

```
Auth → POST - Login → Send
```

**2. Create a chat:**

```
Chat → POST - Create Chat
URL: Replace :otherUserId with actual ID
Send
```

**3. Send message with image:**

```
Message → POST - Send Message
Body tab → form-data
- chatId: {{chatId}} (already filled)
- text: "Check out this image!"
- image: Select Files → Choose image
Send
```

**4. Response:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "text": "Check out this image!",
    "attachments": [
      {
        "type": "image",
        "url": "https://..."
      }
    ]
  }
}
```

---

### Example 3: Smart Merge in Action

**Scenario:** You added a new endpoint in code

**Before:**
```
Auth Module: 9 endpoints
```

**Code change:**
```typescript
// src/app/modules/auth/auth.route.ts
router.post('/verify-otp', AuthController.verifyOTP); // NEW
```

**Run generator:**
```bash
node scripts/postman/generate-all.js
```

**Output:**
```
📂 Found existing collection
🔍 Analyzing changes...

📊 Module: Auth
  ✅ Added: 1 endpoint (POST /auth/verify-otp)
  ✓ Unchanged: 9 endpoints

💾 Variables merged (existing values preserved)

✅ Collection saved
```

**After:**
```
Auth Module: 10 endpoints (9 old + 1 new)
Your saved tokens: Still there!
Your test responses: Still there!
```

---

## 🎓 Advanced Tips

### Tip 1: Use Environments for Different Stages

Create different environments for different backends:

```bash
# Generate base environments
node scripts/postman/generate-all.js --env
```

Then duplicate and modify:
- **Local:** `http://localhost:5000/api/v1`
- **Staging:** `https://staging-api.example.com/api/v1`
- **Production:** `https://api.example.com/api/v1`

Switch environments from dropdown to test different backends!

---

### Tip 2: Save Example Responses

After successful request:

1. Click **Save Response**
2. Name it (e.g., "Success Login")
3. Click **Save Example**

Next time you open the request:
- See expected response
- Compare with actual response
- Documentation for your team!

---

### Tip 3: Organize Requests

Create sub-folders:

```
Auth Module
├── 🟢 Public (login, register)
├── 🔒 Authenticated (logout, change password)
└── 📧 Email (verify, resend)
```

Drag and drop requests to organize.

---

### Tip 4: Chain Requests

Use Collection Runner to run multiple requests in sequence:

1. **Collection → Run**
2. Select requests
3. Click **Run**

Example flow:
```
1. Register user
2. Login
3. Create chat
4. Send message
5. Get messages
```

All tokens/IDs auto-saved and used!

---

## 📞 Support

**Issues with script:**
- Check `scripts/postman/QUICK_REFERENCE.md` for quick fixes
- Verify module structure in `src/app/modules/`
- Check Node.js version (`node --version`)

**Issues with Postman:**
- Check Postman Console for errors
- Verify environment selected
- Check variable values in Variables tab

**API Issues:**
- Ensure backend server is running
- Check `BASE_URL` points to correct server
- Verify endpoints exist in your codebase

---

## 🚀 Next Steps

1. ✅ Generate collection: `node scripts/postman/generate-all.js`
2. ✅ Generate environments: `node scripts/postman/generate-all.js --env`
3. ✅ Import both in Postman
4. ✅ Login and test!
5. ✅ Save example responses
6. ✅ Share collection with team

---

## 📄 Related Files

- `scripts/postman/generate-all.js` - Main script
- `scripts/postman/QUICK_REFERENCE.md` - Quick cheat sheet
- `scripts/generate-postman-collection.js` - Simple single-module generator (old)

---

**Happy Testing! 🎉**
