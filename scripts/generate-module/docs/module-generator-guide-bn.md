# Module Generator - সম্পূর্ণ ডকুমেন্টেশন (বাংলা)

**Version:** 1.0.0
**Last Updated:** 2025-11-25
**Author:** Claude Code Generator

---

## 📋 সূচিপত্র

1. [সিস্টেম ওভারভিউ](#১-সিস্টেম-ওভারভিউ)
2. [ইনস্টলেশন ও সেটআপ](#২-ইনস্টলেশন-ও-সেটআপ)
3. [কীভাবে ব্যবহার করবেন](#৩-কীভাবে-ব্যবহার-করবেন)
4. [আর্কিটেকচার ডিজাইন](#৪-আর্কিটেকচার-ডিজাইন)
5. [স্মার্ট ডিটেকশন সিস্টেম](#৫-স্মার্ট-ডিটেকশন-সিস্টেম)
6. [টাইপ ম্যাপিং সিস্টেম](#৬-টাইপ-ম্যাপিং-সিস্টেম)
7. [টেমপ্লেট সিস্টেম](#৭-টেমপ্লেট-সিস্টেম)
8. [জেনারেটেড ফাইল বিশ্লেষণ](#৮-জেনারেটেড-ফাইল-বিশ্লেষণ)
9. [অ্যাডভান্সড ফিচার](#৯-অ্যাডভান্সড-ফিচার)
10. [সমস্যা সমাধান](#১০-সমস্যা-সমাধান)

---

## ১. সিস্টেম ওভারভিউ

### ১.১ এটি কী?

**Module Generator** একটি শক্তিশালী কোড জেনারেশন টুল যা TypeScript interface থেকে সম্পূর্ণ CRUD module তৈরি করে।

### ১.২ কেন এটি প্রয়োজন?

একটি নতুন module তৈরি করতে সাধারণত প্রয়োজন:
- ✍️ Interface লেখা
- ✍️ Model লেখা (Mongoose schema)
- ✍️ Service লেখা (business logic)
- ✍️ Controller লেখা (request handlers)
- ✍️ Validation লেখা (Zod schemas)
- ✍️ Routes লেখা (Express routes)
- ✍️ Central routes এ register করা

**সময় লাগে:** 2-3 ঘণ্টা
**Errors এর সম্ভাবনা:** High (typos, pattern mismatch, import errors)

**Module Generator দিয়ে:**
- ✅ শুধু interface লিখুন
- ✅ একটি command run করুন
- ✅ ২ মিনিটে সব কিছু ready!

### ১.৩ মূল বৈশিষ্ট্য

#### 🎯 **স্বয়ংক্রিয় সনাক্তকরণ (Auto Detection)**
- Field types detect করে (string, number, enum, reference, etc.)
- File upload fields identify করে
- Searchable fields খুঁজে বের করে
- Reference relationships বুঝে নেয়
- Enums extract করে

#### 🏗️ **সম্পূর্ণ Code Generation**
- Model file (Mongoose schema + indexes + hooks)
- Service file (CRUD operations + QueryBuilder)
- Controller file (request handlers + catchAsync)
- Validation file (Zod schemas)
- Route file (Express routes + auth + validation)

#### ⚡ **Production-Ready Output**
- Type-safe code
- Error handling built-in
- Authentication & authorization configured
- Pagination & search ready
- File upload support
- Properly formatted (Prettier)
- TypeScript validated

#### 🔄 **Automatic Integration**
- Routes automatically registered
- Imports auto-added
- Follows existing codebase patterns
- Zero manual configuration

---

## ২. ইনস্টলেশন ও সেটআপ

### ২.১ Prerequisites

নিশ্চিত করুন যে আপনার সিস্টেমে আছে:
- Node.js (v16+)
- npm or yarn
- TypeScript (v5+)
- Existing project structure

### ২.২ Dependencies

Generator ইতিমধ্যে installed আছে। Dependencies:

```json
{
  "devDependencies": {
    "inquirer": "^8.2.5",      // Interactive CLI prompts
    "chalk": "^4.1.2",         // Colored terminal output
    "ora": "^5.4.1",           // Spinners
    "handlebars": "^4.7.8",    // Template engine
    "typescript": "^5.0.0",    // TypeScript compiler
    "prettier": "^3.0.0"       // Code formatting
  }
}
```

### ২.৩ Verification

Generator টি কাজ করছে কিনা check করুন:

```bash
npm run generate:module -- --help
```

যদি error না আসে, তাহলে সব ঠিক আছে!

---

## ৩. কীভাবে ব্যবহার করবেন

### ৩.১ দ্রুত শুরু (Quick Start)

#### Step 1: Interface তৈরি করুন

```bash
# Module directory তৈরি করুন
mkdir -p src/app/modules/product
```

Interface file তৈরি করুন:

```typescript
// src/app/modules/product/product.interface.ts
import { Model, Types } from 'mongoose';

export enum PRODUCT_CATEGORY {
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
  BOOKS = 'BOOKS',
}

export type IProduct = {
  title: string;
  price: number;
  category: PRODUCT_CATEGORY;
  seller: Types.ObjectId;
  images?: string[];
  description?: string;
};

export type ProductModel = Model<IProduct>;
```

#### Step 2: Generator চালান

```bash
npm run generate:module
```

#### Step 3: Module name লিখুন

```
? Module name: product
```

#### Step 4: Confirmation দিন

```
📋 Configuration Summary:
Fields: 6
File Upload: images
Searchable: title, description

? Generate module with these settings? (Y/n) Y
```

#### Step 5: Done! 🎉

```
✅ Module Generated Successfully!

Files Created: 5
Total Lines: 812

🔗 API Endpoints:
  POST   /api/v1/products
  GET    /api/v1/products
  GET    /api/v1/products/:id
  PATCH  /api/v1/products/:id
  DELETE /api/v1/products/:id
```

### ৩.২ Terminal Output বিশ্লেষণ

Generator run করলে আপনি দেখবেন:

```
🚀 Module Generator v1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Module name: product

✓ Module name: product

🔍 Searching for interface file...
  Looking at: src/app/modules/product/product.interface.ts
✓ Found interface file!

📖 Parsing TypeScript interface...
✓ Parsed successfully

⏳ Analyzing...
  ✓ Detected 6 fields
  ✓ Found 1 enum (PRODUCT_CATEGORY)
  ✓ Detected file upload: images
  ✓ Detected searchable fields: title, description
✓ Analysis complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Configuration Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Module: product
Route: /api/v1/products

📝 Fields (6):
  • title                 [string, required, searchable]
  • price                 [number, required]
  • category              [enum: PRODUCT_CATEGORY, required]
  • seller                [reference: User, required]
  • images                [array<string>, optional, file upload]
  • description           [string, optional, searchable]

🎨 Features:
  ✓ Timestamps
  ✓ File Upload
  ✓ Search
  ✓ Authentication
  ✓ Validation

🔐 Authentication Roles:
  CREATE  → POSTER, TASKER
  READ    → GUEST
  UPDATE  → POSTER, TASKER
  DELETE  → SUPER_ADMIN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Generate module with these settings? (Y/n) Y

✨ Starting generation...

✓ Generated 5 files
  ✓ product.model.ts (156 lines)
  ✓ product.service.ts (218 lines)
  ✓ product.controller.ts (147 lines)
  ✓ product.validation.ts (128 lines)
  ✓ product.route.ts (82 lines)

✓ Routes registered
✓ Files formatted
✓ TypeScript check passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Module Generated Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
  Files Created: 5
  Total Lines: 731

🔗 API Endpoints:
  POST   /api/v1/products               (Create)
  GET    /api/v1/products               (Get All + Search)
  GET    /api/v1/products/:id           (Get By ID)
  PATCH  /api/v1/products/:id           (Update)
  DELETE /api/v1/products/:id           (Delete)

📚 Next Steps:
  1. Review files: src/app/modules/product/
  2. Test endpoints: npm run dev
  3. Add custom logic in service if needed

🎉 Module is ready to use!
```

### ৩.৩ জেনারেটেড ফাইল কোথায় পাবেন?

```
src/app/modules/product/
├── product.interface.ts     (আপনার লেখা)
├── product.model.ts         (জেনারেট হয়েছে)
├── product.service.ts       (জেনারেট হয়েছে)
├── product.controller.ts    (জেনারেট হয়েছে)
├── product.validation.ts    (জেনারেট হয়েছে)
└── product.route.ts         (জেনারেট হয়েছে)
```

Plus:
```
src/routes/index.ts          (আপডেট হয়েছে - auto registration)
```

---

## ৪. আর্কিটেকচার ডিজাইন

### ৪.১ সিস্টেম কম্পোনেন্ট

Generator নিম্নলিখিত components নিয়ে গঠিত:

```
scripts/generate-module/
│
├── index.js                    # CLI Entry Point
│   └─> Main orchestrator
│
├── core/                       # Core Logic
│   ├── parser.js              # TypeScript AST Parser
│   ├── detector.js            # Smart Feature Detection
│   ├── generator.js           # File Generation Orchestrator
│   ├── route-registrar.js     # Route Auto-registration
│   └── post-processor.js      # Prettier + TS Validation
│
├── builders/                   # File Builders
│   ├── base-builder.js        # Handlebars Helpers
│   ├── model-builder.js       # Model File Generator
│   ├── service-builder.js     # Service File Generator
│   ├── controller-builder.js  # Controller File Generator
│   ├── validation-builder.js  # Validation File Generator
│   └── route-builder.js       # Route File Generator
│
├── templates/                  # Handlebars Templates
│   ├── model.hbs
│   ├── service.hbs
│   ├── controller.hbs
│   ├── validation.hbs
│   └── route.hbs
│
└── utils/                      # Utilities
    ├── string-helpers.js      # String Transformations
    └── type-mapper.js         # Type Mapping System
```

### ৪.২ Data Flow (তথ্য প্রবাহ)

```
┌─────────────────────────────────────────────────────┐
│  User Input: Module Name                           │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Find & Read Interface File                        │
│  (src/app/modules/{name}/{name}.interface.ts)      │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Parse TypeScript Interface (AST)                   │
│  • Extract fields                                   │
│  • Extract enums                                    │
│  • Extract imports                                  │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Smart Detection                                    │
│  • Detect field types                               │
│  • Detect file upload fields                        │
│  • Detect searchable fields                         │
│  • Detect references                                │
│  • Detect timestamps                                │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Show Preview & Get Confirmation                    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Generate Files (5 files)                           │
│  ┌──────────────────────────────────────┐           │
│  │  1. Model Builder                    │           │
│  │     • Map types: TS → Mongoose       │           │
│  │     • Build schema                   │           │
│  │     • Add indexes                    │           │
│  └──────────────────────────────────────┘           │
│  ┌──────────────────────────────────────┐           │
│  │  2. Service Builder                  │           │
│  │     • CRUD operations                │           │
│  │     • QueryBuilder integration       │           │
│  │     • Populate references            │           │
│  └──────────────────────────────────────┘           │
│  ┌──────────────────────────────────────┐           │
│  │  3. Controller Builder               │           │
│  │     • Request handlers               │           │
│  │     • catchAsync wrapper             │           │
│  │     • sendResponse pattern           │           │
│  └──────────────────────────────────────┘           │
│  ┌──────────────────────────────────────┐           │
│  │  4. Validation Builder               │           │
│  │     • Map types: TS → Zod            │           │
│  │     • Create/Update schemas          │           │
│  │     • Param validation               │           │
│  └──────────────────────────────────────┘           │
│  ┌──────────────────────────────────────┐           │
│  │  5. Route Builder                    │           │
│  │     • REST endpoints                 │           │
│  │     • Auth middleware                │           │
│  │     • File upload middleware         │           │
│  │     • Validation middleware          │           │
│  └──────────────────────────────────────┘           │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Auto Register Routes                               │
│  • Add import to src/routes/index.ts                │
│  • Add route entry to apiRoutes array               │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Post-Processing                                    │
│  • Format with Prettier                             │
│  • Validate TypeScript (tsc --noEmit)               │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  Success! Module Ready                              │
└─────────────────────────────────────────────────────┘
```

### ৪.৩ প্রতিটি Component এর ভূমিকা

#### **১. Parser (parser.js)**

**দায়িত্ব:** TypeScript interface file parse করা

**কীভাবে কাজ করে:**
- TypeScript Compiler API ব্যবহার করে AST (Abstract Syntax Tree) তৈরি করে
- AST traverse করে fields, enums, imports extract করে
- প্রতিটি field এর type, name, optional/required detect করে

**Input:**
```typescript
export type IProduct = {
  title: string;
  price: number;
};
```

**Output:**
```javascript
{
  fields: [
    { name: 'title', type: 'string', required: true },
    { name: 'price', type: 'number', required: true }
  ]
}
```

#### **২. Detector (detector.js)**

**দায়িত্ব:** Parsed data থেকে features detect করা

**Detection Rules:**

| Feature | Detection Logic |
|---------|----------------|
| **File Upload** | Field name contains: `image`, `images`, `avatar`, `thumbnail`, `file`, `files` |
| **Searchable** | Type: `string` + Name contains: `title`, `name`, `description`, `content` |
| **Reference** | Type: `Types.ObjectId` |
| **Timestamps** | Fields named `createdAt` and `updatedAt` exist |
| **Enum** | Enum declaration or union type detected |

**Input:**
```javascript
{
  fields: [
    { name: 'title', type: 'string' },
    { name: 'images', type: 'array', subtype: 'string' },
    { name: 'seller', type: 'reference' }
  ]
}
```

**Output:**
```javascript
{
  features: {
    fileUpload: true,    // 'images' detected
    search: true,        // 'title' detected
  },
  fileUploadFields: [{ name: 'images', isArray: true }],
  searchableFields: ['title'],
  referenceFields: [{ name: 'seller', ref: 'User' }]
}
```

#### **৩. Type Mapper (type-mapper.js)**

**দায়িত্ব:** TypeScript types কে Mongoose ও Zod types এ convert করা

**Mapping Table:**

| TypeScript | Mongoose | Zod |
|------------|----------|-----|
| `string` | `String` | `z.string()` |
| `number` | `Number` | `z.number()` |
| `boolean` | `Boolean` | `z.boolean()` |
| `Date` | `Date` | `z.string().datetime()` |
| `Types.ObjectId` | `Schema.Types.ObjectId` | `z.string().regex(/^[0-9a-fA-F]{24}$/)` |
| `ENUM_NAME` | `String + enum: Object.values(ENUM_NAME)` | `z.enum(Object.values(ENUM_NAME))` |
| `string[]` | `[String]` | `z.array(z.string())` |

**Example:**

TypeScript field:
```typescript
title: string;
```

Mongoose schema:
```typescript
title: {
  type: String,
  required: true,
  trim: true,
}
```

Zod validation:
```typescript
title: z.string({ required_error: 'Title is required' })
  .min(1, 'Title cannot be empty')
```

#### **৪. Template System (Handlebars)**

**দায়িত্ব:** Dynamic code generation

**Handlebars Helpers:**

```javascript
// String transformations
{{pascalCase moduleName}}    // product → Product
{{camelCase moduleName}}     // product → product
{{pluralize moduleName}}     // product → products

// Conditionals
{{#if hasEnums}}...{{/if}}
{{#unless optional}}...{{/unless}}

// Loops
{{#each fields}}
  {{name}}: {{type}}
{{/each}}

// Custom
{{mongooseOpt field}}        // Generate Mongoose options
```

**Template Example:**

```handlebars
export const {{pascalCase}} = model<I{{pascalCase}}, {{pascalCase}}Model>(
  '{{pascalCase}}',
  {{camelCase}}Schema
);
```

**Output:**
```typescript
export const Product = model<IProduct, ProductModel>(
  'Product',
  productSchema
);
```

---

## ৫. স্মার্ট ডিটেকশন সিস্টেম

### ৫.১ Field Type Detection

Generator সকল TypeScript types সঠিকভাবে detect করে:

#### **Primitive Types:**

```typescript
// String
name: string;              // ✓ Detected as: string
description?: string;      // ✓ Detected as: string, optional

// Number
price: number;             // ✓ Detected as: number
quantity?: number;         // ✓ Detected as: number, optional

// Boolean
isActive: boolean;         // ✓ Detected as: boolean
verified?: boolean;        // ✓ Detected as: boolean, optional

// Date
createdAt: Date;           // ✓ Detected as: date
publishedAt?: Date;        // ✓ Detected as: date, optional
```

#### **Reference Types:**

```typescript
// MongoDB ObjectId
seller: Types.ObjectId;    // ✓ Detected as: reference
                          // ✓ Auto-guess ref: 'User'

userId: Types.ObjectId;    // ✓ Detected as: reference
                          // ✓ Auto-guess ref: 'User'

categoryId: Types.ObjectId; // ✓ Detected as: reference
                           // ✓ Auto-guess ref: 'Category'
```

**Reference Model Guessing Rules:**

| Field Name | Guessed Reference Model |
|------------|------------------------|
| `user` | User |
| `seller` | User |
| `owner` | User |
| `author` | User |
| `creator` | User |
| `buyer` | User |
| `userId` | User |
| `categoryId` | Category |
| `productId` | Product |
| `{name}Id` | PascalCase({name}) |

#### **Enum Types:**

```typescript
// Enum declaration
export enum PRODUCT_STATUS {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

status: PRODUCT_STATUS;    // ✓ Detected as: enum
                          // ✓ Enum type: PRODUCT_STATUS

// Inline union type
type Status = 'ACTIVE' | 'INACTIVE';
status: Status;            // ✓ Detected as: enum (inline)
```

#### **Array Types:**

```typescript
// String array
tags: string[];            // ✓ Detected as: array<string>
keywords?: string[];       // ✓ Detected as: array<string>, optional

// Number array
ratings: number[];         // ✓ Detected as: array<number>

// Reference array
participants: Types.ObjectId[];  // ✓ Detected as: array<reference>
```

### ৫.২ File Upload Detection

Generator file upload fields automatically detect করে।

#### **Detection Pattern:**

Field name এ যদি এই words থাকে:

```
image, images, avatar, thumbnail, photo, photos,
picture, pictures, file, files, document, documents,
attachment, attachments
```

এবং type যদি হয়:
- `string` (single file), অথবা
- `string[]` (multiple files)

তাহলে file upload field হিসেবে detect হবে।

#### **Examples:**

```typescript
// ✓ Detected as file upload (single)
avatar: string;
thumbnail: string;
profilePicture: string;

// ✓ Detected as file upload (multiple)
images: string[];
photos: string[];
documents: string[];
attachments: string[];

// ✗ NOT detected as file upload
url: string;               // 'url' is not a file keyword
description: string;       // 'description' is not a file keyword
```

#### **File Type Detection:**

Field name থেকে file type ও guess করা হয়:

| Field Name Pattern | Detected File Type |
|-------------------|-------------------|
| `image`, `images`, `photo`, `avatar`, `thumbnail` | `['image']` |
| `video`, `videos` | `['video']` |
| `document`, `documents`, `file` | `['document']` |
| অন্যান্য | `['image']` (default) |

#### **Generated Middleware:**

File upload detect হলে route এ automatic `fileHandler` middleware add হয়:

```typescript
router.post(
  '/',
  auth(USER_ROLES.POSTER),
  fileHandler(['images']),        // ✓ Auto-added!
  validateRequest(ProductValidation.createProductZodSchema),
  ProductController.createProduct
);
```

### ৫.৩ Searchable Field Detection

Generator string fields থেকে searchable fields detect করে।

#### **Detection Rules:**

একটি field searchable হিসেবে detect হয় যদি:

1. ✅ Type: `string`
2. ✅ Name common searchable patterns এর সাথে match করে
3. ❌ File upload field না হয়
4. ❌ Name এ 'id' বা 'Id' না থাকে
5. ❌ Name 2 characters এর বেশি

#### **Common Searchable Patterns:**

```
title, name, description, content, text,
bio, summary, note, comment, message, caption
```

#### **Examples:**

```typescript
// ✓ Detected as searchable
title: string;
name: string;
description: string;
bio: string;
content: string;
summary: string;

// ✗ NOT searchable
price: number;             // Not string type
images: string[];          // File upload field
userId: string;            // Contains 'Id'
id: string;                // Contains 'id'
```

#### **Generated Code:**

Searchable fields detect হলে:

**Service file এ QueryBuilder:**
```typescript
const queryBuilder = new QueryBuilder(Product.find(), query)
  .search(['title', 'description'])  // ✓ Auto-added!
  .filter()
  .sort()
  .paginate();
```

**Model file এ Text Index:**
```typescript
productSchema.index({ title: 'text', description: 'text' });
```

### ৫.৪ Timestamp Detection

যদি interface এ `createdAt` এবং `updatedAt` উভয় field থাকে:

```typescript
export type IProduct = {
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
};
```

তাহলে:

**Model schema তে:**
```typescript
const productSchema = new Schema<IProduct>(
  { ... },
  {
    timestamps: true,    // ✓ Auto-enabled!
    versionKey: false,
  }
);
```

### ৫.৫ Index Detection

Generator automatically indexes create করে:

#### **Text Search Index:**

যদি searchable fields থাকে:

```typescript
productSchema.index({ title: 'text', description: 'text' });
```

#### **Reference Field Index:**

যদি reference fields থাকে:

```typescript
productSchema.index({ seller: 1 });
productSchema.index({ categoryId: 1 });
```

#### **Compound Index:**

Multiple references এর জন্য:

```typescript
productSchema.index({ seller: 1, category: 1 });
```

---

## ৬. টাইপ ম্যাপিং সিস্টেম

### ৬.১ String Type Mapping

#### **TypeScript → Mongoose:**

```typescript
// Input
title: string;

// Mongoose Schema
title: {
  type: String,
  required: true,
  trim: true,
}
```

**Optional field:**
```typescript
// Input
description?: string;

// Mongoose Schema
description: {
  type: String,
  trim: true,
}
```

#### **TypeScript → Zod:**

```typescript
// Required field
title: z.string({ required_error: 'Title is required' })
  .min(1, 'Title cannot be empty')

// Optional field
description: z.string().optional()
```

### ৬.২ Number Type Mapping

```typescript
// Input
price: number;

// Mongoose
price: {
  type: Number,
  required: true,
}

// Zod
price: z.number({ required_error: 'Price is required' })
```

### ৬.৩ Enum Type Mapping

```typescript
// Input
export enum PRODUCT_CATEGORY {
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
}

category: PRODUCT_CATEGORY;

// Mongoose
category: {
  type: String,
  enum: Object.values(PRODUCT_CATEGORY),
  required: true,
}

// Zod
category: z.enum(Object.values(PRODUCT_CATEGORY) as [string, ...string[]])
```

### ৬.৪ Reference Type Mapping

```typescript
// Input
seller: Types.ObjectId;

// Mongoose
seller: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true,
  index: true,
}

// Zod
seller: z.string({ required_error: 'Seller is required' })
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid seller format')
```

### ৬.৫ Array Type Mapping

```typescript
// Input
tags: string[];

// Mongoose
tags: {
  type: [String],
  default: [],
}

// Zod
tags: z.array(z.string()).optional()
```

---

## ৭. টেমপ্লেট সিস্টেম

### ৭.১ Model Template বিশ্লেষণ

**Template File:** `templates/model.hbs`

```handlebars
import { Schema, model } from 'mongoose';
{{#if hasEnums}}
import { I{{pascalCase}}, {{pascalCase}}Model{{#each enums}}, {{name}}{{/each}} } from './{{moduleName}}.interface';
{{else}}
import { I{{pascalCase}}, {{pascalCase}}Model } from './{{moduleName}}.interface';
{{/if}}

const {{camelCase}}Schema = new Schema<I{{pascalCase}}, {{pascalCase}}Model>(
  {
{{#each fields}}
{{#unless (isTimestampField name)}}
    {{name}}: {{{mongooseOptions}}},
{{/unless}}
{{/each}}
  },
  {
    timestamps: {{timestamps}},
    versionKey: false,
  }
);

{{#if hasIndexes}}
// Indexes
{{#each indexes}}
{{camelCase ../moduleName}}Schema.index({{{this}}});
{{/each}}
{{/if}}

// Static methods
{{camelCase}}Schema.statics.isExistById = async (id: string) => {
  return await {{pascalCase}}.findById(id);
};

export const {{pascalCase}} = model<I{{pascalCase}}, {{pascalCase}}Model>(
  '{{pascalCase}}',
  {{camelCase}}Schema
);
```

**Template Variables:**

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `moduleName` | `product` | Module name (lowercase) |
| `pascalCase` | `Product` | PascalCase module name |
| `camelCase` | `product` | camelCase module name |
| `hasEnums` | `true` | Whether enums exist |
| `enums` | `[{name: 'PRODUCT_CATEGORY'}]` | Enum list |
| `fields` | `[{name: 'title', ...}]` | Field list |
| `timestamps` | `true` | Enable timestamps |
| `hasIndexes` | `true` | Whether indexes exist |
| `indexes` | `[{title: 'text'}]` | Index definitions |

**Generated Output Example:**

```typescript
import { Schema, model } from 'mongoose';
import { IProduct, ProductModel, PRODUCT_CATEGORY } from './product.interface';

const productSchema = new Schema<IProduct, ProductModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(PRODUCT_CATEGORY),
      required: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ seller: 1 });

// Static methods
productSchema.statics.isExistById = async (id: string) => {
  return await Product.findById(id);
};

export const Product = model<IProduct, ProductModel>(
  'Product',
  productSchema
);
```

### ৭.২ Service Template বিশ্লেষণ

Service template CRUD operations সহ business logic generate করে:

```typescript
const getAllProductsFromDB = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(Product.find(), query)
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await queryBuilder.modelQuery
    .populate('seller', 'name email profilePicture');

  const pagination = await queryBuilder.getPaginationInfo();

  return { data, pagination };
};
```

---

## ৮. জেনারেটেড ফাইল বিশ্লেষণ

### ৮.১ Model File (product.model.ts)

**Line Count:** ~150 lines

**Key Components:**

1. **Imports:**
   ```typescript
   import { Schema, model } from 'mongoose';
   import { IProduct, ProductModel, PRODUCT_CATEGORY } from './product.interface';
   ```

2. **Schema Definition:**
   - সকল fields with proper types
   - Validation rules (required, enum, etc.)
   - Default values
   - References with `ref`

3. **Schema Options:**
   ```typescript
   {
     timestamps: true,    // Auto createdAt/updatedAt
     versionKey: false,   // Remove __v
   }
   ```

4. **Indexes:**
   - Text search index for searchable fields
   - Single field indexes for references
   - Compound indexes if needed

5. **Static Methods:**
   ```typescript
   productSchema.statics.isExistById = async (id: string) => {
     return await Product.findById(id);
   };
   ```

6. **Model Export:**
   ```typescript
   export const Product = model<IProduct, ProductModel>(
     'Product',
     productSchema
   );
   ```

### ৮.২ Service File (product.service.ts)

**Line Count:** ~200-250 lines

**CRUD Operations:**

#### **1. Create Operation:**

```typescript
const createProductToDB = async (payload: Partial<IProduct>): Promise<IProduct> => {
  const result = await Product.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Product');
  }
  return result;
};
```

**Features:**
- Error handling with ApiError
- Type-safe payload
- Returns created document

#### **2. Get By ID:**

```typescript
const getProductByIdFromDB = async (id: string): Promise<IProduct> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Product ID');
  }

  const result = await Product.findById(id)
    .populate('seller', 'name email profilePicture');

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }

  return result;
};
```

**Features:**
- ID validation
- Auto-populate references
- Not found handling

#### **3. Get All with Search & Pagination:**

```typescript
const getAllProductsFromDB = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(Product.find(), query)
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await queryBuilder.modelQuery
    .populate('seller', 'name email profilePicture');

  const pagination = await queryBuilder.getPaginationInfo();

  return { data, pagination };
};
```

**Features:**
- QueryBuilder integration
- Search in multiple fields
- Filter, sort, pagination
- Field selection
- Auto-populate

#### **4. Update:**

```typescript
const updateProductToDB = async (
  id: string,
  payload: Partial<IProduct>
): Promise<IProduct | null> => {
  const isExist = await Product.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }

  const result = await Product.findByIdAndUpdate(id, payload, { new: true });
  return result;
};
```

**Features:**
- Existence check
- Partial update support
- Return updated document

#### **5. Delete:**

```typescript
const deleteProductFromDB = async (id: string): Promise<IProduct | null> => {
  const result = await Product.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }
  return result;
};
```

**Features:**
- Not found handling
- Returns deleted document

#### **Service Export:**

```typescript
export const ProductService = {
  createProductToDB,
  getProductByIdFromDB,
  getAllProductsFromDB,
  updateProductToDB,
  deleteProductFromDB,
};
```

### ৮.৩ Controller File (product.controller.ts)

**Line Count:** ~140-160 lines

**Pattern:** Thin controllers - শুধু request/response handling

#### **Create Controller:**

```typescript
const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.createProductToDB(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Product created successfully',
    data: result,
  });
});
```

**Features:**
- `catchAsync` wrapper (auto error handling)
- Service call
- Standardized response format

#### **Get All Controller:**

```typescript
const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getAllProductsFromDB(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Products retrieved successfully',
    pagination: result.pagination,  // ✓ Pagination included
    data: result.data,
  });
});
```

**Controller Export:**

```typescript
export const ProductController = {
  createProduct,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct,
};
```

### ৮.৪ Validation File (product.validation.ts)

**Line Count:** ~120-140 lines

#### **Create Schema:**

```typescript
const createProductZodSchema = z.object({
  body: z
    .object({
      title: z.string({ required_error: 'Title is required' })
        .min(1, 'Title cannot be empty'),
      price: z.number({ required_error: 'Price is required' }),
      category: z.enum(Object.values(PRODUCT_CATEGORY) as [string, ...string[]]),
      seller: z.string({ required_error: 'Seller is required' })
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid seller format'),
      images: z.array(z.string()).optional(),
      description: z.string().optional(),
    })
    .strict(),  // Reject unknown fields
});
```

#### **Update Schema:**

```typescript
const updateProductZodSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).optional(),
      price: z.number().optional(),
      category: z.enum(Object.values(PRODUCT_CATEGORY) as [string, ...string[]]).optional(),
      images: z.array(z.string()).optional(),
      description: z.string().optional(),
    })
    .strict(),
});
```

**Note:** Update schema তে সব fields optional

#### **Get By ID Schema:**

```typescript
const getProductByIdZodSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID format'),
  }),
});
```

### ৮.৫ Route File (product.route.ts)

**Line Count:** ~80-100 lines

#### **Full Route Configuration:**

```typescript
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { ProductController } from './product.controller';
import { ProductValidation } from './product.validation';

const router = express.Router();

// CREATE
router.post(
  '/',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER),
  fileHandler(['images']),  // ✓ Auto-added if file upload detected
  validateRequest(ProductValidation.createProductZodSchema),
  ProductController.createProduct
);

// GET ALL
router.get(
  '/',
  auth(USER_ROLES.GUEST),  // Public access
  ProductController.getAllProducts
);

// GET BY ID
router.get(
  '/:id',
  auth(USER_ROLES.GUEST),
  ProductController.getProductById
);

// UPDATE
router.patch(
  '/:id',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER),
  fileHandler(['images']),
  validateRequest(ProductValidation.updateProductZodSchema),
  ProductController.updateProduct
);

// DELETE
router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),  // Only admin can delete
  ProductController.deleteProduct
);

export const ProductRoutes = router;
```

**Middleware Stack:**

1. `auth()` - Authentication & role-based authorization
2. `fileHandler()` - File upload handling (if needed)
3. `validateRequest()` - Zod validation
4. Controller function

---

## ৯. অ্যাডভান্সড ফিচার

### ৯.১ Custom Business Logic যোগ করা

Generator একটি base structure তৈরি করে। আপনি custom logic add করতে পারেন।

#### **Service File এ Custom Logic:**

```typescript
// Generated code
const createProductToDB = async (payload: Partial<IProduct>): Promise<IProduct> => {
  const result = await Product.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Product');
  }
  return result;
};

// Add custom logic
const createProductToDB = async (
  payload: Partial<IProduct>,
  userId: string  // Custom parameter
): Promise<IProduct> => {
  // Custom validation
  if (payload.price < 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Price cannot be negative');
  }

  // Auto-set seller
  payload.seller = new mongoose.Types.ObjectId(userId);

  // Auto-generate slug
  if (payload.title) {
    payload.slug = payload.title.toLowerCase().replace(/\s+/g, '-');
  }

  const result = await Product.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Product');
  }

  // Send notification (custom logic)
  await sendNotificationToAdmin('New product created', result);

  return result;
};
```

#### **Model এ Custom Static Methods:**

```typescript
// After generated static methods, add:

productSchema.statics.findBySlug = async (slug: string) => {
  return await Product.findOne({ slug });
};

productSchema.statics.getTopRated = async (limit: number = 10) => {
  return await Product.find()
    .sort({ rating: -1 })
    .limit(limit);
};
```

#### **Model এ Instance Methods:**

```typescript
productSchema.methods.calculateFinalPrice = function () {
  const discount = this.discount || 0;
  return this.price - (this.price * discount / 100);
};

productSchema.methods.isOwner = function (userId: string) {
  return this.seller.toString() === userId;
};
```

### ৯.২ Custom Routes যোগ করা

Generated routes এর পাশাপাশি custom routes add করা যায়।

```typescript
// Generated routes
router.post('/', auth(), validateRequest(), ProductController.createProduct);
router.get('/', auth(), ProductController.getAllProducts);
// ...

// Add custom routes
router.post(
  '/:id/publish',
  auth(USER_ROLES.POSTER, USER_ROLES.ADMIN),
  ProductController.publishProduct  // Custom controller
);

router.get(
  '/featured',
  auth(USER_ROLES.GUEST),
  ProductController.getFeaturedProducts  // Custom controller
);

router.get(
  '/by-seller/:sellerId',
  auth(USER_ROLES.GUEST),
  ProductController.getProductsBySeller  // Custom controller
);
```

**Custom Controller:**

```typescript
const publishProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductService.publishProductToDB(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Product published successfully',
    data: result,
  });
});

export const ProductController = {
  // ... generated controllers
  publishProduct,  // Add custom
  getFeaturedProducts,
  getProductsBySeller,
};
```

### ৯.৩ Advanced Validation Rules

Zod schema তে custom validation যোগ করা:

```typescript
const createProductZodSchema = z.object({
  body: z
    .object({
      title: z.string({ required_error: 'Title is required' })
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title too long'),
      price: z.number({ required_error: 'Price is required' })
        .positive('Price must be positive')
        .max(999999, 'Price too high'),
      discount: z.number()
        .min(0, 'Discount cannot be negative')
        .max(90, 'Discount cannot exceed 90%')
        .optional(),
      // ... other fields
    })
    .strict()
    .refine((data) => {
      // Custom validation: discount should not make final price negative
      if (data.discount) {
        const finalPrice = data.price - (data.price * data.discount / 100);
        return finalPrice >= 0;
      }
      return true;
    }, {
      message: 'Discount is too high',
    }),
});
```

### ৯.৪ Pagination Customization

QueryBuilder parameters customize করা:

```typescript
const getAllProductsFromDB = async (query: Record<string, unknown>) => {
  // Custom default values
  const defaultLimit = 20;
  const maxLimit = 100;

  const queryBuilder = new QueryBuilder(Product.find(), {
    ...query,
    limit: Math.min(Number(query.limit) || defaultLimit, maxLimit),
  })
    .search(['title', 'description', 'tags'])  // Add more searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await queryBuilder.modelQuery
    .populate('seller', 'name email profilePicture')
    .populate('category', 'name');  // Populate multiple references

  const pagination = await queryBuilder.getPaginationInfo();

  return { data, pagination };
};
```

---

## ১০. সমস্যা সমাধান

### ১০.১ সাধারণ সমস্যা ও সমাধান

#### **সমস্যা ১: "Interface file not found"**

**Error:**
```
❌ Interface file not found!
Expected: src/app/modules/product/product.interface.ts
```

**কারণ:**
- Interface file সঠিক location এ নেই
- File name ভুল
- Module name ভুল

**সমাধান:**

1. নিশ্চিত করুন file এই path এ আছে:
   ```
   src/app/modules/{module-name}/{module-name}.interface.ts
   ```

2. File name আর module name একই হতে হবে:
   ```bash
   # Wrong
   src/app/modules/product/Product.interface.ts  ✗

   # Correct
   src/app/modules/product/product.interface.ts  ✓
   ```

3. Module directory আগে তৈরি করুন:
   ```bash
   mkdir -p src/app/modules/product
   ```

#### **সমস্যা ২: "No fields found in interface"**

**Error:**
```
❌ Parse error
No fields found in interface. Please define at least one field.
```

**কারণ:**
- Interface empty বা খালি
- Main type alias নেই
- Type alias naming convention ভুল

**সমাধান:**

Interface এ minimum এই structure থাকতে হবে:

```typescript
import { Model } from 'mongoose';

export type IProduct = {  // Must be I{PascalCase(moduleName)}
  field: string;
};

export type ProductModel = Model<IProduct>;
```

**ভুল উদাহরণ:**
```typescript
// ✗ Wrong - no fields
export type IProduct = {};

// ✗ Wrong - wrong naming
export type Product = { title: string };

// ✗ Wrong - only Model type
export type ProductModel = Model<any>;
```

**সঠিক উদাহরণ:**
```typescript
// ✓ Correct
export type IProduct = {
  title: string;
  price: number;
};

export type ProductModel = Model<IProduct>;
```

#### **সমস্যা ৩: "TypeScript validation found errors"**

**Warning:**
```
⚠ TypeScript check found errors (check manually)
```

**কারণ:**
- Generated code এ type mismatch
- Missing imports
- Interface এ কোনো field এর type ভুল

**সমাধান:**

1. TypeScript check manually run করুন:
   ```bash
   npx tsc --noEmit
   ```

2. Error messages দেখুন এবং fix করুন

3. Common issues:
   - Enum import missing (generator ইতিমধ্যে add করে দেয়)
   - Reference model wrong (manual fix করুন)

#### **সমস্যা ৪: Routes already registered

**Warning:**
```
ℹ Route already registered: ProductRoutes
```

**কারণ:**
- আগে থেকেই route register করা আছে
- Duplicate generation attempt

**সমাধান:**

এটি একটি warning, error না। Ignore করা যায়।

যদি re-generate করতে চান:
1. `src/routes/index.ts` থেকে previous entry remove করুন
2. Module files delete করুন
3. আবার generate করুন

#### **সমস্যা ৫: Prettier formatting failed**

**Warning:**
```
⚠ Prettier formatting failed: ...
```

**কারণ:**
- Prettier installed নেই
- Prettier config issue

**সমাধান:**

1. Prettier install করুন:
   ```bash
   npm install --save-dev prettier
   ```

2. Manual format করুন:
   ```bash
   npx prettier --write "src/app/modules/product/**/*.ts"
   ```

#### **সমস্যা ৬: File upload middleware not added**

**কারণ:**
- Field name file upload pattern এর সাথে match করে নি

**সমাধান:**

Field name এ এই keywords use করুন:
```
image, images, avatar, thumbnail, photo,
file, files, document, attachment
```

**অথবা manual add করুন:**

```typescript
// route file এ
router.post(
  '/',
  auth(USER_ROLES.POSTER),
  fileHandler(['customField']),  // Manually add
  validateRequest(...),
  Controller.create
);
```

### ১০.২ Debug Mode

যদি কোনো সমস্যা বুঝতে না পারেন, debug info দেখুন:

Generator এর output carefully পড়ুন:

```
✓ Detected 6 fields           # ঠিক কতগুলো fields detect হয়েছে
✓ Found 1 enum                # Enum সংখ্যা
✓ Detected file upload: ...   # কোন fields file upload
✓ Detected searchable: ...    # কোন fields searchable
```

এই info থেকে আপনি বুঝতে পারবেন কী detect হয়েছে।

### ১০.৩ Manual Fixes

Generator সব ক্ষেত্রে perfect code generate করতে পারে না। কিছু জিনিস manual fix করতে হতে পারে:

#### **Reference Model Name:**

যদি reference model name ভুল guess হয়:

```typescript
// Generated (wrong)
seller: {
  type: Schema.Types.ObjectId,
  ref: 'Seller',  // ✗ Wrong guess
  required: true,
}

// Fix manually
seller: {
  type: Schema.Types.ObjectId,
  ref: 'User',  // ✓ Correct
  required: true,
}
```

#### **Populate Fields:**

Generated code default populate fields use করে। Customize করতে পারেন:

```typescript
// Generated
const result = await Product.findById(id)
  .populate('seller', 'name email');

// Customize
const result = await Product.findById(id)
  .populate('seller', 'name email profilePicture bio rating')
  .populate('category', 'name description');
```

#### **Validation Rules:**

Generated validation basic rules দেয়। Advanced rules add করতে পারেন:

```typescript
// Generated
price: z.number({ required_error: 'Price is required' })

// Add custom rules
price: z.number({ required_error: 'Price is required' })
  .positive('Price must be positive')
  .min(1, 'Minimum price is 1')
  .max(999999, 'Maximum price is 999,999')
```

---

## ১১. সর্বশেষ কথা

### ১১.১ Best Practices

1. **Interface প্রথমে Plan করুন:**
   - কোন fields লাগবে তা আগে decide করুন
   - Proper naming convention follow করুন
   - Optional vs Required ভালো করে ভাবুন

2. **Generated Code Review করুন:**
   - সব files check করুন
   - Reference models verify করুন
   - Validation rules customize করুন

3. **Custom Logic Thoughtfully Add করুন:**
   - Generated pattern follow করুন
   - Error handling maintain করুন
   - Comments যোগ করুন

4. **Test করুন:**
   - Server run করুন
   - Endpoints test করুন (Postman)
   - Edge cases check করুন

### ১১.২ সময় সাশ্রয়

**Manual Development:**
- Interface: 10 minutes
- Model: 30 minutes
- Service: 45 minutes
- Controller: 25 minutes
- Validation: 30 minutes
- Routes: 20 minutes
- Total: **~3 hours**

**With Generator:**
- Interface: 10 minutes
- Run generator: 2 minutes
- Review & customize: 10-15 minutes
- Total: **~25 minutes**

**Savings: 2.5 hours+ per module!**

### ১১.৩ আরও তথ্যের জন্য

- **Codebase Patterns:** দেখুন `CLAUDE.md`
- **Existing Modules:** দেখুন `src/app/modules/`
- **Query Builder:** দেখুন `src/app/builder/QueryBuilder.ts`
- **Error Handling:** দেখুন `src/errors/ApiError.ts`

---

## ১২. পরিশিষ্ট

### ১২.১ Interface Examples

#### **Simple Module:**

```typescript
import { Model, Types } from 'mongoose';

export type ICategory = {
  name: string;
  description?: string;
  icon?: string;
};

export type CategoryModel = Model<ICategory>;
```

#### **Complex Module with Relationships:**

```typescript
import { Model, Types } from 'mongoose';

export enum ORDER_STATUS {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export type IOrderItem = {
  product: Types.ObjectId;
  quantity: number;
  price: number;
};

export type IOrder = {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  status: ORDER_STATUS;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
  };
  paymentMethod: 'CARD' | 'CASH' | 'ONLINE';
  createdAt?: Date;
  updatedAt?: Date;
};

export type OrderModel = Model<IOrder>;
```

### ১২.২ Complete File Structure

একটি generated module এর সম্পূর্ণ structure:

```
src/app/modules/product/
│
├── product.interface.ts     (Manual - আপনার লেখা)
│   ├── Enums (if any)
│   ├── Main type (IProduct)
│   └── Model type (ProductModel)
│
├── product.model.ts         (Generated)
│   ├── Imports
│   ├── Schema definition
│   ├── Indexes
│   ├── Static methods
│   └── Model export
│
├── product.service.ts       (Generated)
│   ├── Imports
│   ├── Create function
│   ├── Get by ID function
│   ├── Get all function (with QueryBuilder)
│   ├── Update function
│   ├── Delete function
│   └── Service export
│
├── product.controller.ts    (Generated)
│   ├── Imports
│   ├── Create controller
│   ├── Get by ID controller
│   ├── Get all controller
│   ├── Update controller
│   ├── Delete controller
│   └── Controller export
│
├── product.validation.ts    (Generated)
│   ├── Imports (Zod + enums)
│   ├── Create schema
│   ├── Update schema
│   ├── Get by ID schema
│   └── Validation export
│
└── product.route.ts         (Generated)
    ├── Imports (middlewares)
    ├── Router initialization
    ├── POST route (create)
    ├── GET routes (all + by ID)
    ├── PATCH route (update)
    ├── DELETE route (delete)
    └── Routes export
```

---

**Documentation শেষ।**

এই documentation টি comprehensive এবং future reference এর জন্য উপযুক্ত। যেকোনো developer এই documentation পড়ে Module Generator সম্পূর্ণভাবে বুঝতে ও ব্যবহার করতে পারবে।

**Happy Coding! 🚀**
