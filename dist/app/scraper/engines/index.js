"use strict";
/**
 * Scraping Engines Registry
 * সব scraping engines এক জায়গা থেকে manage করা হয়
 * Multi-method engine added for fallback support
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
exports.MultiMethodEngine = exports.PuppeteerEngine = exports.CheerioEngine = exports.cleanupAllEngines = exports.getAvailableEngines = exports.selectBestEngine = exports.getEngine = exports.SCRAPER_ENGINES = void 0;
const cheerio_engine_1 = require("./cheerio.engine");
const puppeteer_engine_1 = require("./puppeteer.engine");
const multiMethod_engine_1 = require("./multiMethod.engine");
// Engine registry
exports.SCRAPER_ENGINES = {
    cheerio: cheerio_engine_1.CheerioEngine,
    puppeteer: puppeteer_engine_1.PuppeteerEngine,
    'multi-method': multiMethod_engine_1.MultiMethodEngine,
    auto: multiMethod_engine_1.MultiMethodEngine, // Default to multi-method for better success rate
};
/**
 * Get engine by name
 * নাম দিয়ে engine পাওয়া যায়
 */
const getEngine = (name) => {
    const engine = exports.SCRAPER_ENGINES[name];
    if (!engine) {
        throw new Error(`Unknown scraper engine: ${name}. Available: ${Object.keys(exports.SCRAPER_ENGINES).join(', ')}`);
    }
    return engine;
};
exports.getEngine = getEngine;
/**
 * Select best engine based on URL and options
 * URL এবং options দেখে সবচেয়ে ভালো engine select করে
 *
 * Auto-detection logic:
 * 1. If engine explicitly specified, use that
 * 2. JS-heavy sites (AliExpress, etc.) → Puppeteer for JavaScript rendering
 * 3. Default to multi-method for better success rate with fallbacks
 */
const selectBestEngine = (url, options) => {
    // If engine explicitly specified
    if (options.engine && options.engine !== 'auto') {
        return (0, exports.getEngine)(options.engine);
    }
    // Detect JavaScript-heavy sites that need Puppeteer
    const urlLower = url.toLowerCase();
    const jsHeavySites = [
        'aliexpress.com',
        'aliexpress.us',
        'tmall.com',
        'taobao.com',
        'wish.com',
        'shein.com',
        'temu.com',
    ];
    if (jsHeavySites.some(site => urlLower.includes(site))) {
        return puppeteer_engine_1.PuppeteerEngine;
    }
    // Default to multi-method engine for automatic fallback support
    // This tries: Direct → AllOrigins → CORSProxy
    return multiMethod_engine_1.MultiMethodEngine;
};
exports.selectBestEngine = selectBestEngine;
/**
 * Get all available engine names
 */
const getAvailableEngines = () => {
    return Object.keys(exports.SCRAPER_ENGINES);
};
exports.getAvailableEngines = getAvailableEngines;
/**
 * Cleanup all engines
 * সব engine cleanup করে (browser close, etc.)
 */
const cleanupAllEngines = () => __awaiter(void 0, void 0, void 0, function* () {
    for (const engine of Object.values(exports.SCRAPER_ENGINES)) {
        yield engine.cleanup();
    }
});
exports.cleanupAllEngines = cleanupAllEngines;
// Export individual engines
var cheerio_engine_2 = require("./cheerio.engine");
Object.defineProperty(exports, "CheerioEngine", { enumerable: true, get: function () { return cheerio_engine_2.CheerioEngine; } });
var puppeteer_engine_2 = require("./puppeteer.engine");
Object.defineProperty(exports, "PuppeteerEngine", { enumerable: true, get: function () { return puppeteer_engine_2.PuppeteerEngine; } });
var multiMethod_engine_2 = require("./multiMethod.engine");
Object.defineProperty(exports, "MultiMethodEngine", { enumerable: true, get: function () { return multiMethod_engine_2.MultiMethodEngine; } });
