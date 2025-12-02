"use strict";
/**
 * Scrape Helper
 * Web scraping এর জন্য main entry point
 *
 * Usage:
 * ```typescript
 * import { scrapeHelper } from '../helpers/scrapeHelper';
 *
 * // Simple product scrape
 * const product = await scrapeHelper.scrapeProduct('https://amazon.com/dp/B0EXAMPLE');
 *
 * // Full scrape with options
 * const result = await scrapeHelper.scrape({
 *   url: 'https://example.com',
 *   extractors: ['text', 'images', 'prices'],
 * });
 * ```
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupScraper = exports.scrapeMultiple = exports.quickScrape = exports.scrapeProduct = exports.scrape = exports.scrapeHelper = void 0;
const pipeline_1 = require("../app/scraper/pipeline");
const engines_1 = require("../app/scraper/engines");
const extractors_1 = require("../app/scraper/extractors");
const logger_1 = require("../shared/logger");
/**
 * Main scrape function
 * URL থেকে data scrape করে
 *
 * @param options - Scrape options
 * @returns Scrape result with extracted data
 *
 * @example
 * ```typescript
 * const result = await scrapeHelper.scrape({
 *   url: 'https://www.amazon.com/dp/B0EXAMPLE',
 *   extractors: ['product', 'images'],
 *   browser: {
 *     waitFor: '#productTitle',
 *   }
 * });
 * ```
 */
const scrape = (options) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate URL
    if (!options.url) {
        throw new Error('URL is required');
    }
    try {
        new URL(options.url);
    }
    catch (_a) {
        throw new Error('Invalid URL format');
    }
    logger_1.logger.info(`[scrapeHelper] Starting scrape: ${options.url}`);
    const result = yield (0, pipeline_1.scrapePipeline)(options);
    return Object.assign(Object.assign({}, result), { savedToDb: false });
});
exports.scrape = scrape;
/**
 * Scrape product page (Amazon-optimized)
 * E-commerce product page থেকে product data extract করে
 *
 * @param url - Product page URL
 * @param selectors - Optional custom selectors
 * @returns Product data
 *
 * @example
 * ```typescript
 * const product = await scrapeHelper.scrapeProduct(
 *   'https://www.amazon.com/dp/B0EXAMPLE'
 * );
 *
 * console.log(product.title);
 * console.log(product.price.current);
 * console.log(product.images);
 * ```
 */
const scrapeProduct = (url, selectors) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate URL
    if (!url) {
        throw new Error('URL is required');
    }
    try {
        new URL(url);
    }
    catch (_a) {
        throw new Error('Invalid URL format');
    }
    logger_1.logger.info(`[scrapeHelper] Scraping product: ${url}`);
    const product = yield (0, pipeline_1.scrapeProduct)(url, selectors);
    if (!product) {
        throw new Error('Failed to extract product data');
    }
    return product;
});
exports.scrapeProduct = scrapeProduct;
/**
 * Quick scrape - fast text and metadata extraction
 * দ্রুত basic data extract করতে
 *
 * @param url - Page URL
 * @returns Basic scrape result
 */
const quickScrape = (url) => __awaiter(void 0, void 0, void 0, function* () {
    if (!url) {
        throw new Error('URL is required');
    }
    logger_1.logger.info(`[scrapeHelper] Quick scrape: ${url}`);
    return (0, pipeline_1.quickScrape)(url);
});
exports.quickScrape = quickScrape;
/**
 * Scrape multiple URLs
 * একাধিক URLs scrape করতে
 *
 * @param urls - Array of URLs
 * @param options - Common options for all URLs
 * @returns Array of scrape results
 *
 * @example
 * ```typescript
 * const results = await scrapeHelper.scrapeMultiple([
 *   'https://amazon.com/dp/B001',
 *   'https://amazon.com/dp/B002',
 * ], {
 *   extractors: ['product'],
 * });
 * ```
 */
const scrapeMultiple = (urls, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (!urls || urls.length === 0) {
        throw new Error('At least one URL is required');
    }
    logger_1.logger.info(`[scrapeHelper] Scraping ${urls.length} URLs`);
    const results = [];
    // Scrape sequentially to respect rate limits
    for (const url of urls) {
        try {
            const result = yield scrape(Object.assign(Object.assign({}, options), { url }));
            results.push(result);
        }
        catch (error) {
            // Add failed result
            results.push({
                url,
                status: 'failed',
                engine: (options === null || options === void 0 ? void 0 : options.engine) || 'auto',
                data: {},
                timing: { fetchMs: 0, extractMs: 0, totalMs: 0 },
                errors: [{ phase: 'fetch', message: error.message }],
                savedToDb: false,
            });
        }
    }
    return results;
});
exports.scrapeMultiple = scrapeMultiple;
/**
 * Get available scraping engines
 * Available engines এর list
 */
const getEngines = () => {
    return (0, engines_1.getAvailableEngines)();
};
/**
 * Get available extractors
 * Available extractors এর list
 */
const getExtractors = () => {
    return (0, extractors_1.getAvailableExtractors)();
};
/**
 * Cleanup scraper resources
 * Browser close করতে এবং resources free করতে
 */
const cleanup = () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.info('[scrapeHelper] Cleaning up resources');
    yield (0, pipeline_1.cleanupScraper)();
});
exports.cleanupScraper = cleanup;
/**
 * Check if URL is scrapeable
 * URL scrape করা যাবে কিনা check করে
 */
const isValidUrl = (url) => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    }
    catch (_a) {
        return false;
    }
};
/**
 * Scrape Helper - Main export
 * সব scraping functions এক জায়গায়
 */
exports.scrapeHelper = {
    // Main functions
    scrape,
    scrapeProduct,
    quickScrape,
    scrapeMultiple,
    // Utility functions
    getEngines,
    getExtractors,
    cleanup,
    isValidUrl,
};
