"use strict";
/**
 * Browser Pool Manager
 * Puppeteer browser instance reuse করে performance optimize করে
 * Rate limit protection এর জন্য periodic restart এবং concurrent page limit
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
exports.BrowserPool = exports.browserPool = exports.getRandomViewport = void 0;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const logger_1 = require("../../../shared/logger");
// Use stealth plugin
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
// Random viewport sizes to look more human-like
const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
];
const getRandomViewport = () => VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
exports.getRandomViewport = getRandomViewport;
const DEFAULT_CONFIG = {
    maxRequestsBeforeRestart: 50, // Restart browser after 50 requests (fresh fingerprint)
    maxConcurrentPages: 5, // Max 5 concurrent pages
    headless: true,
};
/**
 * Browser Pool Manager Class
 * Browser reuse করে performance বাড়ায়, periodic restart করে rate limit এড়ায়
 */
class BrowserPool {
    constructor(config = {}) {
        this.browser = null;
        this.browserLaunchPromise = null;
        this.requestCount = 0;
        this.activePages = 0;
        this.isRestarting = false;
        this.config = Object.assign(Object.assign({}, DEFAULT_CONFIG), config);
    }
    /**
     * Get browser stats for monitoring
     */
    getStats() {
        var _a;
        return {
            requestCount: this.requestCount,
            activePages: this.activePages,
            maxRequestsBeforeRestart: this.config.maxRequestsBeforeRestart,
            maxConcurrentPages: this.config.maxConcurrentPages,
            browserConnected: ((_a = this.browser) === null || _a === void 0 ? void 0 : _a.isConnected()) || false,
        };
    }
    /**
     * Get or create browser instance
     * Automatic restart after max requests
     */
    getBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if restart needed (fresh fingerprint for rate limit protection)
            if (this.requestCount >= this.config.maxRequestsBeforeRestart && !this.isRestarting) {
                logger_1.logger.info(`[BrowserPool] Restarting browser after ${this.requestCount} requests (fingerprint refresh)`);
                yield this.restart();
            }
            // Return existing browser if connected
            if (this.browser && this.browser.isConnected()) {
                return this.browser;
            }
            // Prevent multiple simultaneous launches
            if (this.browserLaunchPromise) {
                return this.browserLaunchPromise;
            }
            // Launch new browser
            this.browserLaunchPromise = this.launchBrowser();
            this.browser = yield this.browserLaunchPromise;
            this.browserLaunchPromise = null;
            return this.browser;
        });
    }
    /**
     * Launch browser with stealth options
     */
    launchBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            const viewport = (0, exports.getRandomViewport)();
            const browser = yield puppeteer_extra_1.default.launch({
                headless: this.config.headless,
                args: [
                    // Core sandbox/security args
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    `--window-size=${viewport.width},${viewport.height}`,
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars',
                    '--lang=en-US,en',
                    // Performance optimization args (faster startup)
                    '--no-first-run',
                    '--disable-extensions',
                    '--disable-background-networking',
                    '--disable-sync',
                    '--disable-translate',
                    '--metrics-recording-only',
                ],
                defaultViewport: viewport,
                ignoreDefaultArgs: ['--enable-automation'],
            });
            logger_1.logger.info(`[BrowserPool] Browser launched (headless: ${this.config.headless}, viewport: ${viewport.width}x${viewport.height})`);
            // Handle browser disconnect
            browser.on('disconnected', () => {
                logger_1.logger.warn('[BrowserPool] Browser disconnected unexpectedly');
                this.browser = null;
                this.requestCount = 0;
            });
            return browser;
        });
    }
    /**
     * Get a new page from browser pool
     * Respects max concurrent pages limit
     */
    getPage() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check concurrent page limit
            if (this.activePages >= this.config.maxConcurrentPages) {
                logger_1.logger.warn(`[BrowserPool] Max concurrent pages (${this.config.maxConcurrentPages}) reached, waiting...`);
                // Wait and retry
                yield new Promise(resolve => setTimeout(resolve, 1000));
                return this.getPage();
            }
            const browser = yield this.getBrowser();
            const page = yield browser.newPage();
            this.activePages++;
            this.requestCount++;
            logger_1.logger.debug(`[BrowserPool] Page opened (active: ${this.activePages}, total: ${this.requestCount})`);
            return page;
        });
    }
    /**
     * Release a page back to pool (close it)
     */
    releasePage(page) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!page.isClosed()) {
                    yield page.close();
                }
            }
            catch (_a) {
                // Ignore close errors
            }
            this.activePages = Math.max(0, this.activePages - 1);
            logger_1.logger.debug(`[BrowserPool] Page released (active: ${this.activePages})`);
        });
    }
    /**
     * Force restart browser and get a new page with fresh fingerprint
     * Block detect হলে fresh fingerprint পেতে browser restart করে
     * NOTE: This is for retry scenarios - existing flow unchanged
     *
     * @param delayMs - Optional delay before restart (simulate new user)
     * @returns New page with fresh browser context
     */
    forceRestartAndGetPage(delayMs) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info('[BrowserPool] Force restart for fresh fingerprint');
            // Close current browser completely
            yield this.cleanup();
            // Optional delay to simulate new user arrival (5-15s by default)
            const delay = delayMs !== null && delayMs !== void 0 ? delayMs : 5000 + Math.random() * 10000;
            yield new Promise(resolve => setTimeout(resolve, delay));
            // Get fresh page from new browser
            return this.getPage();
        });
    }
    /**
     * Restart browser (fresh fingerprint)
     */
    restart() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRestarting) {
                return;
            }
            this.isRestarting = true;
            try {
                // Wait for active pages to close (with timeout)
                const maxWait = 10000; // 10 seconds max
                const startWait = Date.now();
                while (this.activePages > 0 && Date.now() - startWait < maxWait) {
                    logger_1.logger.info(`[BrowserPool] Waiting for ${this.activePages} active pages to close...`);
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                // Force close browser
                if (this.browser) {
                    try {
                        yield this.browser.close();
                    }
                    catch (_a) {
                        // Ignore close errors
                    }
                    this.browser = null;
                }
                this.requestCount = 0;
                this.activePages = 0;
                logger_1.logger.info('[BrowserPool] Browser restarted successfully');
            }
            finally {
                this.isRestarting = false;
            }
        });
    }
    /**
     * Cleanup - close browser completely
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.browser) {
                try {
                    yield this.browser.close();
                    logger_1.logger.info('[BrowserPool] Browser pool cleaned up');
                }
                catch (_a) {
                    // Ignore close errors
                }
                this.browser = null;
            }
            this.requestCount = 0;
            this.activePages = 0;
        });
    }
    /**
     * Check if browser is healthy
     */
    isHealthy() {
        return this.browser !== null && this.browser.isConnected();
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = Object.assign(Object.assign({}, this.config), config);
        logger_1.logger.info(`[BrowserPool] Config updated: ${JSON.stringify(this.config)}`);
    }
}
exports.BrowserPool = BrowserPool;
// Singleton instance
exports.browserPool = new BrowserPool();
