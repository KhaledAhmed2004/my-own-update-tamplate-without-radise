"use strict";
/**
 * Cheerio Scraping Engine
 * Static HTML pages scrape করার জন্য - দ্রুত ও lightweight
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
exports.CheerioEngine = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const userAgent_1 = require("../antiBot/userAgent");
const delay_1 = require("../antiBot/delay");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
exports.CheerioEngine = {
    name: 'cheerio',
    /**
     * Initialize - Cheerio doesn't need initialization
     */
    initialize(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            // No initialization needed for Cheerio
        });
    },
    /**
     * Fetch HTML using axios
     * axios দিয়ে HTTP request করে HTML নিয়ে আসে
     */
    fetch(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const protection = options.protection || {};
            // Apply random delay if enabled
            if (protection.randomDelay !== false) {
                yield (0, delay_1.randomDelay)(protection.minDelay || 1000, protection.maxDelay || 3000);
            }
            // Build request config
            const config = {
                timeout: ((_a = options.browser) === null || _a === void 0 ? void 0 : _a.timeout) || 30000,
                maxRedirects: 5,
                validateStatus: status => status < 500, // Accept 4xx for error handling
                headers: {
                    'User-Agent': protection.rotateUserAgent !== false
                        ? (0, userAgent_1.getRandomUserAgent)()
                        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    Connection: 'keep-alive',
                    'Cache-Control': 'no-cache',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                },
            };
            try {
                const response = yield axios_1.default.get(url, config);
                // Check for error status codes
                if (response.status === 403) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Access denied - website blocked the request');
                }
                if (response.status === 404) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Page not found');
                }
                if (response.status === 429) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.TOO_MANY_REQUESTS, 'Rate limited - too many requests');
                }
                return response.data;
            }
            catch (error) {
                // Handle axios errors
                if (error.response) {
                    throw new ApiError_1.default(error.response.status || http_status_codes_1.StatusCodes.BAD_GATEWAY, `Failed to fetch URL: ${error.response.status} ${error.response.statusText}`);
                }
                if (error.code === 'ECONNREFUSED') {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_GATEWAY, 'Connection refused');
                }
                if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.GATEWAY_TIMEOUT, 'Request timed out');
                }
                if (error instanceof ApiError_1.default) {
                    throw error;
                }
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_GATEWAY, `Network error: ${error.message}`);
            }
        });
    },
    /**
     * Parse HTML with Cheerio
     * HTML parse করে cheerio instance return করে
     */
    getDocument(html) {
        return cheerio.load(html, {
            xmlMode: false,
            decodeEntities: true,
        });
    },
    /**
     * Cleanup - nothing to cleanup for Cheerio
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            // No cleanup needed
        });
    },
    /**
     * Check if Cheerio can handle this request
     * Cheerio static HTML এর জন্য, JS-heavy sites এর জন্য না
     */
    canHandle(url, options) {
        // If explicitly set to cheerio, use it
        if (options.engine === 'cheerio') {
            return true;
        }
        // Don't use for JS-heavy sites
        const jsHeavyDomains = [
            'amazon.',
            'ebay.',
            'walmart.',
            'target.',
            'instagram.',
            'twitter.',
            'x.com',
            'facebook.',
            'linkedin.',
            'pinterest.',
            'airbnb.',
            'booking.com',
        ];
        const urlLower = url.toLowerCase();
        for (const domain of jsHeavyDomains) {
            if (urlLower.includes(domain)) {
                return false; // Puppeteer should handle these
            }
        }
        // Default to Cheerio for simple sites
        return true;
    },
};
