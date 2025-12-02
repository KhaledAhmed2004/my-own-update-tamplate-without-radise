# Web Scraping System - Complete Deep Dive Documentation

**Last Updated:** 2025-11-28
**Version:** 2.5 (Walmart & Target Full Support) 🆕
**Language:** বাংলা (Technical terms English-এ)

> **Version 2.5 Highlights (Walmart & Target Support):** 🆕
> - ✅ **Added:** Walmart dedicated selectors with `__NEXT_DATA__` JSON extraction
> - ✅ **Added:** Target dedicated selectors with `data-test` attributes
> - ✅ **Added:** PerimeterX anti-bot bypass strategy for Walmart
> - ✅ **Added:** Akamai anti-bot bypass strategy for Target
> - ✅ **Added:** Fingerprint spoofing system (canvas, webGL, audio)
> - ✅ **Added:** Browser pool with `forceRestartAndGetPage()` for fresh fingerprints
> - ✅ **Fixed:** Walmart price extraction bug ($6 wrong price from shipping element)
> - ✅ **Fixed:** `__NEXT_DATA__` price now OVERRIDES selector-extracted price
> - ✅ **Added:** Walmart/Target to JS-Heavy sites list (4s/3.5s wait)
>
> **Previous Highlights (v2.4 - Alibaba.com Support):**
> - ✅ **Added:** Alibaba.com B2B platform support with dedicated selectors
> - ✅ **Added:** 6-method price extraction for Alibaba (including price range parsing)
> - ✅ **Added:** 3-method rating extraction for Alibaba (supplier scores)
> - ✅ **Added:** Alibaba to JS-heavy sites list (uses Puppeteer)
> - ✅ **Added:** Alibaba image URL upgrade (thumbnail → full size)
> - ✅ **Added:** Seller/Supplier and shipping/lead time extraction
>
> **Previous Highlights (v2.3 - AliExpress Bug Fixes):**
> - ✅ **Fixed:** `Navigation timeout exceeded` - AliExpress now uses `domcontentloaded`
> - ✅ **Fixed:** `__awaiter is not defined` - Removed async/await from page.evaluate()
> - ✅ **Fixed:** `waitFor: 2000ms override` - Pipeline defaults now applied correctly
> - ✅ **Fixed:** `:has-text()` selector error - Now uses standard CSS selectors
> - ✅ **Added:** 9-method price extraction system for AliExpress
> - ✅ **Added:** 4-method rating extraction with % → star conversion
> - ✅ **Added:** URL parameter price extraction (pdp_npi) - Most reliable!
>
> **Previous Highlights (v2.2):**
> - ✅ AliExpress scraping support with site-specific selectors
> - ✅ Multi-site architecture (Amazon, eBay, AliExpress, Generic)
> - ✅ Seller and shipping field extraction for AliExpress

---

## সূচিপত্র (Table of Contents)

1. [System Overview](#1-system-overview)
2. [Architecture & Design Decisions](#2-architecture--design-decisions)
3. [Core Components](#3-core-components)
4. [Scraping Engines](#4-scraping-engines)
5. [Browser Pool System](#5-browser-pool-system)
6. [Data Extractors](#6-data-extractors)
7. [Anti-Bot Protection System](#7-anti-bot-protection-system)
8. [Site-Specific Strategies (Walmart & Target)](#8-site-specific-strategies-walmart--target) 🆕
9. [Fingerprint Spoofing System](#9-fingerprint-spoofing-system) 🆕
10. [Proxy System](#10-proxy-system)
11. [API Layer (Module)](#11-api-layer-module)
12. [Performance Optimizations](#12-performance-optimizations)
13. [Issues Faced & Solutions](#13-issues-faced--solutions)
14. [Configuration Options](#14-configuration-options)
15. [Usage Examples](#15-usage-examples)
16. [Troubleshooting Guide](#16-troubleshooting-guide)
17. [Future Improvements](#17-future-improvements)

---

## 1. System Overview

### এই System কী করে?

এই Web Scraping System একটি production-ready scraping solution যা:

- **যেকোনো website থেকে data extract** করতে পারে
- **Amazon, eBay, AliExpress, Alibaba.com, Walmart, Target** এর মতো strict sites handle করে (site-specific selectors সহ) 🆕
- **Walmart PerimeterX** এবং **Target Akamai** bot protection bypass করে 🆕
- **Browser fingerprint spoofing** দিয়ে detection এড়ায় 🆕
- **JavaScript-rendered pages** scrape করতে পারে
- **CAPTCHA ও bot detection** bypass করে
- **Multiple fallback methods** দিয়ে success rate বাড়ায়
- **Human-readable error messages** দেয় (Bangla সহ)
- **eBay-specific fields** extract করে (condition, seller)
- **AliExpress-specific fields** extract করে (seller, shipping) 🆕
- **Alibaba.com B2B fields** extract করে (supplier, MOQ, lead time) 🆕

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER REQUEST                                  │
│                   POST /api/v1/scrape/product                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SCRAPE SERVICE                                  │
│                 (Business Logic Layer)                               │
│  - User validation                                                   │
│  - URL Caching (optional)                                           │
│  - Database persistence                                              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SCRAPE HELPER                                    │
│              (Entry Point Wrapper)                                   │
│  - scrape(), scrapeProduct(), quickScrape()                         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PIPELINE                                        │
│             (Main Orchestrator)                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  SELECT  │→ │  FETCH   │→ │  PARSE   │→ │ EXTRACT  │            │
│  │  ENGINE  │  │  PAGE    │  │   HTML   │  │   DATA   │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────┐                        │
│  │         ENGINE SELECTION                 │                        │
│  │  - Cheerio (static HTML)                 │                        │
│  │  - Puppeteer (JS rendering)              │                        │
│  │  - Multi-Method (fallback chain)         │                        │
│  └─────────────────────────────────────────┘                        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   CHEERIO    │   │  PUPPETEER   │   │ MULTI-METHOD │
│   ENGINE     │   │   ENGINE     │   │    ENGINE    │
│              │   │              │   │              │
│ - Fast       │   │ - JS render  │   │ - Fallbacks  │
│ - Static     │   │ - Stealth    │   │ - Proxies    │
│ - Axios      │   │ - Pool       │   │ - Smart      │
└──────────────┘   └──────────────┘   └──────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │    BROWSER POOL      │
              │  - Reuses browser    │
              │  - 50% faster        │
              │  - Memory stable     │
              └──────────────────────┘
```

### File Structure

```
src/
├── app/
│   ├── scraper/                          # Core Scraping System
│   │   ├── scraper.interface.ts          # All TypeScript interfaces
│   │   ├── pipeline.ts                   # Main orchestrator
│   │   │
│   │   ├── engines/                      # Scraping Engines
│   │   │   ├── index.ts                  # Engine registry
│   │   │   ├── cheerio.engine.ts         # Static HTML scraper
│   │   │   ├── puppeteer.engine.ts       # Browser-based scraper
│   │   │   ├── multiMethod.engine.ts     # Fallback chain
│   │   │   └── browserPool.ts            # Browser instance pooling
│   │   │
│   │   ├── extractors/                   # Data Extractors
│   │   │   ├── index.ts                  # Extractor registry
│   │   │   ├── text.extractor.ts         # Text content
│   │   │   ├── image.extractor.ts        # Images
│   │   │   ├── link.extractor.ts         # Hyperlinks
│   │   │   ├── table.extractor.ts        # Tables
│   │   │   ├── price.extractor.ts        # Prices (20-layer) 🆕
│   │   │   ├── product.extractor.ts      # E-commerce products (Multi-site) 🆕
│   │   │   └── metadata.extractor.ts     # Meta tags, OG tags
│   │   │
│   │   ├── antiBot/                      # Bot Detection Bypass
│   │   │   ├── index.ts                  # Central export
│   │   │   ├── userAgent.ts              # User-Agent rotation
│   │   │   ├── delay.ts                  # Human-like delays
│   │   │   └── captcha.ts                # CAPTCHA detection
│   │   │
│   │   └── proxy/                        # CORS Proxy Helpers
│   │       ├── index.ts                  # Proxy exports
│   │       ├── allOrigins.ts             # AllOrigins proxy
│   │       └── corsProxy.ts              # CORSProxy.io
│   │
│   └── modules/
│       └── scrape/                       # API Module
│           ├── scrape.interface.ts       # API types
│           ├── scrape.model.ts           # MongoDB schema
│           ├── scrape.controller.ts      # HTTP handlers
│           ├── scrape.service.ts         # Business logic
│           ├── scrape.route.ts           # Express routes
│           └── scrape.validation.ts      # Zod schemas
│
└── helpers/
    └── scrapeHelper.ts                   # User-friendly wrapper
```

---

## 2. Architecture & Design Decisions

### কেন এই Design বেছে নেওয়া হয়েছে?

#### Decision 1: Multi-Engine Architecture

**সমস্যা:** বিভিন্ন ধরনের website আছে - কিছু static HTML, কিছু JavaScript-heavy।

**সমাধান:** Multiple engines তৈরি করা হয়েছে:

| Engine | Use Case | Speed | Resource |
|--------|----------|-------|----------|
| Cheerio | Static HTML, blogs | Fast (~2s) | Low |
| Puppeteer | JS-rendered, SPAs | Slow (~15s) | High |
| Multi-Method | Unknown sites | Variable | Variable |

**কেন এটা ভালো:**
- Static sites এ Cheerio use করলে resources বাঁচে
- JS-heavy sites এ Puppeteer দিয়ে proper render হয়
- Auto-detection দিয়ে best engine select করা যায়

```typescript
// src/app/scraper/engines/index.ts:39-48
export const selectBestEngine = (url: string, options: IScrapeOptions): IScraperEngine => {
  // If engine explicitly specified
  if (options.engine && options.engine !== 'auto') {
    return getEngine(options.engine);
  }

  // Default to multi-method engine for automatic fallback support
  return MultiMethodEngine;
};
```

---

#### Decision 2: Browser Pool Pattern

**সমস্যা:** প্রতিটি request এ নতুন browser launch করতে 1-2 seconds লাগত।

**আগের অবস্থা:**
```
Request 1: Launch browser → Scrape → Close → 20s
Request 2: Launch browser → Scrape → Close → 20s
Request 3: Launch browser → Scrape → Close → 20s
```

**এখনের অবস্থা (Browser Pool):**
```
Request 1: Launch browser → Scrape → Keep open → 18s
Request 2: Reuse browser → Scrape → Keep open → 12s
Request 3: Reuse browser → Scrape → Keep open → 12s
...
Request 50: Restart browser (fresh fingerprint) → 15s
```

**Performance Improvement:** ~35-50% faster on subsequent requests!

**কেন 50 requests পর restart:**
- একই browser বেশিক্ষণ ব্যবহার করলে websites track করতে পারে
- Fresh fingerprint পেতে periodic restart দরকার
- Memory leak prevention

```typescript
// src/app/scraper/engines/browserPool.ts:33-37
const DEFAULT_CONFIG: IBrowserPoolConfig = {
  maxRequestsBeforeRestart: 50, // Restart browser after 50 requests
  maxConcurrentPages: 5,        // Max 5 concurrent pages
  headless: true,
};
```

---

#### Decision 3: Multi-Method Fallback Chain

**সমস্যা:** Direct request প্রায়ই block হয়, especially Amazon-এ।

**সমাধান:** 3-layer fallback chain:

```
┌─────────────────────────────────────────────────────────────┐
│                   MULTI-METHOD ENGINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Direct Fetch (Puppeteer/Cheerio)                   │
│      ↓ Failed? (CAPTCHA/Blocked/Timeout)                    │
│                                                              │
│  Step 2: AllOrigins Proxy                                   │
│      URL: https://api.allorigins.win/raw?url=<encoded>      │
│      ↓ Failed?                                              │
│                                                              │
│  Step 3: CORSProxy.io                                       │
│      URL: https://corsproxy.io/?<encoded>                   │
│      ↓ All Failed?                                          │
│                                                              │
│  Return Error with all methods tried                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Success Rate Impact:**

| Scenario | Before (Single Method) | After (Multi-Method) |
|----------|------------------------|----------------------|
| Normal sites | ~80% | ~95% |
| Amazon | ~30% | ~60-70% |
| Protected sites | ~20% | ~50% |

---

#### Decision 4: Smart CAPTCHA Detection

**সমস্যা:** Amazon এর legitimate product pages এও "robot" শব্দ থাকে, যা false positive দিচ্ছিল।

**আগের Logic (ভুল):**
```typescript
// শুধু keyword check করত
if (html.includes('robot') || html.includes('captcha')) {
  return { isBlocked: true }; // FALSE POSITIVE!
}
```

**নতুন Logic (Smart):**
```typescript
// src/app/scraper/antiBot/captcha.ts
export function smartDetectBlocking(html: string): IBlockingResult {
  const pageSize = html.length;
  const hasProductContent = checkProductIndicators(html);

  // Large pages (>50KB) with product content are likely valid
  if (pageSize > 50000 && hasProductContent) {
    return { isBlocked: false, hasProductContent: true };
  }

  // Small pages with CAPTCHA keywords = blocked
  if (pageSize < 10000 && hasCaptchaKeywords(html)) {
    return { isBlocked: true, captchaType: detectCaptchaType(html) };
  }

  // ... more intelligent checks
}
```

**Product Indicators চেক করা হয়:**
- `id="productTitle"` (Amazon)
- `class="a-price"` (Amazon)
- `itemprop="price"`
- `class*="product"`
- `Add to Cart` button

---

#### Decision 5: 20-Layer Price Extraction (Upgraded) 🆕

**সমস্যা:** বিভিন্ন site বিভিন্নভাবে price দেখায়।

**সমাধান:** ~~15টি~~ **20টি** fallback selector with confidence scoring এবং **site-specific filtering**:

```typescript
// src/app/scraper/extractors/price.extractor.ts
const PRICE_SELECTORS_15_LAYER: IPriceSelector[] = [
  // ═══════════════════════════════════════════════════════════════
  // Layer 1-5: Amazon-Specific (Confidence: 87-95)
  // ═══════════════════════════════════════════════════════════════
  { selector: '#priceblock_ourprice', confidence: 95, site: 'amazon' },
  { selector: '#priceblock_dealprice', confidence: 93, site: 'amazon' },
  { selector: '.a-price .a-offscreen', confidence: 90, site: 'amazon' },

  // ═══════════════════════════════════════════════════════════════
  // Layer 6-10: eBay-Specific (Confidence: 83-92) 🆕
  // ═══════════════════════════════════════════════════════════════
  { selector: '.x-price-primary .ux-textspans', confidence: 92, site: 'ebay' },
  { selector: '[data-testid="x-price-primary"]', confidence: 90, site: 'ebay' },
  { selector: '.x-bin-price__content .ux-textspans', confidence: 88, site: 'ebay' },
  { selector: '.vi-VR-cvipPrice', confidence: 85, site: 'ebay' },
  { selector: '.x-price-approx__price .ux-textspans', confidence: 83, site: 'ebay' },

  // ═══════════════════════════════════════════════════════════════
  // Layer 11-13: Generic (Confidence: 80-85)
  // ═══════════════════════════════════════════════════════════════
  { selector: '[itemprop="price"]', confidence: 85 },
  { selector: '[data-price]', confidence: 83 },
  { selector: '.product-price .current-price', confidence: 80 },

  // ... more Amazon + Fallback layers (14-20)
];
```

**Site-Based Filtering:** 🆕
```typescript
// Amazon URLs → Amazon + Generic selectors
// eBay URLs → eBay + Generic selectors
// Other URLs → All selectors
const siteType = detectSiteType(baseUrl);
const priceSelectors = PRICE_SELECTORS.filter(s =>
  !s.site || s.site === siteType || siteType === 'generic'
);
```

**Currency Detection:**
```typescript
const CURRENCIES = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '৳': 'BDT',
  '₩': 'KRW',
  '₽': 'RUB',
  'C$': 'CAD',  // 🆕
  'A$': 'AUD',  // 🆕
};
```

---

## 3. Core Components

### 3.1 Scraper Interface (`scraper.interface.ts`)

**File:** `src/app/scraper/scraper.interface.ts`

সব TypeScript types এখানে define করা:

```typescript
// Engine Types
export type ScraperEngine = 'cheerio' | 'puppeteer' | 'auto' | 'multi-method';

// Extractor Types
export type ExtractorType =
  | 'text'
  | 'images'
  | 'links'
  | 'tables'
  | 'prices'
  | 'product'
  | 'metadata'
  | 'custom';

// Main Options Interface
export interface IScrapeOptions {
  url: string;
  engine?: ScraperEngine;
  extractors?: ExtractorType[];
  selectors?: ICustomSelectors;
  browser?: IBrowserOptions;
  protection?: IProtectionOptions;
  maxRetries?: number;
  userId?: string;
  saveToDb?: boolean;
}

// Browser Options
export interface IBrowserOptions {
  headless?: boolean;
  timeout?: number;        // Default: 20000 (was 45000)
  waitFor?: string | number;
  scrollToBottom?: boolean;
  viewport?: { width: number; height: number };
}

// Protection Options (Anti-Bot)
export interface IProtectionOptions {
  randomDelay?: boolean;
  minDelay?: number;       // Default: 2000ms
  maxDelay?: number;       // Default: 5000ms
  rotateUserAgent?: boolean;
}

// Extracted Product Interface 🆕
export interface IExtractedProduct {
  title?: string;
  price?: {
    current: number;
    original?: number;
    currency: string;
    discount?: string;
  };
  images?: string[];
  description?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  condition?: string;      // 🆕 eBay-specific: "New", "Refurbished", etc.
  seller?: string;         // 🆕 eBay-specific: Seller name
  brand?: string;
  features?: string[];
  url?: string;
  confidence?: number;
}
```

#### IExtractedProduct Fields Explained 🆕

| Field | Type | Description | Amazon | eBay | AliExpress | Generic |
|-------|------|-------------|--------|------|------------|---------|
| `title` | `string` | Product title | ✅ | ✅ | ✅ | ✅ |
| `price.current` | `number` | Current price | ✅ | ✅ | ✅ | ✅ |
| `price.original` | `number` | Original/was price | ✅ | ✅ | ✅ | ✅ |
| `price.currency` | `string` | Currency code (USD, EUR) | ✅ | ✅ | ✅ | ✅ |
| `price.discount` | `string` | Discount percentage | ✅ | ✅ | ✅ | ✅ |
| `images` | `string[]` | Product image URLs | ✅ | ✅ | ✅ | ✅ |
| `description` | `string` | Product description | ✅ | ✅ | ✅ | ✅ |
| `rating` | `number` | Rating (0-5) | ✅ | ✅ | ✅ | ✅ |
| `reviewCount` | `number` | Number of reviews | ✅ | ✅ | ✅ | ✅ |
| `availability` | `string` | Stock status | ✅ | ✅ | ✅ | ✅ |
| **`condition`** | `string` | Product condition | ❌ | ✅ | ❌ | ❌ |
| **`seller`** | `string` | Seller name | ❌ | ✅ | ✅ 🆕 | ❌ |
| **`shipping`** | `string` | Shipping info | ❌ | ❌ | ✅ 🆕 | ❌ |
| `brand` | `string` | Brand name | ✅ | ✅ | ✅ | ✅ |
| `features` | `string[]` | Product features | ✅ | ✅ | ✅ | ✅ |
| `url` | `string` | Source URL | ✅ | ✅ | ✅ | ✅ |
| `confidence` | `number` | Extraction confidence (0-100) | ✅ | ✅ | ✅ | ✅ |

---

### 3.2 Pipeline (`pipeline.ts`)

**File:** `src/app/scraper/pipeline.ts`

Main orchestrator যা সব components coordinate করে:

```typescript
// src/app/scraper/pipeline.ts - Simplified flow
export async function scrapePipeline(options: IScrapeOptions): Promise<IScrapeResult> {
  const context: IPipelineContext = {
    options,
    result: { url: options.url, status: 'success', timing: {} },
  };

  // RETRY LOOP
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 1. SELECT ENGINE
      const engine = selectBestEngine(options.url, options);

      // 2. INITIALIZE
      await engine.initialize(options);

      // 3. FETCH PAGE
      const fetchStart = Date.now();
      context.html = await engine.fetch(options.url, options);
      context.result.timing.fetchMs = Date.now() - fetchStart;

      // 4. SMART BLOCKING DETECTION
      const blockingResult = smartDetectBlocking(context.html);
      if (blockingResult.isBlocked) {
        throw new ApiError(403, `CAPTCHA detected: ${blockingResult.captchaType}`);
      }

      // 5. PARSE HTML
      context.document = engine.getDocument(context.html);

      // 6. RUN EXTRACTORS
      const extractStart = Date.now();
      context.result.data = await runExtractors(
        options.extractors || DEFAULT_EXTRACTORS,
        context.document,
        options.url,
        options.selectors
      );
      context.result.timing.extractMs = Date.now() - extractStart;

      // SUCCESS!
      return context.result;

    } catch (error) {
      // RETRY LOGIC
      if (isRetryableError(error) && attempt < maxRetries) {
        await exponentialBackoff(attempt);
        continue;
      }
      throw error;
    }
  }
}
```

**Key Features:**
- **Retry Logic:** 3 attempts with exponential backoff
- **Smart Blocking Detection:** Page size + content analysis
- **Timing Metrics:** fetchMs, extractMs, totalMs tracked
- **Error Aggregation:** All errors collected for debugging

---

## 4. Scraping Engines

### 4.1 Cheerio Engine (Static HTML)

**File:** `src/app/scraper/engines/cheerio.engine.ts`

**কখন ব্যবহার হয়:**
- Static HTML pages
- Blogs, news sites
- Simple e-commerce (JS ছাড়া)

**কীভাবে কাজ করে:**

```typescript
export const CheerioEngine: IScraperEngine = {
  name: 'cheerio',

  async fetch(url: string, options: IScrapeOptions): Promise<string> {
    const protection = options.protection || {};

    // 1. Random delay (human-like behavior)
    if (protection.randomDelay !== false) {
      await randomDelay(1000, 3000);
    }

    // 2. Get random user agent
    const userAgent = protection.rotateUserAgent !== false
      ? getRandomUserAgent()
      : DEFAULT_USER_AGENT;

    // 3. Make HTTP request with axios
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml...',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
      timeout: 30000,
      maxRedirects: 5,
    });

    return response.data;
  },

  getDocument(html: string) {
    return cheerio.load(html);
  },
};
```

**Advantages:**
- ⚡ Fast (~2-3 seconds)
- 💾 Low memory usage
- 🔄 No browser overhead

**Limitations:**
- ❌ Cannot handle JavaScript
- ❌ Cannot handle SPAs
- ❌ Limited anti-bot bypass

---

### 4.2 Puppeteer Engine (Browser-Based)

**File:** `src/app/scraper/engines/puppeteer.engine.ts`

**কখন ব্যবহার হয়:**
- JavaScript-rendered pages
- Single Page Applications (SPAs)
- Amazon, eBay, modern e-commerce
- Sites with heavy anti-bot protection

**Key Features:**

```typescript
export const PuppeteerEngine: IScraperEngine = {
  name: 'puppeteer',

  async fetch(url: string, options: IScrapeOptions): Promise<string> {
    // 1. Longer delay for strict sites (2-5 seconds)
    await randomDelay(
      protection.minDelay || 2000,
      protection.maxDelay || 5000
    );

    // 2. Get page from BROWSER POOL (not new browser!)
    const page = await browserPool.getPage();

    try {
      // 3. Set random viewport
      await page.setViewport(getRandomViewport());

      // 4. Set random user agent
      await page.setUserAgent(getRandomUserAgent());

      // 5. Set stealth headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"...',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        // ... more headers
      });

      // 6. Block only fonts (save bandwidth, don't trigger detection)
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.resourceType() === 'font') {
          request.abort();
        } else {
          request.continue();
        }
      });

      // 7. Navigate with 20s timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 20000,  // Was 45000
      });

      // 8. Simulate human behavior
      await simulateHumanBehavior(page);

      // 9. Get rendered HTML
      return await page.content();

    } finally {
      // 10. Release page back to pool
      await browserPool.releasePage(page);
    }
  },
};
```

**Human Behavior Simulation:**

```typescript
// src/app/scraper/engines/puppeteer.engine.ts:240-270
async function simulateHumanBehavior(page: Page): Promise<void> {
  // Random small delay
  await sleep(500 + Math.random() * 1000);

  // Move mouse randomly
  const viewport = page.viewport();
  if (viewport) {
    const x = Math.floor(Math.random() * viewport.width * 0.8) + 50;
    const y = Math.floor(Math.random() * viewport.height * 0.8) + 50;
    await page.mouse.move(x, y, { steps: 10 });
  }

  // Small scroll down
  await page.evaluate(() => {
    window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
  });

  // Wait a bit
  await sleep(300 + Math.random() * 500);

  // Scroll back up a little
  await page.evaluate(() => {
    window.scrollBy(0, -(Math.floor(Math.random() * 100) + 50));
  });
}
```

---

### 4.3 Multi-Method Engine (Fallback Chain)

**File:** `src/app/scraper/engines/multiMethod.engine.ts`

**সবচেয়ে important engine কারণ এটা automatic fallback দেয়:**

```typescript
export const MultiMethodEngine: IScraperEngine = {
  name: 'multi-method',

  async fetch(url: string, options: IScrapeOptions): Promise<string> {
    const methodsAttempted: string[] = [];
    const errors: string[] = [];

    // METHOD 1: Direct fetch (Puppeteer for JS sites, Cheerio otherwise)
    try {
      methodsAttempted.push('direct');

      const engine = PuppeteerEngine.canHandle(url, options)
        ? PuppeteerEngine
        : CheerioEngine;

      const html = await engine.fetch(url, options);

      // Check if blocked
      const blockCheck = smartDetectBlocking(html);
      if (!blockCheck.isBlocked) {
        return html; // SUCCESS!
      }

      errors.push(`Direct: ${blockCheck.reason}`);
    } catch (error) {
      errors.push(`Direct: ${error.message}`);
    }

    // METHOD 2: AllOrigins Proxy
    try {
      methodsAttempted.push('allorigins');
      const result = await fetchWithAllOrigins(url);

      if (result.success && result.html) {
        const blockCheck = smartDetectBlocking(result.html);
        if (!blockCheck.isBlocked) {
          return result.html; // SUCCESS!
        }
        errors.push(`AllOrigins: ${blockCheck.reason}`);
      } else {
        errors.push(`AllOrigins: ${result.error}`);
      }
    } catch (error) {
      errors.push(`AllOrigins: ${error.message}`);
    }

    // METHOD 3: CORSProxy.io
    try {
      methodsAttempted.push('corsproxy');
      const result = await fetchWithCorsProxy(url);

      if (result.success && result.html) {
        const blockCheck = smartDetectBlocking(result.html);
        if (!blockCheck.isBlocked) {
          return result.html; // SUCCESS!
        }
        errors.push(`CORSProxy: ${blockCheck.reason}`);
      } else {
        errors.push(`CORSProxy: ${result.error}`);
      }
    } catch (error) {
      errors.push(`CORSProxy: ${error.message}`);
    }

    // ALL METHODS FAILED
    throw new ApiError(502, getHumanReadableError('ALL_METHODS_FAILED', {
      methodsTried: methodsAttempted,
      errors: errors,
      url: url,
    }));
  },
};
```

---

## 5. Browser Pool System

### কেন Browser Pool দরকার?

**File:** `src/app/scraper/engines/browserPool.ts`

**আগের সমস্যা:**

```
Every Request:
┌─────────────────────────────────────────────┐
│ 1. Launch Chromium browser    (~1-2 seconds)│
│ 2. Create new page                          │
│ 3. Navigate to URL            (~10 seconds) │
│ 4. Extract data               (~2 seconds)  │
│ 5. Close browser              (~0.5 seconds)│
├─────────────────────────────────────────────┤
│ Total: ~15-20 seconds per request           │
│ Memory: Spikes with each launch             │
└─────────────────────────────────────────────┘
```

**Browser Pool Solution:**

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER POOL                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Request 1:                                                  │
│  ┌──────────────┐                                           │
│  │ Launch once  │───► Browser stays running                 │
│  └──────────────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  Request 2-50:                                              │
│  ┌──────────────┐                                           │
│  │ Reuse browser│───► Just create new page (~0.1s)          │
│  └──────────────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  Request 51:                                                │
│  ┌──────────────┐                                           │
│  │ Restart      │───► Fresh fingerprint, new browser        │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Browser Pool Implementation

```typescript
// src/app/scraper/engines/browserPool.ts
class BrowserPool {
  private browser: Browser | null = null;
  private requestCount = 0;
  private activePages = 0;
  private config: IBrowserPoolConfig;

  // Get or create browser
  async getBrowser(): Promise<Browser> {
    // Restart after 50 requests (fresh fingerprint)
    if (this.requestCount >= this.config.maxRequestsBeforeRestart) {
      logger.info(`[BrowserPool] Restarting after ${this.requestCount} requests`);
      await this.restart();
    }

    // Return existing if connected
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    // Launch new browser with stealth options
    this.browser = await this.launchBrowser();
    return this.browser;
  }

  // Get a new page (respects concurrent limit)
  async getPage(): Promise<Page> {
    // Wait if max pages reached
    if (this.activePages >= this.config.maxConcurrentPages) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.getPage(); // Retry
    }

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    this.activePages++;
    this.requestCount++;

    return page;
  }

  // Release page back to pool
  async releasePage(page: Page): Promise<void> {
    if (!page.isClosed()) {
      await page.close();
    }
    this.activePages = Math.max(0, this.activePages - 1);
  }

  // Launch browser with optimized args
  private async launchBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: this.config.headless,
      args: [
        // Core args
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',

        // Performance optimization args (NEW!)
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
  }
}

// Singleton export
export const browserPool = new BrowserPool();
```

### Performance Comparison

| Metric | Without Pool | With Pool | Improvement |
|--------|-------------|-----------|-------------|
| First request | ~20s | ~18s | 10% |
| Request 2-50 | ~20s | ~12s | **40%** |
| Memory (peak) | 500MB+ | ~200MB | **60%** |
| Browser launches | Every request | Every 50 requests | **98%** |

---

## 6. Data Extractors

### 6.1 Extractor Registry

**File:** `src/app/scraper/extractors/index.ts`

```typescript
// Available extractors
export const EXTRACTORS: Record<ExtractorType, IExtractor<any>> = {
  text: TextExtractor,
  images: ImageExtractor,
  links: LinkExtractor,
  tables: TableExtractor,
  prices: PriceExtractor,
  product: ProductExtractor,
  metadata: MetadataExtractor,
  custom: TextExtractor, // Fallback
};

// Run multiple extractors
export async function runExtractors(
  names: ExtractorType[],
  document: CheerioAPI,
  baseUrl: string,
  selectors?: ICustomSelectors
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  for (const name of names) {
    try {
      const extractor = getExtractor(name);
      results[name] = await extractor.extract(document, baseUrl, selectors);
    } catch (error) {
      logger.warn(`[Extractor] ${name} failed: ${error.message}`);
      results[name] = null;
    }
  }

  return results;
}
```

---

### 6.2 Product Extractor (E-commerce Focus)

**File:** `src/app/scraper/extractors/product.extractor.ts`

এটা সবচেয়ে complex extractor - **Multi-Site Support (Amazon, eBay, AliExpress, Generic)** সহ।

#### Multi-Site Architecture

Product Extractor এখন চারটি major e-commerce platform support করে (v2.2):

```
┌─────────────────────────────────────────────────────────────────┐
│                    SITE DETECTION FLOW (v2.2)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    URL Input                                                     │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ const urlLower = baseUrl.toLowerCase();                     ││
│  │ const isAmazon = urlLower.includes('amazon.');              ││
│  │ const isEbay = urlLower.includes('ebay.');                  ││
│  │ const isAliExpress = urlLower.includes('aliexpress.');  🆕  ││
│  └─────────────────────────────────────────────────────────────┘│
│        │                                                         │
│        ▼                                                         │
│  ┌──────────┐    ┌─────────────┐    ┌──────────┐                │
│  │ Amazon?  │─Y─►│ AMAZON_     │    │          │                │
│  │          │    │ SELECTORS   │    │          │                │
│  └──────────┘    └─────────────┘    │          │                │
│        │N                           │          │                │
│        ▼                            │          │                │
│  ┌──────────┐    ┌─────────────┐    │ Product  │                │
│  │  eBay?   │─Y─►│ EBAY_       │───►│ Data     │                │
│  │          │    │ SELECTORS   │    │          │                │
│  └──────────┘    └─────────────┘    │          │                │
│        │N                           │          │                │
│        ▼                            │          │                │
│  ┌──────────┐    ┌─────────────┐    │          │                │
│  │AliExpress│─Y─►│ALIEXPRESS_  │───►│          │  🆕            │
│  │          │    │ SELECTORS   │    │          │                │
│  └──────────┘    └─────────────┘    │          │                │
│        │N                           │          │                │
│        ▼                            │          │                │
│  ┌──────────┐    ┌─────────────┐    │          │                │
│  │ Generic  │───►│ GENERIC_    │───►│          │                │
│  │          │    │ SELECTORS   │    │          │                │
│  └──────────┘    └─────────────┘    └──────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Site-Specific Selectors

**1. Amazon Selectors (`AMAZON_SELECTORS`):**

```typescript
// src/app/scraper/extractors/product.extractor.ts:16-27
const AMAZON_SELECTORS = {
  title: '#productTitle, #title, .product-title-word-break',
  price: '.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price-whole',
  originalPrice: '.a-price[data-a-strike="true"] .a-offscreen, .a-text-price .a-offscreen',
  images: '#imgTagWrapperId img, #landingImage, .imgTagWrapper img, #main-image-container img',
  description: '#productDescription, #feature-bullets, .a-expander-content',
  rating: '.a-icon-star .a-icon-alt, #acrPopover, [data-hook="rating-out-of-text"]',
  reviewCount: '#acrCustomerReviewText, [data-hook="total-review-count"]',
  availability: '#availability, .a-color-success, .a-color-price',
  features: '#feature-bullets li, .a-unordered-list.a-vertical li',
  brand: '#bylineInfo, .po-brand .a-span9',
};
```

**2. eBay Selectors (`EBAY_SELECTORS`):** 🆕

```typescript
// src/app/scraper/extractors/product.extractor.ts:29-43
const EBAY_SELECTORS = {
  // Title - Multiple fallbacks for different eBay layouts
  title: '.x-item-title__mainTitle, .x-item-title__mainTitle .ux-textspans--BOLD, h1.it-title, .vim.x-item-title span',

  // Price - "Buy It Now" এবং "Bid" price support
  price: '.x-price-primary .ux-textspans, .x-bin-price__content .ux-textspans, [data-testid="x-price-primary"], .vi-VR-cvipPrice, .x-price-approx__price .ux-textspans',

  // Original price (strikethrough)
  originalPrice: '.x-price-primary .ux-textspans--STRIKETHROUGH, .vi-originalPrice',

  // Images - Carousel এবং grid support
  images: '.ux-image-carousel-item img, .ux-image-grid img, #icImg, .ux-image-magnify__image--original',

  // Description - iframe এবং direct content
  description: '.x-item-description, #desc_ifr, .d-item-description',

  // Rating ও Review
  rating: '.ux-summary__start--rating, .x-star-rating, .reviews-star-rating',
  reviewCount: '.ux-summary__count, .reviews-count, .ux-seller-section__item--seller-rating',

  // Stock/Quantity
  availability: '.x-quantity__availability, .qtyTxt, .vi-quantity-available, .d-quantity__availability',

  // eBay-specific fields
  condition: '.x-item-condition .ux-textspans, .x-item-condition-text, .vi-itm-cond',
  features: '.ux-layout-section--features li, .ux-labels-values--features li',
  brand: '.ux-labels-values--brand .ux-textspans--BOLD, .x-item-details-label-brand',
  seller: '.x-sellercard-atf__info__about-seller a, .mbg-nw, .x-sellercard-atf__data-item--seller a',
};
```

**3. AliExpress Selectors (`ALIEXPRESS_SELECTORS`):** 🆕

```typescript
// src/app/scraper/extractors/product.extractor.ts:45-59
const ALIEXPRESS_SELECTORS = {
  // Title - Multiple fallback selectors for AliExpress layouts
  title: '.product-title-text, h1[data-pl="product-title"], .title--wrap--UUHae_g h1, [class*="title--title"]',

  // Price - Current price selectors
  price: '.uniform-banner-box-price, .product-price-current, [class*="price--current"], .es--wrap--erdmPRe .notranslate',

  // Original price (strikethrough)
  originalPrice: '.product-price-origin, [class*="price--original"], [class*="price--originalPrice"]',

  // Images - Gallery এবং zoom images
  images: '.slider--img--K8Rz7NA img, .image-view--previewImage, [class*="gallery"] img, .magnifier--image--Vu3bLNq img',

  // Description
  description: '.product-description, #product-description, [class*="description"], .detail--desc--PN1DuaM',

  // Rating ও Reviews
  rating: '.overview-rating-average, [class*="rating--value"], [class*="review--value"]',
  reviewCount: '.product-reviewer-reviews, [class*="reviewer--reviews"], [class*="review--count"]',

  // Stock/Availability
  availability: '.product-quantity-info, [class*="quantity--info"], [class*="stock"]',

  // Product features/specifications
  features: '.product-specs-list li, [class*="specification"] li, .sku-property-list li',

  // Store/Brand info
  brand: '.product-store-name, [class*="store--name"], [class*="store-info"]',

  // Seller name
  seller: '.store-name, [class*="seller--name"], [class*="store--storeName"]',

  // Shipping info (AliExpress-specific) 🆕
  shipping: '.product-shipping-info, [class*="shipping--text"], [class*="delivery--info"], .dynamic-shipping',
};
```

**4. Generic Selectors (`GENERIC_SELECTORS`):**

```typescript
// src/app/scraper/extractors/product.extractor.ts:45-57
const GENERIC_SELECTORS = {
  title: 'h1, .product-title, .product-name, [itemprop="name"]',
  price: '[itemprop="price"], .price, .product-price, .current-price',
  originalPrice: '.original-price, .was-price, .list-price, .compare-price',
  images: '.product-image img, .gallery img, [itemprop="image"]',
  description: '[itemprop="description"], .product-description, .description',
  rating: '[itemprop="ratingValue"], .rating, .stars',
  reviewCount: '[itemprop="reviewCount"], .review-count',
  availability: '.availability, .stock, [itemprop="availability"]',
  features: '.features li, .specifications li',
  brand: '[itemprop="brand"], .brand',
};
```

#### Site Detection Logic

```typescript
// src/app/scraper/extractors/product.extractor.ts:83-105
async extract($: CheerioAPI, baseUrl: string, selectors?: ICustomSelectors) {
  const product: IExtractedProduct = {};

  // Detect site type from URL
  const urlLower = baseUrl.toLowerCase();
  const isAmazon = urlLower.includes('amazon.');
  const isEbay = urlLower.includes('ebay.');
  const isAliExpress = urlLower.includes('aliexpress.');  // 🆕 v2.2

  // Select appropriate selectors based on site
  let defaultSelectors;
  if (isAmazon) {
    defaultSelectors = AMAZON_SELECTORS;
  } else if (isEbay) {
    defaultSelectors = EBAY_SELECTORS;
  } else if (isAliExpress) {           // 🆕 v2.2
    defaultSelectors = ALIEXPRESS_SELECTORS;
  } else {
    defaultSelectors = GENERIC_SELECTORS;
  }

  // Use site-specific selectors for extraction
  // ...
}
```

#### eBay-Specific Field Extraction

#### AliExpress-Specific Field Extraction 🆕

AliExpress তে দুটি additional field আছে যা Amazon/Generic এ নেই:

**1. Seller (স্টোরের নাম):**

```typescript
// src/app/scraper/extractors/product.extractor.ts:278-285
// Extract seller (AliExpress-specific)
if (isAliExpress && 'seller' in defaultSelectors) {
  const sellerSelector = (defaultSelectors as typeof ALIEXPRESS_SELECTORS).seller;
  const sellerText = $(sellerSelector).first().text().trim();
  if (sellerText && sellerText.length < 100) {
    product.seller = sellerText;
  }
}
```

**2. Shipping (শিপিং তথ্য):**

```typescript
// src/app/scraper/extractors/product.extractor.ts:287-294
// Extract shipping (AliExpress-specific)
if (isAliExpress && 'shipping' in defaultSelectors) {
  const shippingSelector = (defaultSelectors as typeof ALIEXPRESS_SELECTORS).shipping;
  const shippingText = $(shippingSelector).first().text().trim();
  if (shippingText && shippingText.length < 200) {
    product.shipping = shippingText;
  }
}
```

**Possible Shipping Values:**
| Value | বাংলা অর্থ |
|-------|----------|
| Free Shipping | বিনামূল্যে শিপিং |
| $2.99 Shipping | $2.99 শিপিং |
| Shipping: 15-30 days | শিপিং: 15-30 দিন |
| ePacket | ePacket ডেলিভারি |
| AliExpress Standard Shipping | AliExpress স্ট্যান্ডার্ড শিপিং |

---

#### eBay-Specific Field Extraction

eBay তে দুটি additional field আছে যা Amazon/Generic এ নেই:

**1. Condition (Product অবস্থা):**

```typescript
// src/app/scraper/extractors/product.extractor.ts:241-248
// Extract condition (eBay-specific)
if (isEbay && 'condition' in defaultSelectors) {
  const conditionSelector = (defaultSelectors as typeof EBAY_SELECTORS).condition;
  const conditionText = $(conditionSelector).first().text().trim();
  if (conditionText && conditionText.length < 100) {
    product.condition = conditionText;
  }
}
```

**Possible Condition Values:**
| Value | বাংলা অর্থ |
|-------|----------|
| New | নতুন |
| Refurbished - Excellent | রিফার্বিশড - চমৎকার |
| Refurbished - Good | রিফার্বিশড - ভালো |
| Used - Very Good | ব্যবহৃত - খুব ভালো |
| Used - Good | ব্যবহৃত - ভালো |
| Used - Acceptable | ব্যবহৃত - গ্রহণযোগ্য |
| For Parts | যন্ত্রাংশের জন্য |

**2. Seller (বিক্রেতার নাম):**

```typescript
// src/app/scraper/extractors/product.extractor.ts:250-257
// Extract seller (eBay-specific)
if (isEbay && 'seller' in defaultSelectors) {
  const sellerSelector = (defaultSelectors as typeof EBAY_SELECTORS).seller;
  const sellerText = $(sellerSelector).first().text().trim();
  if (sellerText && sellerText.length < 100) {
    product.seller = sellerText;
  }
}
```

#### Selector Comparison Table

| Field | Amazon Selector | eBay Selector | Generic |
|-------|-----------------|---------------|---------|
| **Title** | `#productTitle` | `.x-item-title__mainTitle` | `h1, [itemprop="name"]` |
| **Price** | `.a-price .a-offscreen` | `.x-price-primary .ux-textspans` | `[itemprop="price"]` |
| **Images** | `#landingImage` | `.ux-image-carousel-item img` | `.product-image img` |
| **Rating** | `.a-icon-star .a-icon-alt` | `.ux-summary__start--rating` | `[itemprop="ratingValue"]` |
| **Availability** | `#availability` | `.x-quantity__availability` | `.availability` |
| **Condition** | N/A | `.x-item-condition .ux-textspans` | N/A |
| **Seller** | N/A | `.x-sellercard-atf__info__about-seller a` | N/A |

#### Main Extraction Flow

```typescript
export const ProductExtractor: IExtractor<IExtractedProduct> = {
  name: 'product',

  async extract($: CheerioAPI, baseUrl: string, selectors?: ICustomSelectors) {
    const product: IExtractedProduct = {};

    // 1. Site detection
    const urlLower = baseUrl.toLowerCase();
    const isAmazon = urlLower.includes('amazon.');
    const isEbay = urlLower.includes('ebay.');

    // 2. Select site-specific selectors
    let defaultSelectors = isAmazon ? AMAZON_SELECTORS
                         : isEbay ? EBAY_SELECTORS
                         : GENERIC_SELECTORS;

    // 3. Extract all fields using appropriate selectors
    // TITLE
    product.title = extractTitle($, defaultSelectors, selectors);

    // PRICE (with 20-layer system)
    product.price = extractPrice($, defaultSelectors, selectors);

    // IMAGES
    product.images = extractProductImages($, baseUrl, defaultSelectors, selectors);

    // DESCRIPTION
    product.description = extractDescription($, defaultSelectors, selectors);

    // RATING & REVIEWS
    product.rating = extractRating($, defaultSelectors);
    product.reviewCount = extractReviewCount($, defaultSelectors);

    // AVAILABILITY
    product.availability = extractAvailability($, defaultSelectors);

    // eBay-SPECIFIC FIELDS
    if (isEbay) {
      product.condition = extractCondition($, defaultSelectors);
      product.seller = extractSeller($, defaultSelectors);
    }

    // ADDITIONAL DETAILS
    product.brand = extractBrand($, defaultSelectors, selectors);
    product.features = extractFeatures($, defaultSelectors);

    // 4. Add URL and return
    product.url = baseUrl;

    return product;
  },
};
```

#### Title Extraction (Multi-Site)

```typescript
function extractTitle($: CheerioAPI, selectors?: ICustomSelectors): string {
  const titleSelectors = [
    // Amazon specific
    '#productTitle',
    '#title',

    // Generic
    'h1[itemprop="name"]',
    '.product-title',
    '.product-name',
    'h1.title',

    // Fallback
    'h1',
  ];

  if (selectors?.title) {
    titleSelectors.unshift(selectors.title);
  }

  for (const selector of titleSelectors) {
    const title = $(selector).first().text().trim();
    if (title && title.length > 5) {
      return title;
    }
  }

  return '';
}
```

---

### 6.3 Price Extractor (25-Layer System) 🆕

**File:** `src/app/scraper/extractors/price.extractor.ts`

**আপডেট:** 20-Layer থেকে **25-Layer System** এ upgrade করা হয়েছে। এখন **Amazon + eBay + AliExpress + Generic** site support করে।

#### 25-Layer Price Selector Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  25-LAYER PRICE EXTRACTION SYSTEM                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  LAYER 1-5: Amazon-Specific (Confidence: 87-95)               │  │
│  │  ────────────────────────────────────────────────             │  │
│  │  • #priceblock_ourprice          (95%)                        │  │
│  │  • #priceblock_dealprice         (93%)                        │  │
│  │  • .a-price .a-offscreen         (90%)                        │  │
│  │  • #corePrice_feature_div        (88%)                        │  │
│  │  • #apex_offerDisplay_desktop    (87%)                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  LAYER 6-9: eBay-Specific (Confidence: 83-92)                 │  │
│  │  ────────────────────────────────────────────────             │  │
│  │  • .x-price-primary .ux-textspans        (92%)                │  │
│  │  • [data-testid="x-price-primary"]       (90%)                │  │
│  │  • .x-bin-price__content .ux-textspans   (88%)                │  │
│  │  • .vi-VR-cvipPrice                      (85%)                │  │
│  │  • .x-price-approx__price .ux-textspans  (83%)                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  LAYER 10-14: AliExpress-Specific (Confidence: 83-91) 🆕      │  │
│  │  ────────────────────────────────────────────────             │  │
│  │  • .uniform-banner-box-price             (91%)                │  │
│  │  • .product-price-current                (89%)                │  │
│  │  • [class*="price--current"]             (87%)                │  │
│  │  • .es--wrap--erdmPRe .notranslate       (85%)                │  │
│  │  • [data-pl="product-price"]             (83%)                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  LAYER 15-17: Generic E-commerce (Confidence: 80-85)          │  │
│  │  ────────────────────────────────────────────────             │  │
│  │  • [itemprop="price"]            (85%)                        │  │
│  │  • [data-price]                  (83%)                        │  │
│  │  • .product-price .current-price (80%)                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  LAYER 18-22: Amazon Additional (Confidence: 70-78)           │  │
│  │  ────────────────────────────────────────────────             │  │
│  │  • .a-price-whole                (78%)                        │  │
│  │  • #price_inside_buybox          (76%)                        │  │
│  │  • .priceToPay .a-offscreen      (72%)                        │  │
│  │  • #newBuyBoxPrice               (70%)                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  LAYER 23-25: Fallback Patterns (Confidence: 55-75)           │  │
│  │  ────────────────────────────────────────────────             │  │
│  │  • .offer-price                  (75%)                        │  │
│  │  • [class*="price"]:not(...)     (60%)                        │  │
│  │  • .price, .product-price        (55%)                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Complete Price Selector List

```typescript
// src/app/scraper/extractors/price.extractor.ts:40-78

interface IPriceSelector {
  selector: string;
  confidence: number;
  site?: string; // Site-specific selector marker
}

const PRICE_SELECTORS_15_LAYER: IPriceSelector[] = [
  // ═══════════════════════════════════════════════════════════════
  // Layer 1-5: Amazon-Specific (Highest Confidence)
  // ═══════════════════════════════════════════════════════════════
  { selector: '#priceblock_ourprice', confidence: 95, site: 'amazon' },
  { selector: '#priceblock_dealprice', confidence: 93, site: 'amazon' },
  { selector: '.a-price .a-offscreen', confidence: 90, site: 'amazon' },
  { selector: '#corePrice_feature_div .a-offscreen', confidence: 88, site: 'amazon' },
  { selector: '#apex_offerDisplay_desktop .a-offscreen', confidence: 87, site: 'amazon' },

  // ═══════════════════════════════════════════════════════════════
  // Layer 6-10: eBay-Specific (High Confidence) 🆕
  // ═══════════════════════════════════════════════════════════════
  { selector: '.x-price-primary .ux-textspans', confidence: 92, site: 'ebay' },
  { selector: '[data-testid="x-price-primary"]', confidence: 90, site: 'ebay' },
  { selector: '.x-bin-price__content .ux-textspans', confidence: 88, site: 'ebay' },
  { selector: '.vi-VR-cvipPrice', confidence: 85, site: 'ebay' },
  { selector: '.x-price-approx__price .ux-textspans', confidence: 83, site: 'ebay' },

  // ═══════════════════════════════════════════════════════════════
  // Layer 11-13: Generic E-commerce (High Confidence)
  // ═══════════════════════════════════════════════════════════════
  { selector: '[itemprop="price"]', confidence: 85 },
  { selector: '[data-price]', confidence: 83 },
  { selector: '.product-price .current-price', confidence: 80 },

  // ═══════════════════════════════════════════════════════════════
  // Layer 14-17: Amazon Additional (Medium-High Confidence)
  // ═══════════════════════════════════════════════════════════════
  { selector: '.a-price-whole', confidence: 78, site: 'amazon' },
  { selector: '#price_inside_buybox', confidence: 76, site: 'amazon' },
  { selector: '.offer-price', confidence: 75 },
  { selector: '.priceToPay .a-offscreen', confidence: 72, site: 'amazon' },
  { selector: '#newBuyBoxPrice', confidence: 70, site: 'amazon' },

  // ═══════════════════════════════════════════════════════════════
  // Layer 18-20: Fallback Patterns (Lower Confidence)
  // ═══════════════════════════════════════════════════════════════
  { selector: '[class*="price"]:not([class*="compare"]):not([class*="was"])', confidence: 60 },
  { selector: '.price, .product-price, .sale-price', confidence: 55 },
];
```

#### Site-Based Filtering 🆕

Price extractor এখন URL থেকে site type detect করে এবং শুধুমাত্র relevant selectors use করে:

```typescript
// src/app/scraper/extractors/price.extractor.ts:90-104

async extract($: CheerioAPI, baseUrl: string, selectors?: ICustomSelectors) {
  const prices: IExtractedPrice[] = [];
  const seenPrices = new Set<string>();

  // Detect site type for site-specific selectors
  const siteType = detectSiteType(baseUrl);

  // Filter selectors based on site
  // - If site is 'amazon', use Amazon + generic selectors
  // - If site is 'ebay', use eBay + generic selectors
  // - If site is 'generic', use only generic selectors (no site marker)
  const priceSelectors = selectors?.price
    ? [{ selector: selectors.price, confidence: 90 }]
    : PRICE_SELECTORS_15_LAYER.filter(s =>
        !s.site ||                    // Generic selectors (no site marker)
        s.site === siteType ||        // Site-specific selectors
        siteType === 'generic'        // Generic sites use all selectors
      );

  // Try each selector in priority order
  for (const { selector, confidence } of priceSelectors) {
    // ... extraction logic
  }
}
```

#### Site Detection Function

```typescript
// src/app/scraper/extractors/price.extractor.ts:243-253

function detectSiteType(url: string): 'amazon' | 'ebay' | 'walmart' | 'generic' {
  if (!url) return 'generic';

  const urlLower = url.toLowerCase();

  if (urlLower.includes('amazon.')) return 'amazon';
  if (urlLower.includes('ebay.')) return 'ebay';
  if (urlLower.includes('walmart.')) return 'walmart';

  return 'generic';
}
```

#### Confidence Scoring Explained

| Layer | Site | Confidence Range | বিবরণ |
|-------|------|------------------|-------|
| **1-5** | Amazon | 87-95% | Amazon এর official price elements |
| **6-10** | eBay | 83-92% | eBay এর Buy It Now / Bid prices |
| **11-13** | Generic | 80-85% | Schema.org এবং standard selectors |
| **14-17** | Amazon | 70-78% | Amazon এর secondary price elements |
| **18-20** | Fallback | 55-75% | Pattern matching (less reliable) |

#### eBay Price Selector Details 🆕

| Selector | Confidence | কী Extract করে |
|----------|------------|----------------|
| `.x-price-primary .ux-textspans` | 92% | Main "Buy It Now" price |
| `[data-testid="x-price-primary"]` | 90% | Test ID based price (reliable) |
| `.x-bin-price__content .ux-textspans` | 88% | Fixed price listings |
| `.vi-VR-cvipPrice` | 85% | Legacy eBay price format |
| `.x-price-approx__price .ux-textspans` | 83% | Approximate/converted price |

#### High Confidence Early Exit

Performance optimization - যদি 85%+ confidence price পাওয়া যায়, আর search করে না:

```typescript
// src/app/scraper/extractors/price.extractor.ts:147-150

// If we found a high-confidence price, we can stop
if (prices.length > 0 && prices.some(p => (p.confidence || 0) >= 85)) {
  break; // Early exit - no need to check lower confidence selectors
}
```

#### Currency Detection

```typescript
// src/app/scraper/extractors/price.extractor.ts:17-34

const CURRENCY_MAP: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '৳': 'BDT',   // Bangladeshi Taka
  '₩': 'KRW',
  '₽': 'RUB',
  'C$': 'CAD',
  'A$': 'AUD',
  'USD': 'USD',
  'EUR': 'EUR',
  'GBP': 'GBP',
  'JPY': 'JPY',
  'INR': 'INR',
  'BDT': 'BDT',
};
```

#### Complete Price Extractor Code

```typescript
export const PriceExtractor: IExtractor<IExtractedPrice[]> = {
  name: 'prices',

  async extract($: CheerioAPI, baseUrl: string, selectors?: ICustomSelectors) {
    const prices: IExtractedPrice[] = [];
    const seenPrices = new Set<string>();

    // 1. Detect site type
    const siteType = detectSiteType(baseUrl);

    // 2. Get filtered selectors
    const priceSelectors = selectors?.price
      ? [{ selector: selectors.price, confidence: 90 }]
      : PRICE_SELECTORS_15_LAYER.filter(s =>
          !s.site || s.site === siteType || siteType === 'generic'
        );

    // 3. Try each selector
    for (const { selector, confidence } of priceSelectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();

        // Try data-price attribute first (highest reliability)
        const dataPrice = $el.attr('data-price') || $el.attr('content');
        if (dataPrice) {
          const value = parseFloat(dataPrice);
          if (!isNaN(value) && value > 0) {
            const key = `${value}`;
            if (!seenPrices.has(key)) {
              seenPrices.add(key);
              prices.push({
                value,
                original: text,
                selector,
                currency: detectCurrency(text),
                confidence: Math.min(confidence + 5, 100), // +5 for data attribute
              });
            }
          }
          return;
        }

        // Parse price from text
        const parsed = parsePrice(text);
        if (parsed) {
          const key = `${parsed.value}`;
          if (!seenPrices.has(key)) {
            seenPrices.add(key);
            prices.push({
              ...parsed,
              selector,
              confidence,
            });
          }
        }
      });

      // 4. Early exit on high confidence
      if (prices.length > 0 && prices.some(p => (p.confidence || 0) >= 85)) {
        break;
      }
    }

    // 5. Sort by confidence, then by value
    prices.sort((a, b) => {
      const confDiff = (b.confidence || 0) - (a.confidence || 0);
      if (confDiff !== 0) return confDiff;
      return a.value - b.value;
    });

    // 6. Limit to 20 prices
    return prices.slice(0, 20);
  },
};
```

---

## 7. Anti-Bot Protection System

### 7.1 User-Agent Rotation

**File:** `src/app/scraper/antiBot/userAgent.ts`

```typescript
const USER_AGENTS = [
  // Chrome on Windows (most common)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',

  // Chrome on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  // Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',

  // Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',

  // Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',

  // Mobile
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
```

---

### 7.2 Delay System

**File:** `src/app/scraper/antiBot/delay.ts`

```typescript
// Simple sleep
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Random delay (human-like)
export async function randomDelay(
  minMs: number = 1000,
  maxMs: number = 3000
): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await sleep(delay);
}

// Exponential backoff for retries
export async function exponentialBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<void> {
  const delay = Math.min(
    baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
    maxDelay
  );
  await sleep(delay);
}
```

**Backoff Pattern:**
```
Attempt 1: 1s + random
Attempt 2: 2s + random
Attempt 3: 4s + random
Attempt 4: 8s + random (max 30s)
```

---

### 7.3 CAPTCHA Detection

**File:** `src/app/scraper/antiBot/captcha.ts`

```typescript
// CAPTCHA type detection
export function detectCaptchaType(html: string): string | null {
  const htmlLower = html.toLowerCase();

  if (htmlLower.includes('amazon') && htmlLower.includes('robot')) {
    return 'Amazon Robot Check';
  }
  if (htmlLower.includes('recaptcha')) {
    return 'Google reCAPTCHA';
  }
  if (htmlLower.includes('hcaptcha')) {
    return 'hCaptcha';
  }
  if (htmlLower.includes('cloudflare')) {
    return 'Cloudflare Challenge';
  }

  return null;
}

// Smart blocking detection
export function smartDetectBlocking(html: string): IBlockingResult {
  const pageSize = html.length;
  const captchaType = detectCaptchaType(html);
  const hasProductContent = checkProductIndicators(html);

  // Rule 1: Large pages with product content = VALID
  if (pageSize > 50000 && hasProductContent) {
    return {
      isBlocked: false,
      hasProductContent: true,
      pageSize,
      confidence: 10,
    };
  }

  // Rule 2: Small pages with CAPTCHA keywords = BLOCKED
  if (pageSize < 10000 && captchaType) {
    return {
      isBlocked: true,
      captchaType,
      pageSize,
      confidence: 90,
      reason: `CAPTCHA detected: ${captchaType}`,
    };
  }

  // Default: Not blocked
  return { isBlocked: false, pageSize, confidence: 0 };
}
```

---

### 7.4 Human-Readable Error Messages

```typescript
const ERROR_MESSAGES: Record<string, IErrorMessage> = {
  CAPTCHA_DETECTED: {
    code: 'CAPTCHA_DETECTED',
    message: 'Website requires human verification (CAPTCHA)',
    messageBn: 'Website এ CAPTCHA দেখা যাচ্ছে - মানুষ যাচাই করতে হবে',
    suggestion: 'Try again after some time or use a different URL',
    suggestionBn: 'কিছুক্ষণ পর আবার চেষ্টা করুন অথবা অন্য URL ব্যবহার করুন',
  },

  ACCESS_DENIED: {
    code: 'ACCESS_DENIED',
    message: 'Access to this website was blocked',
    messageBn: 'এই website এ access block করা হয়েছে',
    suggestion: 'The website may have strict anti-bot protection',
    suggestionBn: 'Website টিতে কড়া bot protection থাকতে পারে',
  },

  ALL_METHODS_FAILED: {
    code: 'ALL_METHODS_FAILED',
    message: 'All scraping methods failed',
    messageBn: 'সব scraping method ব্যর্থ হয়েছে',
    suggestion: 'Check if the URL is correct and accessible',
    suggestionBn: 'URL সঠিক কিনা এবং accessible কিনা দেখুন',
  },
};
```

---

## 8. Site-Specific Strategies (Walmart & Target) 🆕

### 8.1 Overview - কেন Site-Specific Strategies দরকার?

Walmart এবং Target দুটি heavily protected e-commerce site যারা advanced bot detection ব্যবহার করে:

| Site | Bot Detection | Protection Type | Challenge |
|------|--------------|-----------------|-----------|
| **Walmart** | PerimeterX | JavaScript fingerprinting, behavior analysis | Mouse movement tracking, Chrome runtime checks |
| **Target** | Akamai | Error stack analysis, automation detection | Puppeteer detection in error stacks, webdriver property |

**সমাধান:** Site-specific pre/post navigation strategies যা:
1. **Pre-navigation:** Page load এর আগে detection bypass scripts inject করে
2. **Post-navigation:** Human-like behavior simulate করে (mouse movement, scroll)

### 8.2 File Structure

```
src/app/scraper/antiBot/
├── siteStrategies.ts    # Walmart/Target specific bypass techniques 🆕
├── fingerprint.ts       # Canvas, WebGL, Audio fingerprint spoofing 🆕
├── userAgent.ts         # User-Agent rotation
├── delay.ts             # Human-like delays
├── captcha.ts           # CAPTCHA detection
└── index.ts             # Central export
```

### 8.3 Walmart Strategy (PerimeterX Bypass)

**File:** `src/app/scraper/antiBot/siteStrategies.ts:51-161`

```typescript
const walmartStrategy: ISiteStrategy = {
  name: 'walmart',
  domain: 'walmart.com',
  botDetectionType: 'perimeterx',
  minDelay: 3000,
  maxDelay: 7000,

  async preNavigationSetup(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      // 1. navigator.webdriver কে undefined করে দেয়
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });

      // 2. Chrome runtime object add করে (PerimeterX এটা check করে)
      if (!window.chrome) {
        window.chrome = {
          runtime: {
            onMessage: { addListener: () => {} },
            sendMessage: () => {},
          },
          loadTimes: function () {
            return {
              requestTime: Date.now() / 1000,
              startLoadTime: Date.now() / 1000,
              // ... timing properties
            };
          },
          csi: function () {
            return { startE: Date.now(), onloadT: Date.now() };
          },
          app: {
            isInstalled: false,
            InstallState: { DISABLED: 'disabled', INSTALLED: 'installed' },
            RunningState: { RUNNING: 'running', CANNOT_RUN: 'cannot_run' },
          },
        };
      }

      // 3. Permissions.query override (notifications)
      // 4. console.debug add করে
    });
  },

  async postNavigationActions(page: Page): Promise<void> {
    const viewport = page.viewport();
    if (viewport) {
      // Aggressive mouse movement (PerimeterX behavior analysis bypass)
      for (let i = 0; i < 5; i++) {
        const x = 100 + Math.random() * (viewport.width * 0.7);
        const y = 100 + Math.random() * (viewport.height * 0.5);
        await page.mouse.move(x, y, { steps: 12 + Math.floor(Math.random() * 8) });
        await sleep(80 + Math.random() * 150);
      }

      // Random scroll
      await page.evaluate(() => {
        window.scrollBy(0, 150 + Math.random() * 250);
      });
      await sleep(200 + Math.random() * 300);

      // Scroll back slightly (natural behavior)
      await page.evaluate(() => {
        window.scrollBy(0, -(50 + Math.random() * 100));
      });
    }
  },
};
```

### 8.4 Target Strategy (Akamai Bypass)

**File:** `src/app/scraper/antiBot/siteStrategies.ts:167-258`

```typescript
const targetStrategy: ISiteStrategy = {
  name: 'target',
  domain: 'target.com',
  botDetectionType: 'akamai',
  minDelay: 2500,
  maxDelay: 6000,

  async preNavigationSetup(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      // 1. Automation indicators remove করে
      delete window.__webdriver_evaluate;
      delete window.__selenium_evaluate;
      delete window.__webdriver_script_function;
      delete window.__driver_unwrapped;
      delete window.__webdriver_unwrapped;
      delete window.__driver_evaluate;
      delete window.__selenium_unwrapped;
      delete window.__fxdriver_evaluate;
      delete window.__fxdriver_unwrapped;

      // 2. navigator.webdriver undefined করে
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });

      // 3. Error stack traces থেকে puppeteer references সরায়
      const originalError = Error;
      Error = class extends originalError {
        constructor(message?: string) {
          super(message);
          if (this.stack) {
            this.stack = this.stack
              .replace(/puppeteer/gi, 'chrome')
              .replace(/pptr/gi, 'chr')
              .replace(/headless/gi, 'headed');
          }
        }
      };
    });
  },

  async postNavigationActions(page: Page): Promise<void> {
    // Akamai tracks mouse movements with precise timing
    await sleep(1200 + Math.random() * 800);

    const viewport = page.viewport();
    if (viewport) {
      // Natural curved mouse movements
      const startX = viewport.width * 0.1;
      const startY = viewport.height * 0.2;

      for (let i = 0; i < 4; i++) {
        const targetX = startX + (viewport.width * 0.6) * (i / 4) + Math.random() * 80;
        const targetY = startY + Math.sin(i / 2) * 120 + Math.random() * 50;
        await page.mouse.move(targetX, targetY, { steps: 8 + Math.floor(Math.random() * 6) });
        await sleep(60 + Math.random() * 120);
      }

      // Gentle scroll
      await page.evaluate(() => {
        window.scrollBy(0, 100 + Math.random() * 150);
      });
    }
  },
};
```

### 8.5 Strategy Usage in Puppeteer Engine

**File:** `src/app/scraper/engines/puppeteer.engine.ts`

```typescript
import { getStrategyForUrl } from '../antiBot/siteStrategies';

// Inside fetch() method:
const strategy = getStrategyForUrl(url);

if (strategy) {
  // Pre-navigation setup (inject bypass scripts)
  await strategy.preNavigationSetup(page);
  logger.debug(`[Scraper] Applied ${strategy.name} pre-navigation setup`);
}

// Navigate to page
await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

if (strategy) {
  // Post-navigation actions (human-like behavior)
  await strategy.postNavigationActions(page);
  logger.debug(`[Scraper] Applied ${strategy.name} post-navigation actions`);
}
```

### 8.6 Supported Sites Registry

**File:** `src/app/scraper/antiBot/siteStrategies.ts:263-268`

```typescript
export const SITE_STRATEGIES: Record<string, ISiteStrategy> = {
  'walmart.com': walmartStrategy,
  'www.walmart.com': walmartStrategy,
  'target.com': targetStrategy,
  'www.target.com': targetStrategy,
};
```

### 8.7 Helper Functions

```typescript
// URL থেকে strategy খোঁজে
export function getStrategyForUrl(url: string): ISiteStrategy | null {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();

  // Direct match
  if (SITE_STRATEGIES[hostname]) {
    return SITE_STRATEGIES[hostname];
  }

  // Partial match (e.g., www.walmart.com matches walmart.com)
  for (const [domain, strategy] of Object.entries(SITE_STRATEGIES)) {
    if (hostname.includes(domain.replace('www.', ''))) {
      return strategy;
    }
  }

  return null;
}

// Site এ custom strategy আছে কিনা check করে
export function hasCustomStrategy(url: string): boolean {
  return getStrategyForUrl(url) !== null;
}

// Supported domains list
export function getSupportedDomains(): string[] {
  return Array.from(new Set(Object.values(SITE_STRATEGIES).map(s => s.domain)));
}
```

---

## 9. Fingerprint Spoofing System 🆕

### 9.1 কেন Fingerprint Spoofing দরকার?

Modern bot detection systems browser fingerprint check করে:
- **Canvas fingerprint:** HTML5 canvas rendering signature
- **WebGL fingerprint:** Graphics card rendering signature
- **Audio fingerprint:** AudioContext processing signature

যদি এই fingerprints consistent থাকে repeated requests এ, তাহলে bot হিসেবে detect হয়।

### 9.2 Implementation

**File:** `src/app/scraper/antiBot/fingerprint.ts`

```typescript
export async function applyFingerprintSpoofing(page: Page): Promise<void> {
  await page.evaluateOnNewDocument(() => {
    // 1. Canvas Fingerprint Spoofing
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type?: string) {
      if (type === 'image/png' || type === undefined) {
        const context = this.getContext('2d');
        if (context) {
          // Add subtle noise to canvas
          const imageData = context.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            // Randomly modify a tiny bit (±1)
            imageData.data[i] += Math.floor(Math.random() * 3) - 1;
          }
          context.putImageData(imageData, 0, 0);
        }
      }
      return originalToDataURL.apply(this, arguments);
    };

    // 2. WebGL Fingerprint Spoofing
    const getParameterProxyHandler = {
      apply: function (target, thisArg, args) {
        const param = args[0];
        const result = target.apply(thisArg, args);

        // Randomize vendor/renderer strings
        if (param === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Google Inc. (NVIDIA)';
        }
        if (param === 37446) { // UNMASKED_RENDERER_WEBGL
          const renderers = [
            'ANGLE (NVIDIA GeForce GTX 1080 Ti Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0)',
          ];
          return renderers[Math.floor(Math.random() * renderers.length)];
        }
        return result;
      },
    };

    // Apply to WebGL context
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = new Proxy(
      originalGetParameter,
      getParameterProxyHandler
    );

    // 3. Audio Fingerprint Spoofing
    const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () {
      const analyser = originalCreateAnalyser.apply(this, arguments);
      const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
      analyser.getFloatFrequencyData = function (array) {
        originalGetFloatFrequencyData.apply(this, arguments);
        // Add noise to frequency data
        for (let i = 0; i < array.length; i++) {
          array[i] += Math.random() * 0.0001;
        }
      };
      return analyser;
    };

    // 4. Navigator Properties Spoofing
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 4 + Math.floor(Math.random() * 5), // 4-8 cores
    });

    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => [4, 8, 16][Math.floor(Math.random() * 3)],
    });

    // 5. Screen Properties Spoofing
    const screenWidths = [1920, 2560, 1366, 1440];
    const screenHeights = [1080, 1440, 768, 900];
    const idx = Math.floor(Math.random() * screenWidths.length);

    Object.defineProperty(screen, 'width', { get: () => screenWidths[idx] });
    Object.defineProperty(screen, 'height', { get: () => screenHeights[idx] });
    Object.defineProperty(screen, 'availWidth', { get: () => screenWidths[idx] });
    Object.defineProperty(screen, 'availHeight', { get: () => screenHeights[idx] - 40 });
  });
}
```

### 9.3 Browser Pool Integration (Fresh Fingerprint)

**File:** `src/app/scraper/engines/browserPool.ts:197-209`

```typescript
/**
 * Force restart browser and get a new page with fresh fingerprint
 * Block detect হলে fresh fingerprint পেতে browser restart করে
 */
async forceRestartAndGetPage(delayMs?: number): Promise<Page> {
  logger.info('[BrowserPool] Force restart for fresh fingerprint');

  // Close current browser completely
  await this.cleanup();

  // Optional delay to simulate new user arrival (5-15s by default)
  const delay = delayMs ?? 5000 + Math.random() * 10000;
  await new Promise(resolve => setTimeout(resolve, delay));

  // Get fresh page from new browser (new fingerprint generated)
  return this.getPage();
}
```

### 9.4 Usage in Puppeteer Engine

```typescript
import { applyFingerprintSpoofing } from '../antiBot/fingerprint';

// In getPage() method, after creating page:
await applyFingerprintSpoofing(page);
logger.debug('[Fingerprint] Spoofing scripts injected successfully');
```

---

## 10. Proxy System

### 10.1 AllOrigins Proxy

**File:** `src/app/scraper/proxy/allOrigins.ts`

```typescript
const ALLORIGINS_URL = 'https://api.allorigins.win/raw';

export async function fetchWithAllOrigins(url: string): Promise<IProxyResult> {
  try {
    const proxyUrl = `${ALLORIGINS_URL}?url=${encodeURIComponent(url)}`;

    const response = await axios.get(proxyUrl, {
      headers: { 'User-Agent': getRandomUserAgent() },
      timeout: 30000,
    });

    return { success: true, html: response.data, method: 'allorigins' };
  } catch (error) {
    return { success: false, error: error.message, method: 'allorigins' };
  }
}
```

### 8.2 CORSProxy

**File:** `src/app/scraper/proxy/corsProxy.ts`

```typescript
const CORSPROXY_URL = 'https://corsproxy.io/';

export async function fetchWithCorsProxy(url: string): Promise<IProxyResult> {
  try {
    const proxyUrl = `${CORSPROXY_URL}?${encodeURIComponent(url)}`;

    const response = await axios.get(proxyUrl, {
      headers: { 'User-Agent': getRandomUserAgent() },
      timeout: 30000,
    });

    // Validate response size
    if (!response.data || response.data.length < 1000) {
      return { success: false, error: 'Response too small', method: 'corsproxy' };
    }

    return { success: true, html: response.data, method: 'corsproxy' };
  } catch (error) {
    return { success: false, error: error.message, method: 'corsproxy' };
  }
}
```

---

## 9. API Layer (Module)

### 9.1 Routes

**File:** `src/app/modules/scrape/scrape.route.ts`

```typescript
const router = express.Router();

// General scrape
router.post(
  '/',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER, USER_ROLES.SUPER_ADMIN),
  validateRequest(ScrapeValidation.createScrapeRequestSchema),
  ScrapeController.executeScrape
);

// Product scrape (Amazon optimized)
router.post(
  '/product',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER, USER_ROLES.SUPER_ADMIN),
  validateRequest(ScrapeValidation.createProductScrapeSchema),
  ScrapeController.scrapeProduct
);

// Get history
router.get('/history', auth(...), ScrapeController.getScrapeHistory);

// Get stats
router.get('/stats', auth(...), ScrapeController.getScrapeStats);

// Delete result
router.delete('/:id', auth(...), ScrapeController.deleteScrape);
```

### 9.2 Service Layer

**File:** `src/app/modules/scrape/scrape.service.ts`

```typescript
const scrapeProduct = async (
  user: JwtPayload,
  payload: IProductScrapeRequest
): Promise<IProductScrapeResponse> => {
  logger.info(`[ScrapeService] User ${user.id} scraping product: ${payload.url}`);

  const startTime = Date.now();

  // Build options
  const options: IScrapeOptions = {
    url: payload.url,
    extractors: ['product'],
    selectors: payload.selectors,
    browser: {
      ...payload.browser,
      waitFor: payload.browser?.waitFor || 2000,
    },
    userId: user.id,
  };

  // Execute scrape
  const result = await scrapeHelper.scrape(options);

  // Save to database
  await ScrapeResult.create({
    url: result.url,
    status: result.status,
    engine: result.engine,
    data: result.data,
    timing: result.timing,
    userId: new Types.ObjectId(user.id),
  });

  return {
    success: true,
    product: result.data.product,
    timing: { totalMs: Date.now() - startTime },
  };
};
```

---

## 10. Performance Optimizations

### Timeline of Optimizations

```
Version 1.0 (Initial):
- Every request launches new browser
- 45 second timeout
- No caching
- Single method only
Performance: ~25-30 seconds per request

Version 1.5 (Multi-Method):
- Fallback chain added
- Smart CAPTCHA detection
- 15-layer price extraction
Performance: ~20-25 seconds, ~60% success rate

Version 2.0 (Browser Pool):
- Browser reuse
- 20 second timeout
- Optimized launch args
Performance: ~12-15 seconds, ~70% success rate
```

### Current Optimizations Applied

| Optimization | Before | After | Impact |
|--------------|--------|-------|--------|
| Browser Pool | New browser every request | Reuse for 50 requests | **~40% faster** |
| Timeout | 45s | 20s | **25s saved on failures** |
| Launch Args | Basic | Optimized (6 new args) | **~0.5-1s faster startup** |
| Smart Detection | Keyword only | Page size + content | **~20% fewer false positives** |

### Optimizations NOT Applied (Risk Assessment)

এই optimizations করা হয়নি কারণ এগুলো bot detection trigger করতে পারে:

| Optimization | Time Saved | Risk | Decision |
|--------------|------------|------|----------|
| Reduce delay (2-5s → 0.5-1.5s) | ~3s | **HIGH** - Amazon blocks | ❌ Not implemented |
| Change waitUntil | ~5-10s | **HIGH** - Dynamic content miss | ❌ Not implemented |
| Remove human simulation | ~2s | **HIGH** - CAPTCHA trigger | ❌ Not implemented |
| Block analytics/ads | ~2s | **MEDIUM** - Detection risk | ❌ Not implemented |

---

## 11. Issues Faced & Solutions

### Issue 1: Amazon False Positive CAPTCHA

**সমস্যা:**
```
Amazon product page এ "robot" শব্দ থাকে (e.g., "Robotic Vacuum")
আগের system সব Amazon page কে CAPTCHA মনে করত
```

**সমাধান:**
```typescript
// Smart detection - page size + product content check
if (pageSize > 50000 && hasProductContent) {
  return { isBlocked: false }; // Valid page!
}
```

**Result:** ~20% false positive reduction

---

### Issue 2: Slow Performance (20+ seconds)

**সমস্যা:**
```
প্রতিটি request এ:
1. Browser launch (~2s)
2. Page creation (~0.5s)
3. Navigation (~10s)
4. Extraction (~2s)
5. Browser close (~0.5s)
Total: ~15-20s
```

**সমাধান:**
```
Browser Pool Pattern:
- Launch once, reuse 50 times
- Only page creation needed (~0.1s)
- Restart every 50 requests (fresh fingerprint)
```

**Result:** ~40% faster subsequent requests

---

### Issue 3: High Memory Usage

**সমস্যা:**
```
প্রতিটি request এ নতুন browser = memory spikes
Concurrent requests = server crash risk
```

**সমাধান:**
```typescript
// Max 5 concurrent pages
if (this.activePages >= 5) {
  await wait(1000);
  return this.getPage(); // Retry
}
```

**Result:** Stable ~200MB memory usage

---

### Issue 4: 45s Timeout Too Long

**সমস্যা:**
```
Broken/slow pages এ user কে 45 seconds wait করতে হত
```

**সমাধান:**
```typescript
// Reduced from 45s to 20s
const timeout = browserOptions.timeout || 20000;
```

**Result:** 25 seconds saved on failures

---

### Issue 5: Single Method Failures

**সমস্যা:**
```
Direct request block হলে কোনো fallback ছিল না
Success rate: ~30-40%
```

**সমাধান:**
```
Multi-Method Engine:
1. Direct → Failed? Try next
2. AllOrigins → Failed? Try next
3. CORSProxy → Failed? Return error with all methods tried
```

**Result:** Success rate: ~60-70%

---

### Issue 6: AliExpress Page Load Timeout 🆕

**সমস্যা:**
```
Error: Puppeteer fetch failed: Navigation timeout of 20000 ms exceeded
```

**Root Cause Analysis:**
```
AliExpress একটি JavaScript-heavy Single Page Application (SPA)
Page load হওয়ার পরেও অনেক background requests চলতে থাকে:
- Analytics tracking
- Advertisement loading
- Real-time inventory updates
- Chat widget initialization

Default `networkidle2` option wait করে যতক্ষণ না ≤2 network requests pending থাকে
কিন্তু AliExpress এ এই condition কখনোই fulfill হয় না!

┌─────────────────────────────────────────────────────────────────┐
│  AliExpress Page Load Timeline                                   │
├─────────────────────────────────────────────────────────────────┤
│  0s ──► HTML received                                            │
│  2s ──► DOM ready (domcontentloaded fires)                      │
│  5s ──► Main content visible                                     │
│  8s ──► Images loading...                                        │
│ 15s ──► Analytics still running...                               │
│ 20s ──► TIMEOUT! (networkidle2 never achieved)                  │
│  ∞  ──► Background requests never stop                          │
└─────────────────────────────────────────────────────────────────┘
```

**সমাধান:**

**File:** `src/app/scraper/pipeline.ts` (lines 25-64)

```typescript
// JS-heavy sites that need extra wait time for React/Vue rendering
// waitUntil: 'domcontentloaded' is used for sites with endless background requests
const JS_HEAVY_SITES_WITH_WAIT = [
  {
    pattern: 'aliexpress.',
    waitFor: 5000,                          // 5s extra wait for JS rendering
    scrollToBottom: true,                    // Load lazy images
    waitUntil: 'domcontentloaded' as const,  // Don't wait for network idle!
    timeout: 45000                           // 45s total timeout
  },
  { pattern: 'tmall.', waitFor: 5000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 45000 },
  { pattern: 'taobao.', waitFor: 5000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 45000 },
  { pattern: 'temu.', waitFor: 4000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 40000 },
  { pattern: 'shein.', waitFor: 4000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 40000 },
  { pattern: 'wish.', waitFor: 3000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 35000 },
];

const applySiteSpecificOptions = (options: IScrapeOptions): IScrapeOptions => {
  const urlLower = options.url.toLowerCase();

  for (const site of JS_HEAVY_SITES_WITH_WAIT) {
    if (urlLower.includes(site.pattern)) {
      const browserOptions = options.browser || {};
      return {
        ...options,
        browser: {
          ...browserOptions,
          waitFor: browserOptions.waitFor ?? site.waitFor,
          scrollToBottom: browserOptions.scrollToBottom ?? site.scrollToBottom,
          timeout: browserOptions.timeout ?? site.timeout,
          waitUntil: browserOptions.waitUntil ?? site.waitUntil,
        },
      };
    }
  }
  return options;
};
```

**File:** `src/app/scraper/engines/puppeteer.engine.ts` (lines 106-112)

```typescript
// Use configurable waitUntil - 'domcontentloaded' for JS-heavy sites
const waitUntil = browserOptions.waitUntil || 'networkidle2';
const response = await page.goto(url, {
  waitUntil,
  timeout,
});
```

**waitUntil Options Comparison:**

| Option | কি করে | কখন ব্যবহার করবেন |
|--------|--------|-------------------|
| `load` | শুধু `load` event fire হলে | Static HTML pages |
| `domcontentloaded` | DOM ready হলেই ✅ | **JS-heavy SPAs (AliExpress)** |
| `networkidle0` | 500ms এ 0 requests থাকলে | খুবই strict, rarely use |
| `networkidle2` | 500ms এ ≤2 requests থাকলে | Most websites (default) |

**Result:** AliExpress pages now load successfully in ~19 seconds

---

### Issue 7: `__awaiter is not defined` Error 🆕

**সমস্যা:**
```
Error: Puppeteer fetch failed: __awaiter is not defined
```

**Root Cause Analysis:**
```
`autoScroll` function এ `page.evaluate()` এর ভিতরে `async/await` ব্যবহার করা হয়েছিল:

// ❌ BROKEN CODE
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {      // ← async inside evaluate
    await new Promise<void>(resolve => { // ← await inside evaluate
      // scroll logic...
    });
  });
}

সমস্যার কারণ:
1. page.evaluate() browser context এ code run করে, Node.js context এ নয়
2. TypeScript async/await কে compile করে __awaiter helper function দিয়ে
3. Browser context এ এই helper function available থাকে না!

┌─────────────────────────────────────┐
│         Node.js Context             │
│  - TypeScript helpers available     │
│  - __awaiter, __generator, etc.     │
└─────────────────────────────────────┘
           │
           │ page.evaluate()
           ▼
┌─────────────────────────────────────┐
│        Browser Context              │
│  - Pure JavaScript only             │
│  - NO TypeScript helpers            │  ← __awaiter not found!
│  - NO Node.js APIs                  │
└─────────────────────────────────────┘
```

**সমাধান:**

**File:** `src/app/scraper/engines/puppeteer.engine.ts` (lines 272-307)

```typescript
/**
 * Auto-scroll page to load lazy content
 *
 * NOTE: Don't use async/await inside page.evaluate() - it runs in browser context
 * and TypeScript's __awaiter helper isn't available there.
 */
async function autoScroll(page: Page): Promise<void> {
  // ✅ FIXED: No async keyword inside evaluate
  await page.evaluate(() => {
    // ✅ FIXED: return Promise instead of await
    return new Promise<void>(resolve => {
      let totalHeight = 0;
      const distance = 300 + Math.floor(Math.random() * 200);
      const scrollDelay = 150 + Math.floor(Math.random() * 100);

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, scrollDelay);

      // Max scroll time: 10 seconds
      setTimeout(() => {
        clearInterval(timer);
        window.scrollTo(0, 0);
        resolve();
      }, 10000);
    });
  });

  await sleep(1000 + Math.random() * 500);
}
```

**Key Changes:**

| Before (Broken) | After (Fixed) |
|-----------------|---------------|
| `async () => { await new Promise... }` | `() => { return new Promise... }` |
| `async` keyword inside evaluate | No `async` keyword |
| `await` inside evaluate | `return` the Promise |

**Result:** scrollToBottom feature now works correctly

---

### Issue 8: `waitFor: 2000ms` Override Problem 🆕

**সমস্যা:**
```
Pipeline এ AliExpress এর জন্য waitFor: 5000 set করা হয়েছে
কিন্তু logs দেখাচ্ছে waitFor: 2000
```

**Root Cause Analysis:**
```
scrape.service.ts এ hardcoded default value ছিল যা pipeline এর value override করে দিচ্ছিল:

// ❌ BROKEN CODE in scrape.service.ts
const options: IScrapeOptions = {
  url: payload.url,
  extractors: ['product'],
  browser: {
    waitFor: payload.browser?.waitFor || 2000,  // ← Always defaults to 2000!
  },
};

Call Flow:
┌─────────────────────────────────────────────────────────────────┐
│  1. scrape.service.ts sets waitFor: 2000                        │
│                    │                                             │
│                    ▼                                             │
│  2. pipeline.ts applySiteSpecificOptions() tries to set 5000    │
│     BUT browserOptions.waitFor ?? site.waitFor                  │
│     → 2000 ?? 5000 = 2000 (already set, nullish coalescing)    │
│                    │                                             │
│                    ▼                                             │
│  3. AliExpress gets waitFor: 2000 instead of 5000!              │
└─────────────────────────────────────────────────────────────────┘
```

**সমাধান:**

**File:** `src/app/modules/scrape/scrape.service.ts`

```typescript
// ❌ BEFORE (overriding pipeline defaults)
const options: IScrapeOptions = {
  url: payload.url,
  extractors: ['product'],
  browser: {
    waitFor: payload.browser?.waitFor || 2000,
  },
};

// ✅ AFTER (let pipeline handle defaults)
const options: IScrapeOptions = {
  url: payload.url,
  extractors: ['product'],
  browser: payload.browser,  // Pass through without defaults
};
```

**Result:** AliExpress now correctly gets 5000ms wait time

---

### Issue 9: "Could not extract product data" Error 🆕

**সমস্যা:**
```json
{
  "success": false,
  "message": "Could not extract product data from this page"
}
```

**Root Cause Analysis:**
```
AliExpress selectors এ `:has-text()` pseudo-selector ব্যবহার করা হয়েছিল:

// ❌ BROKEN SELECTORS
const ALIEXPRESS_SELECTORS = {
  price: '[class*="price"]:has-text("$")',     // ← Cheerio doesn't support!
  rating: '[class*="rating"]:has-text("out of")',
};

Library Support:
┌─────────────────────────────────────────────────────────────────┐
│  Library     │  :has-text() Support  │  Notes                   │
├──────────────┼───────────────────────┼──────────────────────────┤
│  Playwright  │  ✅ Supported          │  Playwright-specific     │
│  Puppeteer   │  ❌ Not supported      │  Uses standard CSS       │
│  Cheerio     │  ❌ Not supported      │  Standard CSS only       │
└─────────────────────────────────────────────────────────────────┘

Cheerio শুধু standard CSS selectors support করে!
```

**সমাধান:**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 45-160)

```typescript
// ✅ FIXED: Use standard CSS selectors with fuzzy class matching
const ALIEXPRESS_SELECTORS = {
  // Price - multiple fallback patterns
  price: [
    '[class*="price--currentPriceText"] .notranslate',
    '[class*="price--current"] .notranslate',
    '[class*="es--wrap--"] .notranslate',
    '[data-pl="product-price"]',
    '[data-spm="price"]',
    '[class*="Price--currentPriceText"]',
    '[class*="price--current"]',
    // ... 15+ more patterns
  ].join(', '),

  // Rating - multiple fallback patterns
  rating: [
    '[class*="reviewer--wrap"] [class*="rating"]',
    '[class*="overview-rating"] [class*="rating"]',
    '[class*="rating--wrap--"] span',
    // ... 10+ more patterns
  ].join(', '),
};
```

**Selector Strategy:**

| Strategy | Example | কেন কাজ করে |
|----------|---------|-------------|
| Fuzzy Class | `[class*="price"]` | Class এ "price" থাকলেই match |
| Multiple Fallbacks | `selector1, selector2` | একটা fail করলে পরেরটা try |
| Data Attributes | `[data-pl="product-price"]` | More stable than class names |
| No Pseudo-selectors | Standard CSS only | Cheerio compatible |

**Result:** Product extraction now works correctly

---

### Issue 10: AliExpress Price Missing Despite DOM Elements 🆕

**সমস্যা:**
```json
{
  "title": "2pcs Computer Desk Drawer Slides...",
  "rating": 4.9,
  "images": [20 images],
  // ❌ NO price field!
}
```

**Root Cause Analysis:**
```
AliExpress price rendering:
1. Initial HTML এ price নেই
2. JavaScript execute হয়ে price render করে
3. Price dynamic elements এ থাকে (notranslate spans)
4. কখনো price URL parameters এ encoded থাকে

DOM Structure:
┌─────────────────────────────────────────────────────────────────┐
│  <div class="es--wrap--randomHash123">                          │
│    <span class="notranslate">€</span>                           │
│    <span class="notranslate">9</span>                           │
│    <span class="notranslate">.</span>                           │
│    <span class="notranslate">99</span>                          │
│  </div>                                                          │
└─────────────────────────────────────────────────────────────────┘
                    ↓
         Single selector দিয়ে extract করা কঠিন!
```

**সমাধান: 9-Method Price Extraction System**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 225-423)

```typescript
// 9টি fallback method - একটা fail করলে পরেরটা try করে

// Method 1: Primary CSS Selectors
const priceSelector = selectors?.price || defaultSelectors.price;
let priceText = $(priceSelector).first().text().trim();
let currentPrice = parsePrice(priceText);

// Method 2: span.notranslate elements
if (isAliExpress && currentPrice === null) {
  const notranslateElements = $('span.notranslate');
  notranslateElements.each((_, el) => {
    const text = $(el).text().trim();
    if (/^(US\s*)?\$[\d,.]+$|^€[\d,.]+$/.test(text)) {
      currentPrice = parsePrice(text);
    }
  });
}

// Method 3: Price containers
if (currentPrice === null) {
  const priceContainers = $('[class*="price"], [class*="Price"]');
  // ... extract from container text
}

// Method 4: Body text search
if (currentPrice === null) {
  const bodyText = $('body').text();
  const pricePatterns = bodyText.match(/US\s*\$\s*[\d,.]+/g);
  // ... find first valid price
}

// Method 5: URL Parameters (pdp_npi) ⭐ সবচেয়ে Reliable!
if (currentPrice === null) {
  const urlObj = new URL(baseUrl);
  const pdpNpi = urlObj.searchParams.get('pdp_npi');
  if (pdpNpi) {
    // pdp_npi=EUR%2122.20%219.99 → EUR!22.20!9.99
    const decoded = decodeURIComponent(pdpNpi);
    const priceMatch = decoded.match(/([A-Z]{3})[!%]*([\d.]+)[!%]*([\d.]+)/);
    // priceMatch[1] = "EUR" (currency)
    // priceMatch[2] = "22.20" (original price)
    // priceMatch[3] = "9.99" (current price) ✅
  }
}

// Method 6: JSON-LD Structured Data (Schema.org)
if (currentPrice === null) {
  $('script[type="application/ld+json"]').each((_, script) => {
    const data = JSON.parse($(script).html());
    if (data['@type'] === 'Product') {
      currentPrice = data.offers.price;
    }
  });
}

// Method 7: Data attributes
if (currentPrice === null) {
  const dataPrice = $('[data-price]').attr('data-price');
  // ...
}

// Method 8: Meta tags
if (currentPrice === null) {
  const metaPrice = $('meta[property="product:price:amount"]').attr('content');
  // ...
}

// Method 9: Script tag parsing
if (currentPrice === null) {
  $('script').each((_, script) => {
    const scriptText = $(script).html();
    // Look for: "price": 9.99, "currentPrice": "9.99", etc.
  });
}
```

**Method 5 (URL Parameters) - AliExpress এ সবচেয়ে Reliable:**

```
AliExpress URL Example:
https://aliexpress.com/item/1005010386485727.html?pdp_npi=6%40dis%21EUR%2122.20%219.99%21...

URL Parameter: pdp_npi=6%40dis%21EUR%2122.20%219.99%21...

Decoded: 6@dis!EUR!22.20!9.99!...

Breakdown:
┌─────────────────────────────────────────────────────────────────┐
│  6@dis!EUR!22.20!9.99!...                                        │
│         │    │     │                                             │
│         │    │     └─ Current Price: €9.99 ✅                    │
│         │    └─ Original Price: €22.20                          │
│         └─ Currency: EUR                                         │
└─────────────────────────────────────────────────────────────────┘
```

**কেন URL Parameter Method সবচেয়ে Reliable:**
1. DOM rendering এর উপর নির্ভর করে না
2. JavaScript execute হওয়ার আগেই available
3. AliExpress নিজেই এই data URL এ embed করে
4. Cache/CDN layer এও পাওয়া যায়

**Result:**
- Price extraction success rate: ~95%
- Example output: `{ current: 9.99, currency: "EUR" }`

---

### Issue 11: AliExpress Rating Showing as null 🆕

**সমস্যা:**
```json
{
  "title": "...",
  "price": { "current": 9.99, "currency": "EUR" },
  "rating": null  // ❌ Should be 4.9
}
```

**Root Cause Analysis:**
```
AliExpress rating formats:
1. "4.9" (simple number)
2. "4.9/5" (with max)
3. "4.9 out of 5" (text format)
4. "98.1% Positive Feedback" (percentage format) ← Common!

Standard selectors শুধু format 1-3 handle করত
Percentage format miss হচ্ছিল
```

**সমাধান: 4-Method Rating Extraction**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 543-606)

```typescript
// AliExpress special handling for rating
if (isAliExpress && !product.rating) {

  // Method 1: Rating containers
  const ratingContainers = $('[class*="rating"], [class*="Rating"]');
  ratingContainers.each((_, el) => {
    const text = $(el).text().trim();
    // Match: "4.9", "4.9/5", "4.9 out of 5"
    const match = text.match(/^(\d+(?:\.\d+)?)\s*(?:out of 5)?$/i) ||
                  text.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
    if (match && parseFloat(match[1]) <= 5) {
      product.rating = parseFloat(match[1]);
    }
  });

  // Method 2: Seller section
  if (!product.rating) {
    const sellerSection = $('[class*="seller"], [class*="store"]');
    sellerSection.each((_, el) => {
      const text = $(el).text();
      const match = text.match(/(\d+(?:\.\d+)?)\s*(?:stars?|rating)/i);
      // ...
    });
  }

  // Method 3: Positive Feedback Percentage → Rating Conversion ⭐
  if (!product.rating) {
    const feedbackMatch = $('body').text().match(/(\d+(?:\.\d+)?)\s*%\s*(?:positive|feedback)/i);
    if (feedbackMatch) {
      const percentage = parseFloat(feedbackMatch[1]);
      if (percentage >= 80 && percentage <= 100) {
        // Convert: 80% = 4.0, 100% = 5.0
        product.rating = Math.round((percentage / 20) * 10) / 10;
      }
    }
  }

  // Method 4: Brand text extraction
  if (!product.rating && product.brand) {
    const brandMatch = product.brand.match(/(\d+(?:\.\d+)?)\s*%/);
    if (brandMatch) {
      const percentage = parseFloat(brandMatch[1]);
      product.rating = Math.round((percentage / 20) * 10) / 10;
    }
  }
}
```

**Percentage to Rating Conversion Formula:**

```
Rating = Percentage / 20

Conversion Table:
┌────────────────────────────────────────────────────────────┐
│  Positive Feedback  │  Calculated Rating  │  Display       │
├─────────────────────┼─────────────────────┼────────────────┤
│  100%               │  100 / 20 = 5.0     │  ⭐⭐⭐⭐⭐     │
│  98.1%              │  98.1 / 20 = 4.9    │  ⭐⭐⭐⭐⭐     │
│  95%                │  95 / 20 = 4.75     │  ⭐⭐⭐⭐⭐     │
│  90%                │  90 / 20 = 4.5      │  ⭐⭐⭐⭐½     │
│  80%                │  80 / 20 = 4.0      │  ⭐⭐⭐⭐       │
└────────────────────────────────────────────────────────────┘
```

**Result:**
- Rating extraction success rate: ~90%
- Example: "98.1% Positive Feedback" → `rating: 4.9`

---

### Issue 12: Alibaba.com Scraping Not Working (Only Title Extracted) 🆕

**সমস্যা:**
```json
// POST /api/v1/scrape/product
// URL: https://www.alibaba.com/product-detail/2024-new-style...

// Response - শুধু title পাওয়া যাচ্ছে
{
  "status": "partial",
  "data": {
    "product": {
      "title": "2024 new style hot selling women bag...",
      "images": [],   // ❌ Empty
      "price": null,  // ❌ Not extracted
      "rating": null  // ❌ Not extracted
    }
  }
}
```

**Server Logs:**
```
[Scraper] Using auto engine
[Engine] Selected: direct (not JS-heavy)  // ❌ Problem!
[Scraper] Extraction complete in 245ms
```

**Root Cause Analysis:**
```
┌──────────────────────────────────────────────────────────────────┐
│                    ALIBABA.COM ISSUES                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Engine Selection Problem:                                     │
│     - Alibaba.com was NOT in JS_HEAVY_DOMAINS list                │
│     - System used "direct" HTTP fetch instead of Puppeteer        │
│     - Alibaba uses heavy JavaScript for price/image rendering     │
│                                                                   │
│  2. Selector Problem:                                             │
│     - No ALIBABA_SELECTORS defined                                │
│     - Using GENERIC_SELECTORS which don't match Alibaba DOM       │
│     - Alibaba is B2B platform with different structure            │
│                                                                   │
│  3. Price Format Problem:                                         │
│     - Alibaba shows price RANGES: "$0.50 - $2.00"                 │
│     - Unlike AliExpress (single price): "$9.99"                   │
│     - Standard price parser can't handle ranges                   │
│                                                                   │
│  4. Rating Format Problem:                                        │
│     - Alibaba shows supplier scores, not product ratings          │
│     - Format: "4.9 supplier score" or "98% response rate"         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**সমাধান: 4-Part Fix**

**Part 1: Add Alibaba to JS-Heavy Sites**

**File:** `src/app/scraper/engines/puppeteer.engine.ts` (lines 209-227)

```typescript
// Use Puppeteer for known JS-heavy domains
const jsHeavyDomains = [
  'amazon.',
  'ebay.',
  'walmart.',
  'target.',
  'aliexpress.',   // 🆕 Added
  'alibaba.com',   // 🆕 Added - B2B platform
  'instagram.',
  'twitter.',
  'x.com',
  'facebook.',
  'linkedin.',
  'pinterest.',
  'airbnb.',
  'booking.com',
  'expedia.',
  'tripadvisor.',
  'yelp.',
];
```

**Part 2: Add ALIBABA_SELECTORS**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 162-286)

```typescript
// Alibaba.com-specific selectors (B2B platform)
const ALIBABA_SELECTORS = {
  // Title
  title: [
    '.module-pdp-title h1',
    '.product-title h1',
    'h1.product-name',
    '[class*="title"] h1',
    '.ma-title',
    'h1[data-spm]',
    '.detail-title h1',
  ].join(', '),

  // Price - Alibaba shows price ranges like "$0.50 - $2.00"
  price: [
    '.price-item .price',
    '.module-price .price',
    '[class*="price-value"]',
    '.ma-spec-price .price',
    '.ladder-price .price',
    '[class*="price"] .num',
    '.product-price-value',
    '[data-spm-anchor-id*="price"]',
    '.price-range',
    '.ma-ref-price',
  ].join(', '),

  // Images
  images: [
    '.detail-gallery-turn img',
    '.main-image-wrapper img',
    '.vertical-img-wrap img',
    '.module-pdp-media img',
    'img[src*="alicdn.com"]',
    'img[src*="cbu01.alicdn"]',
    '.image-preview img',
    '.gallery-preview img',
    '[class*="gallery"] img',
    '.detail-image img',
  ].join(', '),

  // Rating (supplier scores)
  rating: [
    '.seb-supplier-review__score',
    '.supplier-review-score',
    '[class*="review-score"]',
    '[class*="rating-value"]',
    '.transaction-history .score',
    '[class*="star-rating"]',
  ].join(', '),

  // ... more selectors for description, features, seller, shipping, MOQ
};
```

**Part 3: Add 6-Method Price Extraction for Alibaba**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 555-677)

```typescript
// Alibaba.com special handling: B2B platform with price ranges
if (isAlibaba && currentPrice === null) {

  // Method 1: Look for price in various container patterns
  const priceContainers = $('[class*="price"], [class*="Price"], .ma-spec-price');
  priceContainers.each((_, container) => {
    const text = $(container).text().trim();
    // Extract: "$0.50 - $2.00" or "US$ 1.00"
    const priceMatch = text.match(/(US\s*)?\$\s*([\d,.]+)/);
    if (priceMatch && priceMatch[2]) {
      currentPrice = parsePrice(priceMatch[2]);
    }
  });

  // Method 2: Look for JSON-LD structured data
  if (currentPrice === null) {
    $('script[type="application/ld+json"]').each((_, script) => {
      // Parse Product schema and extract offers.price
    });
  }

  // Method 3: Look for meta tags with price info
  if (currentPrice === null) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content');
    // ...
  }

  // Method 4: Extract from script tags containing price data
  if (currentPrice === null) {
    $('script').each((_, script) => {
      // Look for: "price": 0.50, "minPrice": 0.50, "priceRangeMin": 0.50
    });
  }

  // Method 5: Look for data attributes with price info
  if (currentPrice === null) {
    $('[data-price], [data-value]').each((_, el) => {
      // Extract data-price attribute
    });
  }

  // Method 6: Parse price ranges (take minimum price) ⭐
  if (currentPrice === null) {
    const bodyText = $('body').text();
    // Match: "$0.50 - $2.00", "US $1.00 - US $5.00"
    const rangeMatch = bodyText.match(/(US\s*)?\$\s*([\d,.]+)\s*[-–]\s*(US\s*)?\$\s*([\d,.]+)/);
    if (rangeMatch) {
      const minPrice = parsePrice(rangeMatch[2]);
      if (minPrice && minPrice > 0) {
        currentPrice = minPrice;
      }
    }
  }
}
```

**Part 4: Add 3-Method Rating Extraction for Alibaba**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 931-977)

```typescript
// Alibaba.com special handling for rating
if (isAlibaba && !product.rating) {

  // Method 1: Look for supplier review scores
  const ratingContainers = $('[class*="review-score"], [class*="rating"], .seb-supplier-review__score');
  ratingContainers.each((_, el) => {
    const text = $(el).text().trim();
    // Match: "4.9", "5.0 out of 5", "4.8/5"
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:out of 5|\/\s*5)?/i);
    if (match) {
      const rating = parseFloat(match[1]);
      if (rating > 0 && rating <= 5) {
        product.rating = rating;
      }
    }
  });

  // Method 2: Look for transaction ratings in supplier info
  if (!product.rating) {
    const supplierSection = $('[class*="supplier"], [class*="company"]');
    // Extract rating from supplier section
  }

  // Method 3: Look for positive feedback percentage
  if (!product.rating) {
    const feedbackMatch = $('body').text().match(/(\d+(?:\.\d+)?)\s*%\s*(?:positive|response)/i);
    if (feedbackMatch) {
      const percentage = parseFloat(feedbackMatch[1]);
      // Convert: 98% → 4.9 rating
      product.rating = Math.round((percentage / 20) * 10) / 10;
    }
  }
}
```

**Alibaba vs AliExpress Differences:**

```
┌──────────────────────────────────────────────────────────────────────┐
│              ALIBABA.COM vs ALIEXPRESS COMPARISON                     │
├──────────────────────────────────────────────────────────────────────┤
│  Feature          │  Alibaba.com (B2B)    │  AliExpress (B2C)        │
├───────────────────┼───────────────────────┼──────────────────────────┤
│  Target Users     │  Businesses           │  Consumers               │
│  Price Format     │  Ranges ($0.50-$2.00) │  Single ($9.99)          │
│  MOQ (Min Order)  │  Yes (e.g., 100 pcs)  │  Usually 1               │
│  Rating Type      │  Supplier score       │  Product rating          │
│  Shipping         │  Lead time (days)     │  Free shipping/cost      │
│  Images           │  Product + factory    │  Product only            │
│  CDN              │  cbu01.alicdn.com     │  ae01.alicdn.com         │
└──────────────────────────────────────────────────────────────────────┘
```

**Result:**
- Alibaba.com now fully supported
- Price extraction with range parsing (returns minimum price)
- Supplier rating extraction
- Images with CDN URL upgrade (thumbnail → full size)
- Seller/supplier and shipping/lead time extraction

**Example Success Response:**
```json
{
  "status": "success",
  "data": {
    "product": {
      "title": "2024 new style hot selling women bag...",
      "price": {
        "current": 0.50,  // ✅ Minimum from range "$0.50 - $2.00"
        "currency": "USD"
      },
      "images": [
        "https://cbu01.alicdn.com/img/xxx_800x800.jpg"  // ✅ Upgraded
      ],
      "rating": 4.9,      // ✅ From supplier score or %
      "seller": "Guangzhou Fashion Co., Ltd",
      "shipping": "Lead time: 7-15 days"
    }
  }
}
```

---

### Issue 13: Walmart Wrong Price Extraction ($6 Instead of Actual Price) 🆕

**সমস্যা:**
```json
// POST /api/v1/scrape/product
// URL: https://www.walmart.com/ip/EDX-Arched-Full-Length-Mirror-59-x16...

// Response - ভুল price দেখাচ্ছে!
{
  "product": {
    "title": "EDX Arched Full Length Mirror 59\"x16\"...",
    "price": {
      "current": 6,     // ❌ WRONG! Actual price is $69.99
      "currency": "USD"
    }
  }
}
```

**Root Cause Analysis:**
```
┌──────────────────────────────────────────────────────────────────┐
│              WALMART PRICE EXTRACTION BUG                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Timeline of Extraction:                                          │
│                                                                   │
│  1. priceSelector runs first (line 537-539):                     │
│     const priceText = $(priceSelector).first().text().trim();    │
│     let currentPrice = parsePrice(priceText);                    │
│     │                                                             │
│     └─► Selector picks WRONG element: shipping cost "$6"         │
│         (Walmart page has many price-like elements)              │
│                                                                   │
│  2. Walmart special handling runs later (line 1195):             │
│     if (currentPrice === null && productData.priceInfo...) {     │
│     │                                                             │
│     └─► SKIPPED! Because currentPrice is already $6              │
│         __NEXT_DATA__ has correct $69.99 but never used          │
│                                                                   │
│  3. Result: Returns $6 instead of $69.99                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

Walmart Page Elements with Dollar Signs:
┌─────────────────────────────────────────┐
│ [itemprop="price"]        → "$69.99"    │ ← Correct
│ [class*="shipping"]       → "$6"        │ ← Picked by selector!
│ [class*="installment"]    → "$12/mo"    │
│ [class*="savings"]        → "Save $20"  │
│ JSON in __NEXT_DATA__     → "$69.99"    │ ← Most reliable
└─────────────────────────────────────────┘
```

**সমাধান:**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 1015-1024)

```typescript
// BEFORE (Bug): Only set price if currentPrice is null
if (currentPrice === null && productData.priceInfo?.currentPrice?.price) {
  currentPrice = productData.priceInfo.currentPrice.price;
  // ...
}

// AFTER (Fixed): ALWAYS use __NEXT_DATA__ price for Walmart
// Walmart's page has many price-like elements (shipping costs, etc.) that confuse selectors
if (productData.priceInfo?.currentPrice?.price) {
  currentPrice = productData.priceInfo.currentPrice.price;  // Override selector price!
  priceText = `$${currentPrice}`;
  product.price = {
    current: currentPrice as number,
    currency: 'USD',
  };
}
```

**কেন এই সমাধান কাজ করে:**
```
✅ __NEXT_DATA__ JSON হলো Walmart এর "source of truth"
✅ NextJS server-side render এ actual price থাকে
✅ Selectors unreliable কারণ multiple price-like elements আছে
✅ OVERRIDE করলে সঠিক price guarantee পাওয়া যায়
```

**Result:**
```json
// Fixed Response
{
  "product": {
    "title": "EDX Arched Full Length Mirror 59\"x16\"...",
    "price": {
      "current": 69.99,   // ✅ Correct!
      "currency": "USD"
    },
    "images": ["https://i5.walmartimages.com/seo/..."],  // ✅
    "rating": 4.5,       // ✅
    "reviewCount": 3006, // ✅
    "brand": "edx"       // ✅
  }
}
```

---

### Issue 14: Walmart & Target Not Fully Supported (Only Title Extracted) 🆕

**সমস্যা:**
```
Walmart এবং Target শুধু JS_HEAVY_SITES_WITH_WAIT list এ ছিল
কিন্তু dedicated selectors এবং special handling ছিল না
Result: শুধু title+price (wrong) extract হতো
```

**সমাধান: Complete Implementation**

**Part 1: WALMART_SELECTORS Added**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 288-377)

```typescript
const WALMART_SELECTORS = {
  title: [
    'h1[itemprop="name"]',
    'h1.prod-ProductTitle',
    '[data-testid="product-title"]',
    'h1.lh-copy',
    'h1[class*="ProductTitle"]',
  ].join(', '),

  price: [
    '[data-testid="price-wrap"] [itemprop="price"]',
    '[itemprop="price"]',
    '.price-characteristic',
    '[data-automation="product-price"]',
    '[class*="price-main"]',
  ].join(', '),

  images: [
    '[data-testid="hero-image-container"] img',
    '.prod-hero-image-container img',
    '[class*="carousel"] img',
    'img[data-testid="product-image"]',
  ].join(', '),

  rating: [
    '[data-testid="rating-stars"] [itemprop="ratingValue"]',
    '[itemprop="ratingValue"]',
    '[class*="rating"] span[class*="average"]',
  ].join(', '),

  // ... description, reviewCount, availability, features, brand
};
```

**Part 2: TARGET_SELECTORS Added**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 379-462)

```typescript
const TARGET_SELECTORS = {
  title: [
    'h1[data-test="product-title"]',
    '[data-test="@web/ProductDetails"] h1',
    'h1[class*="Heading"]',
  ].join(', '),

  price: [
    'span[data-test="product-price"]',
    '[data-test="product-price-current"]',
    '[data-test="@web/ProductPrice"] span',
  ].join(', '),

  images: [
    '[data-test="@web/ProductImage"] img',
    '[data-test="product-carousel"] img',
    '[class*="ProductImages"] img',
  ].join(', '),

  // Target uses data-test attributes extensively
  // ...
};
```

**Part 3: __NEXT_DATA__ Extraction for Walmart**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 997-1086)

```typescript
if (isWalmart) {
  // __NEXT_DATA__ JSON extraction (most reliable for Walmart)
  try {
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
      const nextData = JSON.parse(nextDataScript);
      const productData = nextData?.props?.pageProps?.initialData?.data?.product
                       || nextData?.props?.pageProps?.product
                       || {};

      // Extract: title, price, images, rating, reviewCount, brand, description
      // __NEXT_DATA__ price OVERRIDES selector price (more reliable)
    }
  } catch { /* continue */ }

  // Fallback: JSON-LD extraction
  $('script[type="application/ld+json"]').each((_, script) => {
    // Extract from schema.org structured data
  });
}
```

**Part 4: Target Special Handling**

**File:** `src/app/scraper/extractors/product.extractor.ts` (lines 1089-1157)

```typescript
if (isTarget) {
  // Method 1: JSON-LD extraction
  $('script[type="application/ld+json"]').each((_, script) => {
    // Extract from schema.org Product type
  });

  // Method 2: __TGT_PRELOAD_STATE__ extraction
  try {
    const tgtStateScript = $('script:contains("__TGT_PRELOAD_STATE__")').html();
    if (tgtStateScript) {
      const stateMatch = tgtStateScript.match(
        new RegExp('__TGT_PRELOAD_STATE__\\s*=\\s*({.+?});', 's')
      );
      if (stateMatch) {
        const tgtState = JSON.parse(stateMatch[1]);
        // Extract from Target's React state
      }
    }
  } catch { /* continue */ }
}
```

**Part 5: JS-Heavy Sites Configuration**

**File:** `src/app/scraper/pipeline.ts` (lines 32-34)

```typescript
const JS_HEAVY_SITES_WITH_WAIT = [
  // ... existing sites
  // Walmart and Target - NextJS/React sites with bot protection
  { pattern: 'walmart.', waitFor: 4000, scrollToBottom: true,
    waitUntil: 'domcontentloaded' as const, timeout: 40000 },
  { pattern: 'target.', waitFor: 3500, scrollToBottom: true,
    waitUntil: 'networkidle2' as const, timeout: 35000 },
];
```

**Part 6: Anti-Bot Strategies**

See Section 8 for:
- PerimeterX bypass for Walmart
- Akamai bypass for Target
- Fingerprint spoofing

**Result:**

| Site | Before | After |
|------|--------|-------|
| **Walmart** | ❌ Only title, wrong price ($6) | ✅ title, price, images, rating, reviews, brand |
| **Target** | ❌ Only title | ✅ title, price, images, rating, brand |

---

## 14. Configuration Options

### Full Options Reference

```typescript
interface IScrapeOptions {
  // Required
  url: string;                    // Target URL

  // Engine Selection
  engine?: 'cheerio' | 'puppeteer' | 'auto' | 'multi-method';

  // Extractors
  extractors?: Array<
    'text' | 'images' | 'links' | 'tables' | 'prices' | 'product' | 'metadata'
  >;

  // Custom Selectors
  selectors?: {
    title?: string;
    price?: string;
    images?: string;
    description?: string;
  };

  // Browser Options (Puppeteer only)
  browser?: {
    headless?: boolean;           // Default: true
    timeout?: number;             // Default: 20000 (ms)
    waitFor?: string | number;    // Selector or milliseconds
    scrollToBottom?: boolean;
  };

  // Anti-Bot Protection
  protection?: {
    randomDelay?: boolean;        // Default: true
    minDelay?: number;            // Default: 2000 (ms)
    maxDelay?: number;            // Default: 5000 (ms)
    rotateUserAgent?: boolean;    // Default: true
  };

  // Retry Options
  maxRetries?: number;            // Default: 3
}
```

---

## 13. Usage Examples

### Example 1: Amazon Product Scrape

```typescript
// POST /api/v1/scrape/product
{
  "url": "https://www.amazon.com/dp/B09V3KXJPB"
}

// Response
{
  "success": true,
  "product": {
    "title": "Apple AirPods Pro (2nd Generation)",
    "price": { "current": 249.00, "currency": "USD" },
    "images": ["https://..."],
    "rating": 4.7,
    "reviewCount": 85432,
    "confidence": 92
  },
  "timing": { "totalMs": 12340 }
}
```

### Example 1.1: eBay Product Scrape 🆕

```typescript
// POST /api/v1/scrape/product
{
  "url": "https://www.ebay.com/itm/326721891882"
}

// Response
{
  "success": true,
  "product": {
    "title": "Apple iPhone 13 Pro Max, 128/256/512GB/1TB, Unlocked - Refurbished Excellent",
    "price": {
      "current": 499.99,
      "currency": "USD"
    },
    "images": [
      "https://i.ebayimg.com/images/g/xxxxx/s-l1600.jpg",
      "https://i.ebayimg.com/images/g/yyyyy/s-l1600.jpg"
    ],
    "description": "This is a refurbished device that has been professionally inspected...",
    "rating": 4.8,
    "reviewCount": 1234,
    "availability": "1000 available",
    "condition": "Refurbished - Excellent",  // 🆕 eBay-specific
    "seller": "refurb_seller_store",         // 🆕 eBay-specific
    "brand": "Apple",
    "features": [
      "Storage Capacity: 128GB",
      "Model: iPhone 13 Pro Max",
      "Network: Unlocked"
    ],
    "url": "https://www.ebay.com/itm/326721891882",
    "confidence": 90
  },
  "timing": { "totalMs": 14500 }
}
```

**eBay vs Amazon Response Difference:**

| Field | Amazon | eBay |
|-------|--------|------|
| `condition` | ❌ Not available | ✅ "New", "Refurbished - Excellent", etc. |
| `seller` | ❌ Not available | ✅ Seller name/store |
| `price.currency` | Usually "USD" | "USD" (auto-detected from symbol) |

### Example 1.2: AliExpress Product Scrape 🆕

```typescript
// POST /api/v1/scrape/product
{
  "url": "https://www.aliexpress.com/item/1005010247379742.html"
}

// Response
{
  "success": true,
  "product": {
    "title": "2024 New Wireless Bluetooth Earbuds TWS Headphones with Charging Case",
    "price": {
      "current": 12.99,
      "original": 25.99,
      "currency": "USD",
      "discount": "50%"
    },
    "images": [
      "https://ae01.alicdn.com/kf/xxxxx.jpg",
      "https://ae01.alicdn.com/kf/yyyyy.jpg"
    ],
    "description": "High quality wireless earbuds with active noise cancellation...",
    "rating": 4.7,
    "reviewCount": 5432,
    "availability": "In Stock",
    "seller": "TechGadgets Official Store",  // 🆕 AliExpress-specific
    "shipping": "Free Shipping to Bangladesh",  // 🆕 AliExpress-specific
    "brand": "Generic",
    "features": [
      "Bluetooth Version: 5.3",
      "Battery Life: 30 hours",
      "Water Resistant: IPX5"
    ],
    "url": "https://www.aliexpress.com/item/1005010247379742.html",
    "confidence": 88
  },
  "timing": { "totalMs": 16200 }
}
```

**AliExpress vs eBay vs Amazon Response Difference:**

| Field | Amazon | eBay | AliExpress |
|-------|--------|------|------------|
| `condition` | ❌ | ✅ | ❌ |
| `seller` | ❌ | ✅ | ✅ 🆕 |
| `shipping` | ❌ | ❌ | ✅ 🆕 |

### Example 1.3: Alibaba.com B2B Product Scrape 🆕

```typescript
// POST /api/v1/scrape/product
{
  "url": "https://www.alibaba.com/product-detail/2024-new-style-hot-selling-women_1601234567890.html"
}

// Response
{
  "success": true,
  "product": {
    "title": "2024 New Style Hot Selling Women Bag Genuine Leather Handbag",
    "price": {
      "current": 8.50,           // ✅ Minimum from range "$8.50 - $15.00"
      "currency": "USD"
    },
    "images": [
      "https://cbu01.alicdn.com/img/xxxxx_800x800.jpg",  // ✅ Upgraded from thumbnail
      "https://cbu01.alicdn.com/img/yyyyy_800x800.jpg"
    ],
    "description": "High quality genuine leather handbag for women...",
    "rating": 4.8,               // ✅ From supplier score
    "reviewCount": 127,
    "availability": "MOQ: 100 pieces",  // 🆕 Alibaba B2B specific
    "seller": "Guangzhou Fashion Leather Co., Ltd",  // 🆕 Supplier name
    "shipping": "Lead time: 7-15 days",  // 🆕 Lead time instead of shipping cost
    "brand": "Custom Logo Available",
    "features": [
      "Material: Genuine Leather",
      "Size: 30cm x 25cm x 12cm",
      "Color: Black, Brown, Red, Navy",
      "OEM/ODM: Available",
      "Sample Order: Accepted"
    ],
    "url": "https://www.alibaba.com/product-detail/...",
    "confidence": 85
  },
  "timing": { "totalMs": 18500 }
}
```

**Alibaba.com B2B vs AliExpress B2C Comparison:**

| Field | AliExpress (B2C) | Alibaba.com (B2B) |
|-------|------------------|-------------------|
| `price` | Single price: $12.99 | Price range minimum: $8.50 🆕 |
| `availability` | "In Stock" | "MOQ: 100 pieces" 🆕 |
| `seller` | Store name | Company name 🆕 |
| `shipping` | "Free Shipping" | "Lead time: 7-15 days" 🆕 |
| `rating` | Product rating | Supplier score 🆕 |

### Example 1.4: Walmart Product Scrape 🆕

```typescript
// POST /api/v1/scrape/product
{
  "url": "https://www.walmart.com/ip/EDX-Arched-Full-Length-Mirror-59-x16-Full-Body-Mirror/5083899253"
}

// Response
{
  "success": true,
  "product": {
    "title": "EDX Arched Full Length Mirror 59\"x16\" Full Body Mirror Rectangle Free Standing...",
    "price": {
      "current": 69.99,           // ✅ From __NEXT_DATA__ JSON (most reliable)
      "currency": "USD"
    },
    "images": [
      "https://i5.walmartimages.com/seo/EDX-Arched-Full-Length-Mirror-59-x16...jpeg"
    ],
    "description": "About this itemProduct detailsElevate your surroundings with our expansive...",
    "rating": 4.5,
    "reviewCount": 3006,
    "availability": "add to cart",  // ✅ From __NEXT_DATA__
    "brand": "edx",                 // ✅ From __NEXT_DATA__
    "url": "https://www.walmart.com/ip/...",
    "confidence": 90
  },
  "timing": { "totalMs": 21250 }
}
```

**Walmart Extraction Methods:**

| Priority | Method | Data Source | Reliability |
|----------|--------|-------------|-------------|
| 1 | `__NEXT_DATA__` JSON | NextJS server-rendered data | ⭐⭐⭐⭐⭐ Most reliable |
| 2 | JSON-LD | `<script type="application/ld+json">` | ⭐⭐⭐⭐ Good fallback |
| 3 | CSS Selectors | DOM elements | ⭐⭐ Can pick wrong elements |

### Example 1.5: Target Product Scrape 🆕

```typescript
// POST /api/v1/scrape/product
{
  "url": "https://www.target.com/p/apple-airpods-pro-2nd-generation/-/A-85978612"
}

// Response
{
  "success": true,
  "product": {
    "title": "Apple AirPods Pro (2nd Generation)",
    "price": {
      "current": 199.99,
      "currency": "USD"
    },
    "images": [
      "https://target.scene7.com/is/image/Target/..."
    ],
    "description": "The new AirPods Pro feature...",
    "rating": 4.8,
    "reviewCount": 12543,
    "brand": "Apple",
    "url": "https://www.target.com/p/...",
    "confidence": 88
  },
  "timing": { "totalMs": 18500 }
}
```

**Target Extraction Methods:**

| Priority | Method | Data Source | Reliability |
|----------|--------|-------------|-------------|
| 1 | JSON-LD | `<script type="application/ld+json">` | ⭐⭐⭐⭐⭐ Most reliable |
| 2 | `__TGT_PRELOAD_STATE__` | React state in script | ⭐⭐⭐⭐ Good fallback |
| 3 | `data-test` Selectors | DOM elements with data-test | ⭐⭐⭐ Reliable |

**Walmart vs Target Comparison:**

| Aspect | Walmart | Target |
|--------|---------|--------|
| **Framework** | NextJS | React |
| **Best Data Source** | `__NEXT_DATA__` JSON | JSON-LD |
| **Bot Protection** | PerimeterX | Akamai |
| **Wait Time** | 4000ms | 3500ms |
| **waitUntil** | `domcontentloaded` | `networkidle2` |
| **Selectors Pattern** | `data-testid`, `itemprop` | `data-test` |

### Example 2: Custom Selectors

```typescript
// POST /api/v1/scrape/product
{
  "url": "https://example-shop.com/product/123",
  "selectors": {
    "title": ".product-name h1",
    "price": ".final-price span",
    "images": ".gallery img"
  }
}
```

### Example 3: Using scrapeHelper Directly

```typescript
import { scrapeHelper } from '../helpers/scrapeHelper';

// Quick scrape
const quick = await scrapeHelper.quickScrape('https://example.com');

// Product scrape
const product = await scrapeHelper.scrapeProduct('https://amazon.com/dp/...');

// Multiple URLs
const results = await scrapeHelper.scrapeMultiple([
  'https://amazon.com/dp/A',
  'https://amazon.com/dp/B',
], { extractors: ['product'] });
```

---

## 14. Troubleshooting Guide

### Problem: CAPTCHA Detected

**Symptoms:** `Error: CAPTCHA detected (Amazon Robot Check)`

**Solutions:**
1. Wait 5-10 minutes before retrying
2. Try a different product URL
3. System automatically tries 3 fallback methods

---

### Problem: Timeout Error

**Symptoms:** `Error: Request timed out`

**Solutions:**
1. Increase timeout: `{ "browser": { "timeout": 45000 } }`
2. Check if website is accessible manually

---

### Problem: Empty Product Data

**Symptoms:** `product: { title: "", price: null }`

**Solutions:**
1. Use custom selectors for non-standard sites
2. Check if page requires JavaScript (use Puppeteer)
3. Verify URL is a product page

---

## 15. Future Improvements

### Planned Features

| Feature | Priority | Impact |
|---------|----------|--------|
| URL Caching | High | ~300x faster for cached |
| ScraperAPI Integration | Medium | Better success rate |
| Residential Proxies | Low | Better for strict sites |

---

## Summary

এই Web Scraping System একটি production-ready solution যা:

✅ **Multiple Engines** - Static ও JS-rendered pages handle করে
✅ **Browser Pool** - 40% faster subsequent requests
✅ **Multi-Method Fallback** - 60-70% success rate on strict sites
✅ **Smart Detection** - False positive CAPTCHA কমায়
✅ **25-Layer Extraction** - 85%+ price accuracy (Amazon + eBay + AliExpress + Generic) 🆕
✅ **Multi-Site Support** - Amazon, eBay, AliExpress, Alibaba, Walmart, Target, Generic sites 🆕
✅ **Human-Readable Errors** - Bangla messages সহ
✅ **Anti-Bot Protection** - User-agent rotation, delays, stealth mode
✅ **Site-Specific Strategies** - PerimeterX (Walmart), Akamai (Target) bypass 🆕
✅ **Fingerprint Spoofing** - Canvas, WebGL, Audio fingerprint randomization 🆕

### Version 2.5 New Features 🆕

| Feature | Description |
|---------|-------------|
| **Walmart Full Support** | Dedicated selectors + `__NEXT_DATA__` JSON extraction 🆕 |
| **Target Full Support** | Dedicated selectors + JSON-LD + `__TGT_PRELOAD_STATE__` 🆕 |
| **PerimeterX Bypass** | Walmart bot protection bypass (Chrome runtime, behavior) 🆕 |
| **Akamai Bypass** | Target bot protection bypass (error stack, webdriver) 🆕 |
| **Fingerprint Spoofing** | Canvas, WebGL, Audio fingerprint randomization 🆕 |
| **Price Override Fix** | Walmart `__NEXT_DATA__` price overrides wrong selector price 🆕 |

### Version 2.4 Features

| Feature | Description |
|---------|-------------|
| **Alibaba.com Support** | B2B platform with price range parsing 🆕 |
| **6-Method Price** | Alibaba price extraction with range handling |
| **Supplier Rating** | Alibaba supplier score extraction |

### Version 2.3 Features

| Feature | Description |
|---------|-------------|
| **AliExpress Bug Fixes** | Navigation timeout, waitFor override fixed |
| **9-Method Price** | AliExpress price extraction with URL parsing |
| **4-Method Rating** | AliExpress rating with % → star conversion |

### Supported Sites

| Site | Detection | Bot Protection | Fields Available |
|------|-----------|----------------|------------------|
| **Amazon** | `amazon.` in URL | Standard | title, price, images, description, rating, reviews, availability, brand, features |
| **eBay** | `ebay.` in URL | Standard | title, price, images, description, rating, reviews, availability, **condition**, **seller**, brand, features |
| **AliExpress** | `aliexpress.` in URL | Fingerprinting | title, price, images, description, rating, reviews, availability, **seller**, **shipping**, brand, features |
| **Alibaba.com** | `alibaba.com` in URL | Fingerprinting | title, **price range**, images, description, **supplier score**, reviews, **MOQ**, **supplier**, **lead time**, brand, features 🆕 |
| **Walmart** | `walmart.` in URL | **PerimeterX** 🆕 | title, price, images, description, rating, reviews, availability, brand, features |
| **Target** | `target.` in URL | **Akamai** 🆕 | title, price, images, description, rating, reviews, brand |
| **Generic** | Fallback | None | title, price, images, description, rating, reviews, availability |

### Anti-Bot Protection Comparison

| Site | Protection | Bypass Method | Files |
|------|-----------|---------------|-------|
| **Walmart** | PerimeterX | Chrome runtime injection, mouse movement | `siteStrategies.ts` |
| **Target** | Akamai | Error stack sanitization, webdriver hide | `siteStrategies.ts` |
| **AliExpress** | Fingerprinting | Canvas/WebGL/Audio spoofing | `fingerprint.ts` |
| **Alibaba** | Fingerprinting | Canvas/WebGL/Audio spoofing | `fingerprint.ts` |

**Key Files:**
- Entry: `src/helpers/scrapeHelper.ts`
- Core: `src/app/scraper/pipeline.ts`
- Engines: `src/app/scraper/engines/`
- Extractors: `src/app/scraper/extractors/`
- Anti-Bot: `src/app/scraper/antiBot/`
- **Site Strategies: `src/app/scraper/antiBot/siteStrategies.ts`** 🆕
- **Fingerprint: `src/app/scraper/antiBot/fingerprint.ts`** 🆕
- API: `src/app/modules/scrape/`

---

**Document Version:** 2.5
**Last Updated:** 2025-11-28
**Author:** Claude AI (Anthropic)
**Changelog:**
- v2.5: Walmart & Target full support, PerimeterX/Akamai bypass, fingerprint spoofing, price override fix 🆕
- v2.4: Alibaba.com B2B support, price range parsing, supplier rating
- v2.3: AliExpress bug fixes, 9-method price, URL parameter extraction
- v2.2: AliExpress support, 25-layer price system, shipping field
- v2.1: eBay support, 20-layer price system, multi-site architecture
