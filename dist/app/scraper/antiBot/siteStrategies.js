"use strict";
/**
 * Site-Specific Anti-Bot Strategies
 * বিভিন্ন site এর জন্য specific bot bypass techniques
 *
 * Supported Sites:
 * - Walmart (PerimeterX protection)
 * - Target (Akamai protection)
 *
 * NOTE: This is OPTIONAL - if strategies fail, existing code continues
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
exports.SITE_STRATEGIES = void 0;
exports.getStrategyForUrl = getStrategyForUrl;
exports.hasCustomStrategy = hasCustomStrategy;
exports.getSupportedDomains = getSupportedDomains;
const logger_1 = require("../../../shared/logger");
const delay_1 = require("./delay");
/**
 * Walmart Strategy (PerimeterX bypass)
 * PerimeterX bot detection এর জন্য specific bypasses
 */
const walmartStrategy = {
    name: 'walmart',
    domain: 'walmart.com',
    botDetectionType: 'perimeterx',
    preNavigationSetup(page) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield page.evaluateOnNewDocument(() => {
                    // PerimeterX specific bypasses
                    // 1. Override navigator.webdriver
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                        configurable: true,
                    });
                    // 2. Add Chrome runtime object (PerimeterX checks this)
                    // @ts-ignore
                    if (!window.chrome) {
                        // @ts-ignore
                        window.chrome = {
                            runtime: {
                                onMessage: { addListener: () => { } },
                                sendMessage: () => { },
                            },
                            loadTimes: function () {
                                return {
                                    requestTime: Date.now() / 1000,
                                    startLoadTime: Date.now() / 1000,
                                    commitLoadTime: Date.now() / 1000,
                                    finishDocumentLoadTime: Date.now() / 1000,
                                    finishLoadTime: Date.now() / 1000,
                                };
                            },
                            csi: function () {
                                return {
                                    startE: Date.now(),
                                    onloadT: Date.now(),
                                };
                            },
                            app: {
                                isInstalled: false,
                                InstallState: { DISABLED: 'disabled', INSTALLED: 'installed' },
                                RunningState: { RUNNING: 'running', CANNOT_RUN: 'cannot_run' },
                            },
                        };
                    }
                    // 3. Override Permissions.query for notifications
                    try {
                        const originalQuery = Permissions.prototype.query;
                        Permissions.prototype.query = function (parameters) {
                            if (parameters.name === 'notifications') {
                                return Promise.resolve({
                                    state: Notification.permission,
                                    onchange: null,
                                });
                            }
                            return originalQuery.call(this, parameters);
                        };
                    }
                    catch (_a) {
                        // Permissions override failed
                    }
                    // 4. Add console.debug (some detection checks this)
                    if (!console.debug) {
                        console.debug = console.log;
                    }
                });
                logger_1.logger.debug('[SiteStrategy] Walmart pre-navigation setup completed');
            }
            catch (error) {
                logger_1.logger.debug(`[SiteStrategy] Walmart pre-navigation setup failed: ${error.message}`);
            }
        });
    },
    postNavigationActions(page) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // PerimeterX needs aggressive mouse movement to pass behavior analysis
                const viewport = page.viewport();
                if (viewport) {
                    // More mouse movements with natural curves
                    for (let i = 0; i < 5; i++) {
                        const x = 100 + Math.random() * (viewport.width * 0.7);
                        const y = 100 + Math.random() * (viewport.height * 0.5);
                        yield page.mouse.move(x, y, { steps: 12 + Math.floor(Math.random() * 8) });
                        yield (0, delay_1.sleep)(80 + Math.random() * 150);
                    }
                    // Random scroll
                    yield page.evaluate(() => {
                        window.scrollBy(0, 150 + Math.random() * 250);
                    });
                    yield (0, delay_1.sleep)(200 + Math.random() * 300);
                    // Scroll back slightly
                    yield page.evaluate(() => {
                        window.scrollBy(0, -(50 + Math.random() * 100));
                    });
                    yield (0, delay_1.sleep)(100 + Math.random() * 200);
                }
                logger_1.logger.debug('[SiteStrategy] Walmart post-navigation actions completed');
            }
            catch (error) {
                logger_1.logger.debug(`[SiteStrategy] Walmart post-navigation failed: ${error.message}`);
            }
        });
    },
    minDelay: 3000,
    maxDelay: 7000,
};
/**
 * Target Strategy (Akamai bypass)
 * Akamai bot detection এর জন্য specific bypasses
 */
const targetStrategy = {
    name: 'target',
    domain: 'target.com',
    botDetectionType: 'akamai',
    preNavigationSetup(page) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield page.evaluateOnNewDocument(() => {
                    // Akamai specific bypasses
                    // 1. Remove automation indicators
                    // @ts-ignore
                    delete window.__webdriver_evaluate;
                    // @ts-ignore
                    delete window.__selenium_evaluate;
                    // @ts-ignore
                    delete window.__webdriver_script_function;
                    // @ts-ignore
                    delete window.__driver_unwrapped;
                    // @ts-ignore
                    delete window.__webdriver_unwrapped;
                    // @ts-ignore
                    delete window.__driver_evaluate;
                    // @ts-ignore
                    delete window.__selenium_unwrapped;
                    // @ts-ignore
                    delete window.__fxdriver_evaluate;
                    // @ts-ignore
                    delete window.__fxdriver_unwrapped;
                    // 2. Override navigator.webdriver
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                        configurable: true,
                    });
                    // 3. Fix Error stack traces (Akamai checks for puppeteer in stacks)
                    const originalError = Error;
                    // @ts-ignore
                    Error = class extends originalError {
                        constructor(message) {
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
                logger_1.logger.debug('[SiteStrategy] Target pre-navigation setup completed');
            }
            catch (error) {
                logger_1.logger.debug(`[SiteStrategy] Target pre-navigation setup failed: ${error.message}`);
            }
        });
    },
    postNavigationActions(page) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Akamai tracks mouse movements with precise timing
                yield (0, delay_1.sleep)(1200 + Math.random() * 800);
                const viewport = page.viewport();
                if (viewport) {
                    // Natural curved mouse movements
                    const startX = viewport.width * 0.1;
                    const startY = viewport.height * 0.2;
                    for (let i = 0; i < 4; i++) {
                        const targetX = startX + (viewport.width * 0.6) * (i / 4) + Math.random() * 80;
                        const targetY = startY + Math.sin(i / 2) * 120 + Math.random() * 50;
                        yield page.mouse.move(targetX, targetY, { steps: 8 + Math.floor(Math.random() * 6) });
                        yield (0, delay_1.sleep)(60 + Math.random() * 120);
                    }
                    // Gentle scroll
                    yield page.evaluate(() => {
                        window.scrollBy(0, 100 + Math.random() * 150);
                    });
                    yield (0, delay_1.sleep)(150 + Math.random() * 250);
                }
                logger_1.logger.debug('[SiteStrategy] Target post-navigation actions completed');
            }
            catch (error) {
                logger_1.logger.debug(`[SiteStrategy] Target post-navigation failed: ${error.message}`);
            }
        });
    },
    minDelay: 2500,
    maxDelay: 6000,
};
/**
 * All available site strategies
 */
exports.SITE_STRATEGIES = {
    'walmart.com': walmartStrategy,
    'www.walmart.com': walmartStrategy,
    'target.com': targetStrategy,
    'www.target.com': targetStrategy,
};
/**
 * Get strategy for a URL
 * URL থেকে domain extract করে matching strategy return করে
 *
 * @param url - Target URL
 * @returns Strategy if found, null otherwise
 */
function getStrategyForUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        // Direct match
        if (exports.SITE_STRATEGIES[hostname]) {
            return exports.SITE_STRATEGIES[hostname];
        }
        // Check if hostname contains any strategy domain
        for (const [domain, strategy] of Object.entries(exports.SITE_STRATEGIES)) {
            if (hostname.includes(domain.replace('www.', ''))) {
                return strategy;
            }
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
/**
 * Check if a URL has a custom strategy
 */
function hasCustomStrategy(url) {
    return getStrategyForUrl(url) !== null;
}
/**
 * Get all supported domains
 */
function getSupportedDomains() {
    return Array.from(new Set(Object.values(exports.SITE_STRATEGIES).map(s => s.domain)));
}
