# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an enterprise-grade TypeScript backend template for building scalable applications with MongoDB, featuring real-time communication, payment processing, and advanced observability.

**Tech Stack**: TypeScript + Express + MongoDB/Mongoose + Socket.IO + Stripe + OpenTelemetry

## Development Commands

```bash
# Development
npm run dev              # Start dev server with hot reload (ts-node-dev)

# Building
npm run build           # Compile TypeScript to dist/

# Production
npm start               # Run compiled code from dist/

# Testing
npm test                # Run Vitest in watch mode
npm run test:run        # Run tests once
npm run test:coverage   # Generate coverage report
npm run test:ui         # Open Vitest UI
npx vitest run <path>   # Run single test file

# Code Quality
npm run lint:check      # Check linting errors
npm run lint:fix        # Auto-fix linting issues
npm run prettier:check  # Check code formatting
npm run prettier:fix    # Auto-format code

# Code Review
node scripts/code-review/reviewer.js                    # Review entire codebase
node scripts/code-review/reviewer.js --file <path>      # Review specific file
node scripts/code-review/reviewer.js --module <name>    # Review specific module

# Diagram Generation
node scripts/diagram-generator/sequence-diagram-generator.js              # Interactive mode
node scripts/diagram-generator/sequence-diagram-generator.js --module auth # Generate module diagrams
node scripts/diagram-generator/sequence-diagram-generator.js --all         # Generate all modules
```

## VS Code Extension: Real-time Code Review

**NEW!** A VS Code extension is available for real-time code review right in your editor.

### Features

- ✅ **Real-time diagnostics** - See issues as you code (red/yellow squiggly lines)
- ✅ **Problems panel integration** - All issues in one place
- ✅ **Status bar** - At-a-glance issue counts
- ✅ **Hover tooltips** - Detailed explanations with "Senior Engineer Says"
- ✅ **Quick fixes** - One-click fixes for common issues
- ✅ **Commands** - Review file, workspace, clear cache
- ✅ **Configurable** - Filter by severity, exclude patterns, etc.

### Installation

**Development Mode (Testing):**
```bash
cd scripts/code-review/vscode-extension
npm install
npm run compile
# Press F5 in VS Code to open Extension Development Host
```

**Permanent Installation:**
```bash
cd scripts/code-review/vscode-extension
npm install -g @vscode/vsce
vsce package
code --install-extension senior-code-reviewer-0.1.0.vsix
```

### Usage

1. **Automatic**: Extension activates on TypeScript/JavaScript files
2. **Save file** (`Ctrl+S`) to trigger analysis
3. **View issues** in Problems panel (`Ctrl+Shift+M`)
4. **Hover** over red/yellow lines for details
5. **Quick fix** (`Ctrl+.`) for auto-fixes
6. **Status bar** shows counts - click to open Problems panel

### Configuration

Settings (`Ctrl+,`) → Search "Senior Code Reviewer":

```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.validateOnSave": true,
  "seniorCodeReviewer.validateOnType": false,
  "seniorCodeReviewer.severity": ["critical", "architecture", "security"],
  "seniorCodeReviewer.excludePatterns": ["**/*.test.ts", "**/*.spec.ts"]
}
```

### Documentation

- [README.md](scripts/code-review/vscode-extension/README.md) - Feature overview
- [QUICKSTART.md](scripts/code-review/vscode-extension/QUICKSTART.md) - Get started in 5 minutes
- [INSTALLATION.md](scripts/code-review/vscode-extension/INSTALLATION.md) - Detailed setup guide
- [CHANGELOG.md](scripts/code-review/vscode-extension/CHANGELOG.md) - Version history

### Integration with CLI

The extension wraps the existing JavaScript CLI reviewer, so:
- ✅ **No changes** to analyzer logic needed
- ✅ **Same rules** as CLI
- ✅ **Both tools work** independently
- ✅ Use **CLI for CI/CD**, **extension for development**

---

## Mermaid Sequence Diagram Generator

**NEW!** Automatically generate visual sequence diagrams from your codebase using Mermaid.js.

### Features

- 📊 **Auto-generate diagrams** - Analyze routes → controllers → services → database
- 🎯 **3 Detail Levels** - Overview, Standard, Ultra-Detailed
- 🇧🇩 **Bangla Comments** - Important steps explained in Bangla
- 🌐 **Interactive HTML** - Preview diagrams in browser
- 📝 **Mermaid.js Output** - Standard `.mmd` format
- 🔄 **Complete Flow Coverage** - Middleware, DB queries, Socket.IO, External APIs

### Quick Start

**Unified CLI (Recommended):**
```bash
# Interactive menu with all diagram types
node scripts/generate-diagrams.js
```

**Sequence Diagrams:**
```bash
node scripts/diagram-generator/sequence-diagram-generator.js              # Interactive
node scripts/diagram-generator/sequence-diagram-generator.js --module auth # Specific module
node scripts/diagram-generator/sequence-diagram-generator.js --all         # All modules
```

**Combined REST + Socket.IO Diagrams (NEW! 🆕):**
```bash
node scripts/generate-diagrams.js --combined           # All modules with Socket.IO
node scripts/generate-diagrams.js --combined message   # Specific module
node scripts/generate-diagrams.js --socket-map         # View REST → Socket mapping
```

### What Gets Analyzed

✅ **Route Layer**
- HTTP methods and paths
- Middleware chain (auth, validation, file upload)

✅ **Controller Layer**
- Request data extraction (body, params, query)
- Service method calls
- Response structure

✅ **Service Layer**
- Database operations (Mongoose queries)
- Helper function calls (jwtHelper, emailHelper, etc.)
- Service-to-service calls
- QueryBuilder/AggregationBuilder usage

✅ **Real-time Layer**
- Socket.IO events (emit, to, on)
- Presence tracking
- Unread count updates

✅ **External APIs**
- Stripe API calls
- Firebase Cloud Messaging
- AWS S3 / Cloudinary uploads

### Combined REST + Socket.IO Flow (NEW! 🆕)

Auto-detects which REST endpoints emit Socket.IO events and generates complete flow diagrams:

**Example Output (`--socket-map`):**
```
📦 Module: message
   Endpoints with Socket: 2/3

   🌐 POST /
      → MessageController.sendMessage()
      → MessageService.sendMessageToDB()
      🔌 emit('MESSAGE_SENT') [room-emit] to room: chat::{chatId}

   🌐 POST /chat/:chatId/read
      → MessageController.markChatRead()
      → MessageService.markChatAsRead()
      🔌 emit('MESSAGE_READ') [room-emit] to room: chat::{chatId}
```

**Supported Patterns:**
| Pattern | Example | Detection |
|---------|---------|-----------|
| Room-based emit | `io.to('room').emit('EVENT')` | ✅ |
| Template literal | `` io.to(`chat::${chatId}`).emit('EVENT') `` | ✅ |
| User-targeted | `io.emit('event::userId')` | ✅ |
| Broadcast | `io.emit('EVENT')` | ✅ |

### Output Location

Diagrams are saved in:
```
scripts/diagram-generator/output/
├── diagrams/                              # .mmd files (Mermaid source)
│   ├── auth-post-login-standard.mmd       # Sequence diagrams
│   └── message-post-combined.mmd          # 🆕 Combined REST+Socket diagrams
├── html/                                  # .html files (Interactive preview)
│   ├── auth-post-login-standard.html
│   └── message-post-combined.html         # 🆕 Combined flow HTML
└── combined-index.html                    # 🆕 Index for combined diagrams
```

### Example Output

For `POST /api/v1/auth/login`, the generator creates:
- `auth-post-login-standard.mmd` - Mermaid diagram code
- `auth-post-login-standard.html` - Interactive HTML preview

For Combined REST + Socket.IO (🆕):
- `message-post-combined.mmd` - Complete REST → Socket.IO flow
- `message-post-combined.html` - Interactive diagram with Socket.IO visualization

Open the HTML file in a browser to see the complete sequence diagram with:
- Numbered steps (autonumber)
- Bangla comments for key operations
- Request/response data flow
- Database query details
- Token generation flow

### Detail Levels

| Level | Steps | Use Case |
|-------|-------|----------|
| **Overview** | ~10 | Quick understanding, presentations |
| **Standard** | ~30 | Documentation, onboarding (Recommended) |
| **Ultra-Detailed** | ~100 | Debugging, security audit |

### Documentation

- [README.md](scripts/diagram-generator/README.md) - Complete usage guide
- [Configuration](scripts/diagram-generator/config.js) - Customize diagram generation

### Benefits

- 📖 **Faster Onboarding** - New developers understand flow visually
- 🔍 **Better Debugging** - See exactly where requests fail
- 📚 **Living Documentation** - Auto-generated, always up-to-date
- 🎓 **Learning Tool** - Understand complex flows at a glance
- 🏗️ **Architecture Review** - Visualize system design decisions

---

## Critical Architecture Concepts

### 1. Import Order (MUST FOLLOW)

**The order of imports in `src/app.ts` and `src/server.ts` is CRITICAL.** Violating this order will cause runtime errors or missing instrumentation.

**Correct order:**
```typescript
// 1. FIRST: Mongoose metrics (before any Mongoose models compile)
import './app/logging/mongooseMetrics';

// 2. Auto-labeling (before routes/controllers are loaded)
import './app/logging/autoLabelBootstrap';

// 3. OpenTelemetry instrumentation
import './app/logging/opentelemetry';

// 4. Third-party patches (bcrypt, JWT, Stripe instrumentation)
import './app/logging/patchBcrypt';
import './app/logging/patchJWT';
import './app/logging/patchStripe';

// 5. LAST: Routes (they import controllers which need auto-labeling)
import router from './routes';
```

**Why this matters:**
- Mongoose metrics must register before models are defined
- Auto-labeling must patch classes before they're imported by routes
- OpenTelemetry must initialize before instrumented code runs

A runtime validator (`loadOrderValidator.ts`) will throw errors if this order is violated.

### 2. Module Pattern

Every feature module follows this exact structure:

```
app/modules/[feature]/
├── [feature].interface.ts      # TypeScript types and interfaces
├── [feature].model.ts          # Mongoose schema and model
├── [feature].controller.ts     # Request handlers (thin layer)
├── [feature].service.ts        # Business logic (fat layer)
├── [feature].route.ts          # Express route definitions
└── [feature].validation.ts     # Zod validation schemas
```

**Flow**: Route → Validation → Controller → Service → Model

**Example workflow:**
1. Request hits route with `validateRequest(Schema)`
2. Controller extracts data, calls service
3. Service contains all business logic
4. Service uses QueryBuilder/AggregationBuilder for complex queries
5. Controller uses `sendResponse()` for standardized responses

All async controllers are wrapped with `catchAsync()` which forwards errors to global error handler.

### 3. Advanced Logging & Observability

This codebase has a sophisticated logging system built on OpenTelemetry:

**Auto-Labeling**: Controllers and services are automatically labeled with metadata for tracing. No manual instrumentation needed. Classes named `*Controller` or `*Service` get automatic span creation.

**Request Context**: Uses AsyncLocalStorage to track per-request data (request ID, user ID, etc.) accessible anywhere via `getRequestContext()`.

**Timeline Visualization**: Console shows beautiful span timelines for each request:
```
├─ POST /api/v1/auth/login (200ms)
│  ├─ validateRequest (5ms)
│  ├─ AuthController.login (190ms)
│  │  ├─ AuthService.login (180ms)
│  │  │  ├─ User.findOne (45ms) - MongoDB
│  │  │  └─ bcrypt.compare (130ms)
```

**Mongoose Metrics**: Automatically runs `.explain()` on queries and logs execution stats (docs scanned, execution time, index usage).

**Client Detection**: Uses modern Client Hints API to detect device/OS/browser without user-agent parsing.

### 4. Query Builders

**QueryBuilder** (`app/builder/QueryBuilder.ts`):
- Chainable methods for common query operations
- Methods: `search()`, `filter()`, `sort()`, `paginate()`, `fields()`, `location()`, `timeFilter()`
- Automatically handles pagination metadata
- Example: `new QueryBuilder(Model.find(), query).search(['name', 'email']).filter().paginate()`

**AggregationBuilder** (`app/builder/AggregationBuilder.ts`):
- Builds complex MongoDB aggregation pipelines
- Methods: `match()`, `lookup()`, `unwind()`, `group()`, `sort()`, `paginate()`
- Returns both data and pagination metadata

**When to use:**
- Simple queries: Use Mongoose directly
- Search/filter/sort/pagination: Use QueryBuilder
- Complex joins/grouping: Use AggregationBuilder

### 5. File Upload System

Multi-provider file upload system (`app/middlewares/fileHandler.ts`):

**Providers:**
- `local`: Saves to `public/uploads/`
- `s3`: AWS S3 with automatic bucket creation
- `cloudinary`: Cloudinary with folder organization
- `memory`: In-memory storage (testing)

**Features:**
- Automatic image optimization with Sharp
- Type validation per folder (images/media/documents)
- Per-field max file count
- Automatic cleanup on errors
- Safe file deletion with diff logging

**Usage in routes:**
```typescript
fileHandler({
  provider: 's3',
  fields: [
    { name: 'avatar', maxCount: 1, folder: 'avatars', allowedTypes: ['image'] }
  ]
})
```

### 6. Socket.IO Architecture

Real-time features use Socket.IO with JWT authentication:

**Connection Flow:**
1. Client connects with JWT token in auth
2. Server validates JWT in `socketHelper.ts`
3. User joins private room: `user:{userId}`
4. User auto-joins all their chat rooms

**Events:**
- `join-room` / `leave-room`: Chat room management
- `send-message`: Send message to chat
- `typing` / `stop-typing`: Typing indicators (throttled)
- `user-online` / `user-offline`: Presence tracking

**Helpers:**
- `presenceHelper.ts`: Track online users, notify presence changes
- `unreadHelper.ts`: Calculate unread message counts

**Pattern**: Controllers emit Socket.IO events after database operations (e.g., after saving message, emit to room).

### 7. Payment System (Stripe)

Complete marketplace payment system with escrow:

**Components:**
- `stripe.adapter.ts`: Wrapper around Stripe SDK
- `payment.service.ts`: Escrow payment flow
- `stripeConnect.service.ts`: Onboard freelancers
- `webhook.controller.ts`: Handle Stripe webhooks

**Escrow Flow:**
1. Create PaymentIntent (buyer pays)
2. Hold funds (status: PENDING)
3. On service completion → Transfer to seller via Connect
4. Platform fee deducted automatically (configurable %)

**Webhook Handling:**
- Signature verification required
- Events: `payment_intent.succeeded`, `transfer.created`, etc.
- Idempotent processing

### 8. Authentication Flow

**Local Auth:**
1. Register → Hash password (bcrypt) → Save user → Send verification email
2. Login → Compare password → Generate JWT + refresh token → Set cookies
3. Password reset → Generate crypto token → Email link → Verify token → Update password

**Google OAuth:**
- Uses Passport.js with Google OAuth 2.0 strategy
- Config in `auth/config/passport.ts`
- Flow: Redirect to Google → Callback → Create/find user → Generate JWT

**JWT Middleware:**
- `auth()` middleware verifies JWT from cookies or Authorization header
- Supports role-based access: `auth(USER_ROLES.ADMIN)`
- Adds `user` to `req.user`

---

## Documentation Standards & Requirements

**⚠️ CRITICAL**: This codebase maintains comprehensive documentation for all major systems. Future Claude instances MUST follow these standards to ensure documentation quality remains high.

### Universal Documentation Triggers

**You MUST write or update documentation when:**

1. **Adding New Features/Modules:**
   - New module in `app/modules/`
   - New middleware in `app/middlewares/`
   - New builder/helper in `app/builder/` or `app/helpers/`
   - New logging/observability feature in `app/logging/`

2. **Modifying Existing Functionality:**
   - Changing architecture or design patterns
   - Modifying API endpoints or responses
   - Updating database schemas or models
   - Changing query builders or aggregation logic
   - Modifying authentication/authorization flow
   - Updating payment processing logic
   - Changing Socket.IO events or handlers
   - Modifying file upload handling

3. **Performance Changes:**
   - Adding/removing indexes
   - Query optimization
   - Caching implementation
   - Rate limiting changes

4. **Configuration Changes:**
   - New environment variables
   - Configuration file modifications
   - Feature flags or toggles

5. **Bug Fixes That Change Behavior:**
   - Fixes that alter expected behavior
   - Changes to error handling
   - Validation rule modifications

### Documentation Quality Checklist

**Every documentation update MUST include these sections (when applicable):**

#### ✅ Required Sections

1. **System Overview**
   - What does this system/feature do?
   - Why is it needed?
   - How does it fit into the overall architecture?

2. **Architecture Explanation**
   - How does it work internally?
   - Key components and their relationships
   - Data flow diagrams (if complex)

3. **Code Examples**
   - Complete, working code examples
   - Before/after comparisons (for changes)
   - Inline comments explaining non-obvious logic
   - **Exact line numbers** when referencing specific code

4. **Configuration Options**
   - All available options documented
   - Default values clearly stated
   - Examples for common use cases

5. **Integration Points**
   - How it integrates with other modules
   - Dependencies and requirements
   - Side effects or global state changes

6. **Step-by-Step Workflow**
   - Complete request/process flow
   - What happens at each step
   - Decision points and branches

7. **Technical Decisions Rationale**
   - **Why** this approach was chosen
   - Alternatives considered
   - Trade-offs made
   - Performance considerations

8. **Usage Examples**
   - Real-world scenarios
   - Multiple examples showing different use cases
   - Edge cases and how they're handled

9. **Troubleshooting**
   - Common issues and solutions
   - Error messages and what they mean
   - Debugging tips

10. **Performance Considerations**
    - Expected performance characteristics
    - Benchmarks (if available)
    - Scalability notes
    - Resource usage

### Documentation Depth Requirements

Different types of features require different documentation depth:

**🔴 Critical Systems (Comprehensive Bangla Documentation Required):**
- Authentication & Authorization
- Payment Processing
- Logging & Tracing System
- Real-time Communication (Socket.IO)
- Database Query System

**Requirements:**
- Dedicated documentation file in `doc/` directory
- Written in Bangla for detailed explanations
- All 10 checklist sections included
- Multiple examples and scenarios
- Architecture diagrams or flowcharts
- Minimum 1000+ lines of documentation

**🟡 Core Features (Detailed Documentation Required):**
- File Upload System
- Email System
- Validation System
- Error Handling
- Query Builders
- Middleware System

**Requirements:**
- Either dedicated doc file OR comprehensive section in CLAUDE.md
- Can be in English or Bangla
- At least 7 checklist sections included
- Code examples with explanations
- Integration points clearly documented
- Minimum 300+ lines of documentation

**🟢 Helper Functions/Utilities (Standard Documentation):**
- Utility functions
- Helper classes
- Constants and enums
- Type definitions

**Requirements:**
- Inline code comments
- JSDoc/TSDoc comments
- Usage examples in relevant documentation
- Purpose and parameters clearly stated

### Language Guidelines

**When to use Bangla:**
- Architecture deep-dives (logging, payment, messaging systems)
- System explanations and workflows
- Technical decision rationale
- Comprehensive module documentation

**When to use English:**
- Quick references and checklists
- Code comments
- Function/variable names
- Technical terms (can keep English terms in Bangla docs)

**When to use Mixed:**
- Bangla explanations with English code examples
- Technical terms in English with Bangla context
- Section headers in English, content in Bangla

### File Naming Conventions

**Documentation files should follow this pattern:**

- `doc/[module-name]-[type]-bn.md` - For Bangla documentation
- `doc/[module-name]-[type].md` - For English documentation

**Examples:**
- `doc/logging-tracing-system-deep-dive-bn.md`
- `doc/payment-module-architecture-bn.md`
- `doc/messaging-system-deep-dive-bn.md`

---

## Module Documentation Status

**Last Updated:** 2025-11-29

This table tracks the documentation status of all major modules. When you modify any module, you MUST update its documentation and this table.

| Module | Documentation Status | File Path | Last Updated | Completeness | Notes |
|--------|---------------------|-----------|--------------|--------------|-------|
| **Logging & Tracing** | ✅ Complete | [doc/logging-tracing-system-deep-dive-bn.md](doc/logging-tracing-system-deep-dive-bn.md) | 2025-11-20 | 100% | Validation Timeline Display System added with comprehensive documentation (1900+ lines) |
| **Payment System** | ✅ Complete | doc/payment-module-architecture-bn.md | - | 100% | Escrow flow documented |
| **Messaging** | ✅ Complete | doc/messaging-system-deep-dive-bn.md | - | 100% | Socket.IO integration documented |
| **Diagram Generator** | ✅ Complete | [scripts/diagram-generator/README.md](scripts/diagram-generator/README.md) | 2025-11-29 | 95% | 🆕 Combined REST+Socket.IO flow diagrams, bug fixes documented |
| **Authentication** | ⚠️ Partial | CLAUDE.md (inline) | 2025-01-16 | 60% | Has flow docs, needs deep-dive |
| **File Upload** | ⚠️ Partial | CLAUDE.md (inline) | 2025-01-16 | 50% | Multi-provider documented, needs scenarios |
| **Query Builders** | ⚠️ Partial | CLAUDE.md (inline) | 2025-01-16 | 50% | Basic usage documented, needs advanced examples |
| **Socket.IO** | ⚠️ Partial | CLAUDE.md (inline) | 2025-01-16 | 50% | Event list documented, needs flow diagrams |
| **Error Handling** | ⚠️ Partial | CLAUDE.md (inline) | 2025-01-16 | 40% | Basic pattern documented |
| **Validation** | ⚠️ Partial | CLAUDE.md (inline) | 2025-01-16 | 40% | Zod schemas documented |

**Legend:**
- ✅ **Complete (90-100%)**: Comprehensive documentation with all required sections
- ⚠️ **Partial (40-89%)**: Basic documentation exists but needs expansion
- ❌ **Missing (0-39%)**: Little or no documentation

**Action Required:**
- Modules marked ⚠️ or ❌ should be prioritized for documentation expansion
- When creating new modules, add them to this table with initial status ❌
- Update "Last Updated" date when making changes

---

## Documentation Update Protocol

**Follow this protocol for EVERY code change:**

### Step 1: Identify Documentation Impact

**Before making changes, determine:**

□ Which module(s) will be affected?
□ Does documentation exist for this module? (Check Module Documentation Status table)
□ What is the current documentation location?
□ What type of change is this? (New feature, modification, bug fix, optimization)

### Step 2: Make Code Changes

Implement your changes as needed.

### Step 3: Update Documentation

**Immediately after code changes, update documentation:**

1. **Open the relevant documentation file**
   - If in `doc/` directory: Open that file
   - If in CLAUDE.md: Locate the relevant section
   - If no documentation exists: Create new file following naming conventions

2. **Add/Update the following:**
   - System overview (if new feature)
   - Architecture explanation (if design changed)
   - **Before/after code examples** (if modifying existing code)
   - **Exact line numbers** for code references
   - New configuration options (if any)
   - Integration points (if they changed)
   - Updated workflow/flow diagram
   - Technical rationale for changes
   - Performance impact analysis
   - New troubleshooting entries (if applicable)

3. **Follow the Quality Checklist:**
   - Include all applicable sections from "Documentation Quality Checklist"
   - Maintain consistent formatting with existing docs
   - Use proper Bangla grammar (if Bangla doc)
   - Ensure all code examples are tested and accurate

### Step 4: Update This File (CLAUDE.md)

**If you modified:**

- **Module Documentation Status table**: Update "Last Updated" and "Completeness"
- **Critical Architecture Concepts**: Update if architecture changed
- **Common Patterns**: Update if new patterns introduced
- **Environment Variables**: Update if new env vars added
- **Important Files**: Update if file purposes changed

### Step 5: Verify Completeness

**Use this verification checklist:**

□ Have I included all sections from the Quality Checklist?
□ Are all code examples accurate and tested?
□ Are line numbers correct and up-to-date?
□ Have I explained WHY (not just WHAT)?
□ Are there multiple examples showing different scenarios?
□ Is the Bangla text grammatically correct? (if applicable)
□ Have I updated cross-references in other docs?
□ Have I updated the Module Documentation Status table?

**If ANY checkbox is unchecked, documentation is INCOMPLETE.**

### Step 6: Final Review

**Before marking task complete:**

1. Re-read the documentation as if you're a new developer
2. Verify all links work
3. Check that code examples can be copy-pasted and used
4. Ensure technical terms are explained
5. Confirm formatting is consistent

---

## Documentation Example: The Gold Standard

**Reference:** [doc/logging-tracing-system-deep-dive-bn.md](doc/logging-tracing-system-deep-dive-bn.md)

This documentation serves as the **gold standard** for documentation quality in this codebase. When documenting ANY system, aim for this level of detail.

### What Makes It Excellent

**Recent Update Example: Query Display Format Change**

When the database query display format was changed in `requestLogger.ts`, the documentation update included:

#### ✅ Code Changes Section
- **Exact line numbers** for each change:
  - `formatExecutionStage()` helper: lines 104-136
  - `renderQueryMultiLine()` helper: lines 138-220
  - Fast queries section: lines 516-530
  - Moderate queries section: lines 532-546
  - Slow queries section: lines 548-562

- **Complete before/after code comparison** for each section
- **Summary table** showing all changes at a glance

#### ✅ Helper Functions Explanation
- Each function's purpose clearly stated
- Complete code implementation shown
- Input/output examples provided
- **Stage mapping table** with visual indicators
- Return value structure documented

#### ✅ Comprehensive Examples
- **4 different scenarios** provided:
  1. Fast query with good index usage
  2. Moderate aggregation query with pipeline
  3. Slow query without index (needs optimization)
  4. Multiple queries with mixed performance

- **For each scenario:**
  - Full output display
  - Detailed analysis (বিশ্লেষণ) in Bangla
  - Actionable recommendations
  - Recommended fixes with code

#### ✅ Implementation Details Section
- **Technical decisions explained:**
  - Why separate helper functions?
  - Why tree structure?
  - Why numbered queries?
  - Why conditional pipeline display?
  - Why dual format for execution stage?

- **Performance impact analysis:**
  - Benchmark data (0.5ms → 0.8ms per query)
  - Memory impact assessment
  - CPU overhead calculated
  - Conclusion on acceptability

- **Backward compatibility guarantees:**
  - What didn't change
  - Why it's safe to deploy
  - Test compatibility confirmed

#### ✅ Benefits Update
- Updated "সুবিধা ও বৈশিষ্ট্য" section
- Listed 9 specific improvements in relevant subsections
- Connected changes to user/developer experience

### Key Takeaways

**Follow this level of detail for ALL documentation updates:**

1. ✅ **Be Specific**: Exact line numbers, not "somewhere in the file"
2. ✅ **Show Examples**: Multiple real-world scenarios, not just one
3. ✅ **Explain Why**: Technical rationale, not just what changed
4. ✅ **Analyze Impact**: Performance, compatibility, user experience
5. ✅ **Provide Context**: Before/after, what problem this solves
6. ✅ **Make It Actionable**: Recommendations should be copy-pasteable
7. ✅ **Organize Well**: Tables, sections, hierarchical structure
8. ✅ **Update Related Sections**: Benefits, troubleshooting, etc.

**Documentation Length:**
- The query display update alone added **~400 lines** to the documentation
- This is expected and encouraged for significant changes
- Better to over-document than under-document

---

## Documentation Enforcement Rules

**⚠️ MANDATORY RULES - NEVER SKIP THESE:**

### Rule 1: No Code Without Docs

**NEVER commit code changes without updating documentation if:**

- ✋ You added a new file in `app/modules/`
- ✋ You modified any file listed in "Module Documentation Status" table
- ✋ You changed any architecture pattern mentioned in "Critical Architecture Concepts"
- ✋ You added/modified any middleware
- ✋ You changed database schema or models
- ✋ You added new environment variables
- ✋ You modified API endpoints or request/response format
- ✋ You changed authentication/authorization logic
- ✋ You updated payment processing flow
- ✋ You modified Socket.IO events or handlers
- ✋ You changed logging/tracing behavior
- ✋ You added new configuration options
- ✋ You optimized performance (queries, caching, etc.)

**Exception:** Only trivial changes (typo fixes, comment updates, formatting) can skip docs.

### Rule 2: Document Before Completion

**Documentation MUST be updated BEFORE you tell the user the task is complete.**

Flow:
1. Make code changes
2. Update documentation ← **MUST happen**
3. Verify documentation completeness
4. Update CLAUDE.md if needed
5. Mark task as complete ← **Only after steps 1-4**

### Rule 3: Create Docs If Missing

**If documentation file doesn't exist for a module:**

1. **Create it** following the file naming conventions
2. **Add it** to the Module Documentation Status table
3. **Link it** in the relevant CLAUDE.md section
4. **Write comprehensive docs** following the Quality Checklist
5. **Set completeness** to at least 60% (or mark as ❌ if placeholder)

**Don't just add inline comments and call it documented.**

### Rule 4: Maintain Existing Quality

**When updating existing documentation:**

- Match the existing writing style and tone
- Maintain the same level of detail
- Keep formatting consistent
- Update related sections (don't leave them outdated)
- Preserve Bangla grammar quality (if Bangla doc)

**If existing docs are poor quality, improve them while updating.**

### Rule 5: Line Numbers Must Be Accurate

**When referencing code in documentation:**

- Always provide exact line numbers
- Verify line numbers are current after your changes
- Update line numbers if file structure changed
- Use format: `src/app/logging/requestLogger.ts:104-136`

**Outdated line numbers make documentation useless.**

### Rule 6: Examples Must Work

**All code examples in documentation must:**

- Be syntactically correct
- Actually work if copy-pasted
- Use real variable/function names from the codebase
- Include necessary imports
- Handle edge cases shown

**Test examples before adding them to docs.**

### Rule 7: Explain Why, Not Just What

**Technical changes must include rationale:**

- Why this approach was chosen
- What alternatives were considered
- What trade-offs were made
- What problems this solves
- What benefits this provides

**"What changed" is not enough. "Why it changed" is required.**

---

## Pre-Commit Documentation Checklist

**Before completing any task, verify ALL of these:**

### Code Changes Review
□ Have I made changes to any files in these directories?
  - `app/modules/` → Check Module Documentation Status table
  - `app/middlewares/` → Update relevant module docs
  - `app/logging/` → Update logging documentation
  - `app/builder/` → Update query builder documentation
  - `app/helpers/` → Update relevant module docs
  - `config/` → Update configuration documentation

### Documentation File Updates
□ Have I updated the relevant documentation file?
□ Does the documentation file exist? (If not, created it)
□ Have I followed the Documentation Quality Checklist?
□ Have I included all applicable sections?

### Content Quality
□ Are all code examples accurate and tested?
□ Are line numbers correct and current?
□ Have I provided before/after comparisons? (if modifying existing code)
□ Have I explained WHY, not just WHAT?
□ Are there multiple examples for different scenarios?
□ Is technical rationale provided for decisions?
□ Is performance impact analyzed?

### Language & Formatting
□ Is Bangla text grammatically correct? (if Bangla doc)
□ Is formatting consistent with existing documentation?
□ Are all links working?
□ Are tables properly formatted?
□ Are code blocks properly syntax-highlighted?

### CLAUDE.md Updates
□ Have I updated "Module Documentation Status" table?
  - Last Updated date changed
  - Completeness percentage adjusted
□ Have I updated "Critical Architecture Concepts"? (if architecture changed)
□ Have I updated "Environment Variables"? (if new env vars added)
□ Have I updated "Common Patterns"? (if new patterns introduced)

### Cross-References
□ Have I updated related documentation sections?
□ Have I added cross-references where helpful?
□ Have I updated the table of contents? (if in dedicated doc file)

### Final Verification
□ Can a new developer understand this by reading the docs alone?
□ Are all technical terms explained?
□ Are troubleshooting steps provided? (if applicable)
□ Would I be proud to show this documentation to others?

---

**If ANY checkbox above is unchecked, the documentation update is INCOMPLETE.**

**Do not mark the task as complete until all checkboxes are checked.**

---

## Environment Variables

Required variables (see `.env.example` if exists):

```env
# Core
NODE_ENV=development
DATABASE_URL=mongodb://...
PORT=5000

# Security (REQUIRED)
BCRYPT_SALT_ROUNDS=12
JWT_SECRET=your-secret
JWT_EXPIRE_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRE_IN=7d

# Email (REQUIRED for auth)
EMAIL_FROM=noreply@example.com
EMAIL_USER=your-email
EMAIL_PASS=your-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Super Admin (seeded on startup)
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=secure-password

# OAuth (for Google login)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PLATFORM_FEE_PERCENTAGE=20

# Firebase (for push notifications)
FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=...

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000
```

## Common Patterns

### Error Handling

```typescript
// In controllers - wrap with catchAsync
export const createUser = catchAsync(async (req, res) => {
  // Errors automatically caught and sent to global error handler
  const result = await UserService.createUser(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'User created successfully',
    data: result
  });
});

// In services - throw ApiError
if (!user) {
  throw new ApiError(404, 'User not found');
}
```

### Validation

```typescript
// In route files
router.post(
  '/create',
  validateRequest(UserValidation.createUser), // Zod schema
  UserController.createUser
);

// In validation files (Zod schemas)
export const createUser = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email()
  })
});
```

### Database Queries with Pagination

```typescript
// Simple query with QueryBuilder
const queryBuilder = new QueryBuilder(
  User.find(),
  req.query
)
  .search(['name', 'email'])
  .filter()
  .sort()
  .paginate()
  .fields();

const result = await queryBuilder.modelQuery;
const pagination = queryBuilder.getPaginationMeta(await User.countDocuments());

// Complex aggregation
const builder = new AggregationBuilder(User, req.query)
  .match({ status: 'active' })
  .lookup('posts', 'userId', '_id', 'posts')
  .group({ _id: '$city', count: { $sum: 1 } })
  .sort()
  .paginate();

const { data, pagination } = await builder.execute();
```

### Response Format

All responses use this structure:
```typescript
{
  success: boolean;
  statusCode?: number;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    totalPage: number;
    total: number;
  };
  data?: T;
}
```

## Testing Notes

- Test framework: Vitest (similar to Jest)
- Test database: MongoDB Memory Server (automatic in-memory DB)
- HTTP testing: Use Supertest
- Setup file: `tests/setup/vitest.setup.ts`
- Path alias: `@/` maps to `src/`

## Important Files

- [src/app.ts](src/app.ts) - Express app configuration, middleware setup
- [src/server.ts](src/server.ts) - Server initialization, DB connection, Socket.IO
- [src/config/index.ts](src/config/index.ts) - Centralized config from environment
- [src/routes/index.ts](src/routes/index.ts) - Central route registration
- [src/app/middlewares/globalErrorHandler.ts](src/app/middlewares/globalErrorHandler.ts) - Error handling logic
- [src/app/logging/opentelemetry.ts](src/app/logging/opentelemetry.ts) - Observability setup
- [src/helpers/socketHelper.ts](src/helpers/socketHelper.ts) - Socket.IO initialization

## Logging & Observability Documentation

**⚠️ CRITICAL**: This codebase has a comprehensive logging and tracing system with detailed documentation.

### Required Reading Before Changes

**ALWAYS read [doc/logging-tracing-system-deep-dive-bn.md](doc/logging-tracing-system-deep-dive-bn.md) BEFORE:**
- Making any changes to logging/tracing code
- Modifying import order in app.ts or server.ts
- Updating instrumentation or metrics collection
- Adding new auto-labeling features
- Changing OpenTelemetry configuration

### What the Documentation Covers

The documentation provides complete details on:
- **Winston Logger**: BD timezone, dual logger system, daily file rotation
- **OpenTelemetry**: Timeline visualization, span exporters, auto-instrumentation
- **Auto-Labeling System**: How controllers/services are automatically instrumented
- **Request Context**: AsyncLocalStorage for per-request data isolation
- **Database Instrumentation**: Mongoose plugin system, explain() integration, **🆕 Enhanced query debugging (filter, sort, projection, caller location)**
- **Third-Party Patches**: bcrypt, JWT, Stripe SDK instrumentation
- **Client Detection**: Client Hints API implementation
- **Complete Request Flow**: Step-by-step lifecycle of a request

### Files Related to Logging System

If you modify ANY of these files, you MUST update the documentation:

**Core Logging:**
- [src/shared/logger.ts](src/shared/logger.ts) - Winston configuration
- [src/shared/morgen.ts](src/shared/morgen.ts) - Morgan HTTP logging
- [src/app/logging/opentelemetry.ts](src/app/logging/opentelemetry.ts) - OpenTelemetry SDK & Timeline exporter
- [src/app/logging/requestLogger.ts](src/app/logging/requestLogger.ts) - Detailed request/response logging

**Instrumentation:**
- [src/app/logging/autoLabelBootstrap.ts](src/app/logging/autoLabelBootstrap.ts) - Auto-discovery and wrapping
- [src/app/logging/mongooseMetrics.ts](src/app/logging/mongooseMetrics.ts) - Database query instrumentation
- [src/app/logging/patchBcrypt.ts](src/app/logging/patchBcrypt.ts) - bcrypt instrumentation
- [src/app/logging/patchJWT.ts](src/app/logging/patchJWT.ts) - JWT instrumentation
- [src/app/logging/patchStripe.ts](src/app/logging/patchStripe.ts) - Stripe SDK instrumentation

**Context & Helpers:**
- [src/app/logging/requestContext.ts](src/app/logging/requestContext.ts) - AsyncLocalStorage context management
- [src/app/logging/clientInfo.ts](src/app/logging/clientInfo.ts) - Client Hints detection
- [src/app/logging/corsLogger.ts](src/app/logging/corsLogger.ts) - CORS debugging
- [src/app/logging/loadOrderValidator.ts](src/app/logging/loadOrderValidator.ts) - Import order validation

### Documentation Update Requirements

**You MUST update the documentation when:**
- Changing critical import order or load sequence
- Modifying auto-labeling discovery or wrapping mechanism
- Adding/removing OpenTelemetry spans or exporters
- Changing database query instrumentation logic
- Updating AsyncLocalStorage context structure
- Adding new third-party library patches
- Modifying metrics collection (DB, cache, external APIs)
- Changing timeline visualization format
- Adding new logging middleware

**How to update:**
1. Read the current documentation first to understand structure
2. Make your code changes
3. Update relevant sections in the documentation with:
   - New code examples
   - Updated flow diagrams
   - Changed configuration options
   - New features or capabilities
4. Keep the Bangla language consistent
5. Ensure all code snippets are accurate and tested

### Quick Reference

**When debugging logging issues:**
- Check import order first (see "Critical Architecture Concepts" section above)
- Verify AsyncLocalStorage context is initialized
- Ensure auto-labeling completed successfully (check startup logs)
- Check OpenTelemetry SDK initialization

**Common tasks:**
- Add new instrumentation → Read "Third-Party Patches" section
- Track new metrics → Read "Request Context" section
- Modify timeline display → Read "OpenTelemetry" section
- Debug missing spans → Read "Auto-Labeling System" section

## Documentation

Extensive Bangla documentation available in `doc/` directory:
- **Logging and tracing system deep dive** (MUST READ for logging work)
- Payment module architecture and escrow flow
- Messaging system deep dive
- Request logging and auto-labeling system
- Stripe integration guide
- Google OAuth setup guide