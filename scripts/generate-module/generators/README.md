# Module Generators

Advanced code generation tools for API development.

## 🚀 Available Generators

### 1. OpenAPI/Swagger Spec Generator

Generate OpenAPI 3.0 specification from TypeScript interface.

**Usage:**
```bash
# Generate for single module
npm run generate:openapi product

# Output:
# - docs/openapi/product.openapi.yaml
# - docs/openapi/product.openapi.json
```

**Features:**
- ✅ Complete OpenAPI 3.0 spec
- ✅ All CRUD endpoints documented
- ✅ Request/response schemas
- ✅ Authentication documentation
- ✅ Validation rules
- ✅ Export as YAML & JSON

**Import in Swagger UI:**
1. Go to https://editor.swagger.io/
2. File → Import File → Select generated YAML
3. View interactive API documentation

---

### 2. Frontend TypeScript Types Exporter

Convert backend interfaces to frontend-compatible TypeScript types.

**Usage:**
```bash
# Generate for single module
npm run generate:frontend-types product

# Generate for ALL modules
npm run generate:frontend-types --all

# Output:
# - types/api/product.types.ts
# - types/api/index.ts (barrel export)
```

**Features:**
- ✅ Clean frontend types (no Mongoose/MongoDB specifics)
- ✅ API payload types (Create, Update)
- ✅ API response types
- ✅ API client interface
- ✅ Type conversions (ObjectId → string, Date → string)
- ✅ Barrel export file

**Type Conversions:**
| Backend | Frontend |
|---------|----------|
| `Types.ObjectId` | `string` |
| `_id` | `id` |
| `Date` | `string` (ISO 8601) |
| `Buffer` | `string` (base64) |

**Frontend Usage:**
```typescript
import { Product, ProductAPI, CreateProductPayload } from '@/types/api/product.types';

// Use types
const product: Product = {
  id: '123',
  title: 'Sample',
  price: 99.99,
  // ...
};

// API payload
const payload: CreateProductPayload = {
  title: 'New Product',
  price: 49.99,
};

// API client
const api: ProductAPI = {
  async create(payload) {
    return fetch('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  // ... other methods
};
```

---

## 📂 Directory Structure

```
project/
├── scripts/generate-module/generators/
│   ├── openapi-generator.js          # OpenAPI generator
│   ├── frontend-types-generator.js   # Frontend types generator
│   └── README.md                     # This file
├── docs/openapi/
│   ├── product.openapi.yaml          # Generated specs
│   └── product.openapi.json
└── types/api/
    ├── product.types.ts              # Generated types
    ├── user.types.ts
    └── index.ts                      # Barrel export
```

---

## 🎯 Workflow Integration

### Recommended Development Flow:

1. **Create Interface** (manual)
   ```typescript
   // src/app/modules/product/product.interface.ts
   export type IProduct = { ... };
   ```

2. **Generate Module** (automatic)
   ```bash
   npm run generate:module product
   ```

3. **Generate OpenAPI** (automatic)
   ```bash
   npm run generate:openapi product
   ```

4. **Generate Frontend Types** (automatic)
   ```bash
   npm run generate:frontend-types product
   ```

5. **Done!** 🎉
   - Backend: Complete CRUD module
   - Documentation: OpenAPI spec
   - Frontend: TypeScript types

---

## 💡 Tips

### OpenAPI:
- Import generated YAML in Postman for auto collection creation
- Use Swagger UI for interactive API testing
- Share with frontend team for API contract

### Frontend Types:
- Add to frontend project's `tsconfig.json` paths
- Use in React/Next.js/Vue components
- Type-safe API calls
- Autocomplete in IDE

---

## 🔧 Advanced Usage

### Custom OpenAPI Server URL:
```javascript
const { generateOpenAPISpec } = require('./openapi-generator');

const spec = await generateOpenAPISpec('product', {
  serverUrl: 'https://api.production.com'
});
```

### Programmatic Usage:
```javascript
const { generateFrontendTypes } = require('./frontend-types-generator');

const types = await generateFrontendTypes('product');
console.log(types); // TypeScript code as string
```

---

## ✅ Benefits

**Time Savings:**
- Manual OpenAPI: 1-2 hours → Automated: 10 seconds
- Manual frontend types: 30-60 minutes → Automated: 5 seconds

**Consistency:**
- Always follows OpenAPI 3.0 standard
- Type-safe frontend integration
- No manual typing errors

**Maintainability:**
- Regenerate when interface changes
- Single source of truth
- Always in sync

---

**Happy Coding! 🚀**
