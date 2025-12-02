"use strict";
/**
 * Multi-Method Scraping Engine
 * Multiple fallback methods দিয়ে scraping করে
 * Direct → AllOrigins → CORSProxy → Error
 *
 * Supabase scraping project এর মতো multi-method approach
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.MultiMethodEngine = void 0;
const cheerio = __importStar(require("cheerio"));
const cheerio_engine_1 = require("./cheerio.engine");
const puppeteer_engine_1 = require("./puppeteer.engine");
const proxy_1 = require("../proxy");
const captcha_1 = require("../antiBot/captcha");
const logger_1 = require("../../../shared/logger");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
/**
 * Check if HTML indicates blocking/CAPTCHA
 * HTML এ block বা CAPTCHA আছে কিনা check করে
 *
 * Smarter detection:
 * - Large HTML (>50KB) with product indicators = likely valid
 * - Small HTML (<10KB) with CAPTCHA = likely blocked
 * - Check for actual product content before declaring blocked
 */
function isBlocked(html) {
    if (!html || html.length < 100)
        return true;
    const lowerHtml = html.toLowerCase();
    // If we have substantial content (>50KB) and product indicators, it's probably valid
    // Even if there are some CAPTCHA-related words in navigation/footer
    if (html.length > 50000) {
        // Check for product page indicators
        const productIndicators = [
            'addtocart', 'add-to-cart', 'buy-now', 'buynow',
            'product-title', 'producttitle', '#productTitle',
            'price', 'a-price', 'priceblock',
            'product-image', 'imgTagWrapperId',
            'product-description', 'feature-bullets',
            'reviews', 'rating', 'stars',
        ];
        const hasProductContent = productIndicators.some(indicator => lowerHtml.includes(indicator.toLowerCase()));
        if (hasProductContent) {
            logger_1.logger.info(`[Scraper] Large page (${Math.round(html.length / 1024)}KB) with product content - accepting`);
            return false; // Valid product page
        }
    }
    // For smaller pages, check strictly for CAPTCHA
    const captchaInfo = (0, captcha_1.detectCaptcha)(html);
    // Only consider blocked if high confidence CAPTCHA (>50%)
    // AND the page is small (likely a CAPTCHA page, not a product page)
    if (captchaInfo.detected && captchaInfo.confidence > 50 && html.length < 50000) {
        logger_1.logger.warn(`[Scraper] CAPTCHA detected (confidence: ${captchaInfo.confidence}%, type: ${captchaInfo.type})`);
        return true;
    }
    // Check for explicit blocking pages (usually small)
    if (html.length < 20000) {
        const blockInfo = (0, captcha_1.detectBlocking)(html);
        if (blockInfo.blocked) {
            logger_1.logger.warn(`[Scraper] Blocking detected: ${blockInfo.reason}`);
            return true;
        }
    }
    return false;
}
/**
 * Determine which direct engine to use
 * URL দেখে কোন engine use করবে decide করে
 */
function selectDirectEngine(url, options) {
    // JS-heavy domains need Puppeteer
    const jsHeavyDomains = [
        'amazon.', 'ebay.', 'walmart.', 'target.',
        'instagram.', 'twitter.', 'x.com', 'facebook.',
        'linkedin.', 'pinterest.', 'airbnb.', 'booking.com',
    ];
    const urlLower = url.toLowerCase();
    const needsPuppeteer = jsHeavyDomains.some(domain => urlLower.includes(domain));
    if (options.engine === 'puppeteer' || needsPuppeteer) {
        return puppeteer_engine_1.PuppeteerEngine;
    }
    if (options.engine === 'cheerio') {
        return cheerio_engine_1.CheerioEngine;
    }
    // Default to Cheerio for speed
    return cheerio_engine_1.CheerioEngine;
}
exports.MultiMethodEngine = {
    name: 'auto', // Uses 'auto' as the engine name
    /**
     * Initialize - prepare engines
     */
    initialize(options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize both engines
            yield cheerio_engine_1.CheerioEngine.initialize(options);
            // Puppeteer will be initialized on-demand
        });
    },
    /**
     * Fetch using multiple methods with fallback
     * একাধিক method দিয়ে চেষ্টা করে, এক fail হলে পরেরটা try করে
     */
    fetch(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const attempts = [];
            let lastError = null;
            // Method 1: Direct fetch (Cheerio or Puppeteer based on URL)
            const directEngine = selectDirectEngine(url, options);
            const directMethodName = directEngine.name === 'puppeteer' ? 'puppeteer' : 'direct';
            try {
                logger_1.logger.info(`[Scraper] Method 1: ${directMethodName} fetch for ${url}`);
                const startTime = Date.now();
                yield directEngine.initialize(options);
                const html = yield directEngine.fetch(url, options);
                if (!isBlocked(html)) {
                    attempts.push({
                        method: directMethodName,
                        success: true,
                        duration: Date.now() - startTime,
                    });
                    logger_1.logger.info(`[Scraper] ${directMethodName} succeeded`);
                    return html;
                }
                attempts.push({
                    method: directMethodName,
                    success: false,
                    error: 'Blocked or CAPTCHA detected',
                    duration: Date.now() - startTime,
                });
                logger_1.logger.warn(`[Scraper] ${directMethodName} blocked, trying proxies...`);
            }
            catch (error) {
                attempts.push({
                    method: directMethodName,
                    success: false,
                    error: error.message,
                });
                lastError = error;
                logger_1.logger.warn(`[Scraper] ${directMethodName} failed: ${error.message}`);
            }
            // Method 2: AllOrigins Proxy
            try {
                logger_1.logger.info('[Scraper] Method 2: AllOrigins proxy');
                const startTime = Date.now();
                const result = yield (0, proxy_1.fetchWithAllOrigins)(url);
                if (result.success && result.html && !isBlocked(result.html)) {
                    attempts.push({
                        method: 'allorigins',
                        success: true,
                        duration: Date.now() - startTime,
                    });
                    logger_1.logger.info('[Scraper] AllOrigins succeeded');
                    return result.html;
                }
                attempts.push({
                    method: 'allorigins',
                    success: false,
                    error: result.error || 'Blocked',
                    duration: Date.now() - startTime,
                });
            }
            catch (error) {
                attempts.push({
                    method: 'allorigins',
                    success: false,
                    error: error.message,
                });
                lastError = error;
            }
            // Method 3: CORSProxy.io
            try {
                logger_1.logger.info('[Scraper] Method 3: CORSProxy');
                const startTime = Date.now();
                const result = yield (0, proxy_1.fetchWithCorsProxy)(url);
                if (result.success && result.html && !isBlocked(result.html)) {
                    attempts.push({
                        method: 'corsproxy',
                        success: true,
                        duration: Date.now() - startTime,
                    });
                    logger_1.logger.info('[Scraper] CORSProxy succeeded');
                    return result.html;
                }
                attempts.push({
                    method: 'corsproxy',
                    success: false,
                    error: result.error || 'Blocked',
                    duration: Date.now() - startTime,
                });
            }
            catch (error) {
                attempts.push({
                    method: 'corsproxy',
                    success: false,
                    error: error.message,
                });
                lastError = error;
            }
            // All methods failed - throw human-readable error
            const methodsTried = attempts.map(a => a.method);
            const errorInfo = (0, captcha_1.getHumanReadableError)('ALL_METHODS_FAILED', url, methodsTried);
            logger_1.logger.error(`[Scraper] All ${attempts.length} methods failed for ${url}`);
            // Create error with human-readable message and full details
            const error = new ApiError_1.default(http_status_codes_1.StatusCodes.SERVICE_UNAVAILABLE, `${errorInfo.message}. ${errorInfo.suggestion}`);
            // Attach error details for API response
            error.errorInfo = errorInfo;
            throw error;
        });
    },
    /**
     * Parse HTML with Cheerio
     */
    getDocument(html) {
        return cheerio.load(html, {
            xmlMode: false,
            decodeEntities: true,
        });
    },
    /**
     * Cleanup all engines
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            yield cheerio_engine_1.CheerioEngine.cleanup();
            yield puppeteer_engine_1.PuppeteerEngine.cleanup();
        });
    },
    /**
     * Multi-method can handle any URL
     */
    canHandle(_url, _options) {
        return true; // Can handle any URL with fallbacks
    },
};
exports.default = exports.MultiMethodEngine;
