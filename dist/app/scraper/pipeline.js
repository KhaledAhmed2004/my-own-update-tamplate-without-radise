"use strict";
/**
 * Scraping Pipeline
 * Main orchestrator - সব components কে coordinate করে scrape চালায়
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrape = exports.cleanupScraper = exports.quickScrape = exports.scrapeProduct = exports.scrapePipeline = exports.getModeConfig = exports.getEffectiveMode = exports.MODE_CONFIGS = void 0;
const engines_1 = require("./engines");
const extractors_1 = require("./extractors");
const captcha_1 = require("./antiBot/captcha");
const delay_1 = require("./antiBot/delay");
const logger_1 = require("../../shared/logger");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
// Default extractors
const DEFAULT_EXTRACTORS = ['text', 'images', 'links'];
exports.MODE_CONFIGS = {
    // Quick mode: Fastest, medium bot detection risk
    // Best for: Generic sites, testing, sites without bot protection
    quick: {
        preDelay: { min: 300, max: 800 }, // 0.3-0.8s (was 2-5s)
        waitForMultiplier: 0.4, // 40% of normal wait (e.g., 5s → 2s)
        scrollTimeout: 3000, // 3s max scroll (was 10s)
        humanBehavior: false, // Skip human simulation
        scrollEnabled: false, // Skip scrolling
    },
    // Balanced mode: Recommended, low risk
    // Best for: Most e-commerce sites, production use
    balanced: {
        preDelay: { min: 800, max: 1500 }, // 0.8-1.5s
        waitForMultiplier: 0.6, // 60% of normal wait (e.g., 5s → 3s)
        scrollTimeout: 5000, // 5s max scroll
        humanBehavior: true, // Minimal human simulation
        scrollEnabled: true, // Faster scroll
    },
    // Safe mode: Slowest, very low risk (current behavior)
    // Best for: Amazon, Walmart, Target, critical data
    safe: {
        preDelay: { min: 2000, max: 5000 }, // 2-5s (current)
        waitForMultiplier: 1.0, // 100% of normal wait (unchanged)
        scrollTimeout: 10000, // 10s max scroll (current)
        humanBehavior: true, // Full human simulation
        scrollEnabled: true, // Full scroll
    },
};
// Default mode for sites (user-provided mode always takes priority)
const SITE_DEFAULT_MODES = {
    'amazon.': 'safe', // Strict bot detection - always use safe
    // Other sites use balanced by default
};
/**
 * Get the effective mode for a scrape operation
 * User-provided mode > Site-specific default > Global default (balanced)
 */
const getEffectiveMode = (options) => {
    // User explicitly set mode - always respect it
    if (options.mode) {
        return options.mode;
    }
    // Check site-specific default
    const urlLower = options.url.toLowerCase();
    for (const [pattern, mode] of Object.entries(SITE_DEFAULT_MODES)) {
        if (urlLower.includes(pattern)) {
            return mode;
        }
    }
    // Global default: balanced
    return 'balanced';
};
exports.getEffectiveMode = getEffectiveMode;
/**
 * Get mode configuration for a scrape operation
 */
const getModeConfig = (options) => {
    const mode = (0, exports.getEffectiveMode)(options);
    return exports.MODE_CONFIGS[mode] || exports.MODE_CONFIGS.balanced;
};
exports.getModeConfig = getModeConfig;
// JS-heavy sites that need extra wait time for React/Vue rendering
// waitUntil: 'domcontentloaded' is used for sites with endless background requests
const JS_HEAVY_SITES_WITH_WAIT = [
    { pattern: 'aliexpress.', waitFor: 5000, scrollToBottom: true, waitUntil: 'domcontentloaded', timeout: 45000 },
    { pattern: 'tmall.', waitFor: 5000, scrollToBottom: true, waitUntil: 'domcontentloaded', timeout: 45000 },
    { pattern: 'taobao.', waitFor: 5000, scrollToBottom: true, waitUntil: 'domcontentloaded', timeout: 45000 },
    { pattern: 'temu.', waitFor: 4000, scrollToBottom: true, waitUntil: 'domcontentloaded', timeout: 40000 },
    { pattern: 'shein.', waitFor: 4000, scrollToBottom: true, waitUntil: 'domcontentloaded', timeout: 40000 },
    { pattern: 'wish.', waitFor: 3000, scrollToBottom: true, waitUntil: 'domcontentloaded', timeout: 35000 },
    // Walmart and Target - NextJS/React sites with bot protection
    { pattern: 'walmart.', waitFor: 4000, scrollToBottom: true, waitUntil: 'domcontentloaded', timeout: 40000 },
    { pattern: 'target.', waitFor: 3500, scrollToBottom: true, waitUntil: 'networkidle2', timeout: 35000 },
];
/**
 * Apply site-specific browser options
 * JS-heavy sites এর জন্য extra wait time এবং scroll options add করে
 */
const applySiteSpecificOptions = (options) => {
    var _a, _b, _c, _d;
    const urlLower = options.url.toLowerCase();
    for (const site of JS_HEAVY_SITES_WITH_WAIT) {
        if (urlLower.includes(site.pattern)) {
            // Only apply if not explicitly set by user
            const browserOptions = options.browser || {};
            return Object.assign(Object.assign({}, options), { browser: Object.assign(Object.assign({}, browserOptions), { 
                    // Add extra wait time for JS rendering (5s for AliExpress)
                    waitFor: (_a = browserOptions.waitFor) !== null && _a !== void 0 ? _a : site.waitFor, 
                    // Enable scroll to load lazy content
                    scrollToBottom: (_b = browserOptions.scrollToBottom) !== null && _b !== void 0 ? _b : site.scrollToBottom, 
                    // Longer timeout for heavy JS sites (45s for AliExpress)
                    timeout: (_c = browserOptions.timeout) !== null && _c !== void 0 ? _c : site.timeout, 
                    // Use domcontentloaded for sites with endless background requests
                    waitUntil: (_d = browserOptions.waitUntil) !== null && _d !== void 0 ? _d : site.waitUntil }) });
        }
    }
    return options;
};
/**
 * Main scraping pipeline
 * URL থেকে data scrape করে return করে
 */
const scrapePipeline = (options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const startTime = Date.now();
    // Apply site-specific options (e.g., extra wait for AliExpress)
    const enhancedOptions = applySiteSpecificOptions(options);
    // Initialize context
    const context = {
        url: enhancedOptions.url,
        options: enhancedOptions,
        result: {
            url: enhancedOptions.url,
            status: 'success',
            engine: enhancedOptions.engine || 'auto',
            data: {},
            timing: {
                fetchMs: 0,
                extractMs: 0,
                totalMs: 0,
            },
        },
        errors: [],
        startTime,
    };
    // Select best engine
    const engine = (0, engines_1.selectBestEngine)(enhancedOptions.url, enhancedOptions);
    context.result.engine = engine.name;
    // Log browser options for debugging JS-heavy sites
    if ((_a = enhancedOptions.browser) === null || _a === void 0 ? void 0 : _a.waitFor) {
        logger_1.logger.info(`[Scraper] Starting scrape: ${enhancedOptions.url} with ${engine.name} engine (waitFor: ${enhancedOptions.browser.waitFor}ms, scrollToBottom: ${enhancedOptions.browser.scrollToBottom})`);
    }
    else {
        logger_1.logger.info(`[Scraper] Starting scrape: ${enhancedOptions.url} with ${engine.name} engine`);
    }
    // Retry configuration
    const maxRetries = (_c = (_b = enhancedOptions.protection) === null || _b === void 0 ? void 0 : _b.maxRetries) !== null && _c !== void 0 ? _c : 3;
    let lastError = null;
    // Retry loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Initialize engine
            yield engine.initialize(enhancedOptions);
            // FETCH PHASE
            const fetchStart = Date.now();
            context.html = yield engine.fetch(enhancedOptions.url, enhancedOptions);
            context.result.timing.fetchMs = Date.now() - fetchStart;
            // Smart detection - considers page size and product content
            // Large pages (>50KB) with product indicators are accepted even if they have CAPTCHA words
            const blockingResult = (0, captcha_1.smartDetectBlocking)(context.html);
            if (blockingResult.isBlocked) {
                context.result.protection = Object.assign(Object.assign({}, context.result.protection), { captchaDetected: !!blockingResult.captchaType, blocked: !blockingResult.captchaType });
                logger_1.logger.warn(`[Scraper] Page blocked: ${blockingResult.reason} (confidence: ${blockingResult.confidence}%, size: ${Math.round(blockingResult.pageSize / 1024)}KB)`);
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, blockingResult.captchaType
                    ? `CAPTCHA detected (${blockingResult.captchaType}) - website requires human verification`
                    : `Access blocked - ${blockingResult.reason || 'website denied the request'}`);
            }
            // Log if page was large and accepted despite potential CAPTCHA words
            if (blockingResult.hasProductContent && blockingResult.pageSize > 50000) {
                logger_1.logger.info(`[Scraper] Large page (${Math.round(blockingResult.pageSize / 1024)}KB) with product content - accepted`);
            }
            // PARSE PHASE
            context.document = engine.getDocument(context.html);
            // EXTRACT PHASE
            const extractStart = Date.now();
            const extractors = enhancedOptions.extractors || DEFAULT_EXTRACTORS;
            const extractedData = yield (0, extractors_1.runExtractors)(extractors, context.document, enhancedOptions.url, enhancedOptions.selectors);
            context.result.timing.extractMs = Date.now() - extractStart;
            // Map extracted data to result
            if (extractedData.text)
                context.result.data.text = extractedData.text;
            if (extractedData.images)
                context.result.data.images = extractedData.images;
            if (extractedData.links)
                context.result.data.links = extractedData.links;
            if (extractedData.tables)
                context.result.data.tables = extractedData.tables;
            if (extractedData.prices)
                context.result.data.prices = extractedData.prices;
            if (extractedData.product)
                context.result.data.product = extractedData.product;
            if (extractedData.metadata)
                context.result.data.metadata = extractedData.metadata;
            if (extractedData.custom)
                context.result.data.custom = extractedData.custom;
            // Handle extraction errors
            if (extractedData._errors) {
                for (const err of extractedData._errors) {
                    context.errors.push({
                        phase: 'extract',
                        message: err.message,
                        extractor: err.extractor,
                    });
                }
            }
            // Success!
            logger_1.logger.info(`[Scraper] Completed: ${enhancedOptions.url} in ${Date.now() - startTime}ms`);
            break; // Exit retry loop
        }
        catch (error) {
            lastError = error;
            // Record error
            context.errors.push({
                phase: 'fetch',
                message: error.message || 'Unknown error',
            });
            // Check if retryable
            if ((0, captcha_1.isRetryableError)(error, context.html) && attempt < maxRetries) {
                logger_1.logger.warn(`[Scraper] Attempt ${attempt} failed, retrying: ${error.message}`);
                // Exponential backoff
                yield (0, delay_1.exponentialBackoff)(attempt, ((_d = enhancedOptions.protection) === null || _d === void 0 ? void 0 : _d.retryDelay) || 2000);
                // Track retry count
                context.result.protection = Object.assign(Object.assign({}, context.result.protection), { retryCount: attempt });
                continue; // Retry
            }
            // Non-retryable or max retries reached
            context.result.status = 'failed';
            // Re-throw ApiError
            if (error instanceof ApiError_1.default) {
                throw error;
            }
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_GATEWAY, `Scrape failed: ${error.message}`);
        }
    }
    // Finalize timing
    context.result.timing.totalMs = Date.now() - startTime;
    // 🆕 Add mode to timing for API response visibility
    context.result.timing.mode = (0, exports.getEffectiveMode)(enhancedOptions);
    // Set status based on errors
    if (context.errors.length > 0 && context.result.status === 'success') {
        context.result.status = 'partial';
    }
    // Add errors to result
    if (context.errors.length > 0) {
        context.result.errors = context.errors;
    }
    return context.result;
});
exports.scrapePipeline = scrapePipeline;
exports.scrape = exports.scrapePipeline;
/**
 * Scrape product specifically
 * Product page scrape করার জন্য shortcut function
 */
const scrapeProduct = (url, selectors) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const result = yield (0, exports.scrapePipeline)({
        url,
        extractors: ['product'],
        selectors,
    });
    if (result.status === 'failed') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_GATEWAY, ((_b = (_a = result.errors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) || 'Product scrape failed');
    }
    return result.data.product;
});
exports.scrapeProduct = scrapeProduct;
/**
 * Quick scrape - just fetch and extract basics
 * দ্রুত scrape করার জন্য
 */
const quickScrape = (url) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.scrapePipeline)({
        url,
        extractors: ['text', 'metadata'],
        protection: {
            maxRetries: 1,
            randomDelay: false,
        },
    });
});
exports.quickScrape = quickScrape;
/**
 * Cleanup all scraper resources
 * সব resources cleanup করে (browser close, etc.)
 */
const cleanupScraper = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, engines_1.cleanupAllEngines)();
    logger_1.logger.info('[Scraper] All resources cleaned up');
});
exports.cleanupScraper = cleanupScraper;
