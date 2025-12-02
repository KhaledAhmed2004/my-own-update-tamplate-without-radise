"use strict";
/**
 * Puppeteer Scraping Engine with Stealth Mode & Browser Pool
 * JavaScript-rendered pages scrape করার জন্য - Amazon, e-commerce sites
 * Bot detection bypass করতে puppeteer-extra-plugin-stealth use করা হয়েছে
 *
 * Browser Pool Benefits:
 * - Browser reuse করে performance বাড়ায় (~50% faster subsequent requests)
 * - Periodic restart করে rate limit এড়ায় (every 50 requests)
 * - Max concurrent pages limit করে memory stable রাখে
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
exports.PuppeteerEngine = void 0;
const cheerio = __importStar(require("cheerio"));
const userAgent_1 = require("../antiBot/userAgent");
const delay_1 = require("../antiBot/delay");
const fingerprint_1 = require("../antiBot/fingerprint");
const siteStrategies_1 = require("../antiBot/siteStrategies");
const pipeline_1 = require("../pipeline");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const logger_1 = require("../../../shared/logger");
const browserPool_1 = require("./browserPool");
exports.PuppeteerEngine = {
    name: 'puppeteer',
    /**
     * Initialize browser pool
     * Browser pool ready থাকলে subsequent requests faster হবে
     */
    initialize(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const headless = ((_a = options.browser) === null || _a === void 0 ? void 0 : _a.headless) !== false;
            browserPool_1.browserPool.updateConfig({ headless });
            // Pre-warm browser pool
            yield browserPool_1.browserPool.getBrowser();
        });
    },
    /**
     * Fetch page using Puppeteer with Stealth Mode & Browser Pool
     * Browser pool থেকে page নিয়ে কাজ করে - ~50% faster subsequent requests
     * Human-like behavior simulate করে bot detection এড়ানো হয়
     */
    fetch(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const protection = options.protection || {};
            const browserOptions = options.browser || {};
            // 🆕 Get mode configuration for speed vs safety trade-off
            const modeConfig = (0, pipeline_1.getModeConfig)(options);
            // Apply pre-request delay based on mode
            // quick: 0.3-0.8s, balanced: 0.8-1.5s, safe: 2-5s
            if (protection.randomDelay !== false) {
                const minDelay = (_a = protection.minDelay) !== null && _a !== void 0 ? _a : modeConfig.preDelay.min;
                const maxDelay = (_b = protection.maxDelay) !== null && _b !== void 0 ? _b : modeConfig.preDelay.max;
                yield (0, delay_1.randomDelay)(minDelay, maxDelay);
            }
            // Get page from browser pool (reuses browser, respects limits)
            let page = null;
            try {
                page = yield browserPool_1.browserPool.getPage();
                // Log pool stats
                const stats = browserPool_1.browserPool.getStats();
                logger_1.logger.debug(`[Scraper] Using browser pool (requests: ${stats.requestCount}/${stats.maxRequestsBeforeRestart}, active: ${stats.activePages})`);
                // Set random viewport for each page
                const viewport = browserOptions.viewport || (0, browserPool_1.getRandomViewport)();
                yield page.setViewport(viewport);
                // NEW: Inject fingerprint spoofing (SAFE - fails silently, existing code continues)
                try {
                    yield (0, fingerprint_1.injectFingerprintSpoofing)(page);
                }
                catch (_d) {
                    // Fingerprint spoofing failed - continue with existing flow
                    logger_1.logger.debug('[Scraper] Fingerprint spoofing skipped');
                }
                // NEW: Get site-specific strategy (SAFE - optional enhancement)
                const siteStrategy = (0, siteStrategies_1.getStrategyForUrl)(url);
                if (siteStrategy) {
                    try {
                        yield siteStrategy.preNavigationSetup(page);
                        logger_1.logger.debug(`[Scraper] Applied ${siteStrategy.name} pre-navigation setup`);
                    }
                    catch (_e) {
                        // Strategy failed - continue with existing flow
                        logger_1.logger.debug(`[Scraper] Site strategy pre-navigation skipped for ${siteStrategy.domain}`);
                    }
                }
                // Set user agent
                const userAgent = protection.rotateUserAgent !== false
                    ? (0, userAgent_1.getRandomUserAgent)()
                    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                yield page.setUserAgent(userAgent);
                // Set extra headers to look more like a real browser
                yield page.setExtraHTTPHeaders({
                    'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                });
                // Enable JavaScript
                yield page.setJavaScriptEnabled(true);
                // Don't block resources for Amazon - they detect this
                // Only block fonts to save bandwidth
                yield page.setRequestInterception(true);
                page.on('request', request => {
                    const resourceType = request.resourceType();
                    if (resourceType === 'font') {
                        request.abort();
                    }
                    else {
                        request.continue();
                    }
                });
                // Navigate to URL (20s default - enough for most pages, faster fail for broken pages)
                const timeout = browserOptions.timeout || 20000;
                // Use configurable waitUntil - 'domcontentloaded' for JS-heavy sites that never stop network activity
                const waitUntil = browserOptions.waitUntil || 'networkidle2';
                const response = yield page.goto(url, {
                    waitUntil,
                    timeout,
                });
                // NEW: Apply site-specific post-navigation actions (SAFE - fails silently)
                if (siteStrategy) {
                    try {
                        yield siteStrategy.postNavigationActions(page);
                        logger_1.logger.debug(`[Scraper] Applied ${siteStrategy.name} post-navigation actions`);
                    }
                    catch (_f) {
                        // Post-navigation failed - continue with existing flow
                        logger_1.logger.debug(`[Scraper] Site strategy post-navigation skipped for ${siteStrategy.domain}`);
                    }
                }
                // Add human-like behavior after page load (conditional based on mode)
                // quick: skip, balanced: minimal, safe: full
                if (modeConfig.humanBehavior) {
                    yield simulateHumanBehavior(page);
                }
                // Check response status
                const status = (response === null || response === void 0 ? void 0 : response.status()) || 0;
                if (status === 403) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Access denied - website blocked the request');
                }
                if (status === 404) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Page not found');
                }
                if (status === 429) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.TOO_MANY_REQUESTS, 'Rate limited - too many requests');
                }
                // Wait for specific selector if provided
                // Apply mode's waitForMultiplier to reduce wait time in faster modes
                if (browserOptions.waitFor) {
                    if (typeof browserOptions.waitFor === 'string') {
                        try {
                            // Selector timeout also scaled by mode (quick: 4s, balanced: 6s, safe: 10s)
                            const selectorTimeout = Math.round(10000 * modeConfig.waitForMultiplier);
                            yield page.waitForSelector(browserOptions.waitFor, {
                                timeout: selectorTimeout,
                            });
                        }
                        catch (_g) {
                            // Selector not found, continue anyway
                            logger_1.logger.warn(`[Scraper] Selector "${browserOptions.waitFor}" not found, continuing...`);
                        }
                    }
                    else if (typeof browserOptions.waitFor === 'number') {
                        // Apply mode multiplier to waitFor delay (e.g., 5000ms * 0.6 = 3000ms for balanced)
                        const adjustedWait = Math.round(browserOptions.waitFor * modeConfig.waitForMultiplier);
                        yield (0, delay_1.sleep)(adjustedWait);
                    }
                }
                // Scroll to bottom for lazy-loaded content (conditional based on mode)
                // quick: skip, balanced/safe: scroll with mode-specific timeout
                if (browserOptions.scrollToBottom && modeConfig.scrollEnabled) {
                    yield autoScroll(page, modeConfig.scrollTimeout);
                }
                // Get rendered HTML
                const html = yield page.content();
                return html;
            }
            catch (error) {
                if (error instanceof ApiError_1.default) {
                    throw error;
                }
                if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('timeout')) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.GATEWAY_TIMEOUT, 'Page load timed out');
                }
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_GATEWAY, `Puppeteer fetch failed: ${error.message}`);
            }
            finally {
                // Release page back to pool
                if (page) {
                    yield browserPool_1.browserPool.releasePage(page);
                }
            }
        });
    },
    /**
     * Parse HTML with Cheerio (for consistent extraction interface)
     */
    getDocument(html) {
        return cheerio.load(html, {
            xmlMode: false,
            decodeEntities: true,
        });
    },
    /**
     * Cleanup - close browser pool
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            yield browserPool_1.browserPool.cleanup();
        });
    },
    /**
     * Check if Puppeteer should handle this request
     * JS-heavy sites এর জন্য Puppeteer use করা হয়
     */
    canHandle(url, options) {
        // If explicitly set to puppeteer, use it
        if (options.engine === 'puppeteer') {
            return true;
        }
        // Use Puppeteer for known JS-heavy domains
        const jsHeavyDomains = [
            'amazon.',
            'ebay.',
            'walmart.',
            'target.',
            'aliexpress.',
            'alibaba.com',
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
        const urlLower = url.toLowerCase();
        for (const domain of jsHeavyDomains) {
            if (urlLower.includes(domain)) {
                return true;
            }
        }
        return false;
    },
};
/**
 * Simulate human-like behavior to avoid bot detection
 * মানুষের মতো behavior simulate করে bot detection এড়ানো হয়
 */
function simulateHumanBehavior(page) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Random small delay
            yield (0, delay_1.sleep)(500 + Math.random() * 1000);
            // Move mouse randomly
            const viewport = page.viewport();
            if (viewport) {
                const x = Math.floor(Math.random() * viewport.width * 0.8) + 50;
                const y = Math.floor(Math.random() * viewport.height * 0.8) + 50;
                yield page.mouse.move(x, y, { steps: 10 });
            }
            // Small scroll
            yield page.evaluate(() => {
                window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
            });
            // Wait a bit
            yield (0, delay_1.sleep)(300 + Math.random() * 500);
            // Scroll back up a little
            yield page.evaluate(() => {
                window.scrollBy(0, -(Math.floor(Math.random() * 100) + 50));
            });
            yield (0, delay_1.sleep)(200 + Math.random() * 300);
        }
        catch (_a) {
            // Ignore errors in human simulation
        }
    });
}
/**
 * Auto-scroll page to load lazy content
 * Lazy-loaded content load করতে scroll করে
 *
 * NOTE: Don't use async/await inside page.evaluate() - it runs in browser context
 * and TypeScript's __awaiter helper isn't available there.
 *
 * @param page - Puppeteer page instance
 * @param maxScrollTime - Max scroll time in ms (quick: 3s, balanced: 5s, safe: 10s)
 */
function autoScroll(page_1) {
    return __awaiter(this, arguments, void 0, function* (page, maxScrollTime = 10000) {
        yield page.evaluate((timeout) => {
            return new Promise(resolve => {
                let totalHeight = 0;
                const distance = 300 + Math.floor(Math.random() * 200); // Random scroll distance
                const scrollDelay = 150 + Math.floor(Math.random() * 100); // Random delay
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        // Scroll back to top
                        window.scrollTo(0, 0);
                        resolve();
                    }
                }, scrollDelay);
                // Max scroll time based on mode (passed from Node.js)
                setTimeout(() => {
                    clearInterval(timer);
                    window.scrollTo(0, 0);
                    resolve();
                }, timeout);
            });
        }, maxScrollTime);
        // Wait for any lazy-loaded content (reduced for faster modes)
        const waitTime = maxScrollTime < 5000 ? 500 : 1000;
        yield (0, delay_1.sleep)(waitTime + Math.random() * 300);
    });
}
