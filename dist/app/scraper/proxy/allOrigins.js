"use strict";
/**
 * AllOrigins Proxy Helper
 * CORS bypass করার জন্য AllOrigins proxy use করা হয়
 * Free, no API key needed
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
exports.fetchWithAllOrigins = fetchWithAllOrigins;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../../shared/logger");
const userAgent_1 = require("../antiBot/userAgent");
const ALLORIGINS_URL = 'https://api.allorigins.win/raw';
/**
 * Fetch URL through AllOrigins proxy
 * AllOrigins দিয়ে URL fetch করে - CORS bypass হয়
 */
function fetchWithAllOrigins(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.logger.info(`[Scraper] Trying AllOrigins proxy for: ${url}`);
            const proxyUrl = `${ALLORIGINS_URL}?url=${encodeURIComponent(url)}`;
            const response = yield axios_1.default.get(proxyUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': (0, userAgent_1.getRandomUserAgent)(),
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
            });
            if (response.status === 200 && response.data) {
                const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                // Check if we got actual HTML content
                if (html.length < 100) {
                    return {
                        success: false,
                        error: 'Response too short - likely blocked',
                        method: 'allorigins',
                    };
                }
                logger_1.logger.info(`[Scraper] AllOrigins success: ${html.length} bytes`);
                return {
                    success: true,
                    html,
                    method: 'allorigins',
                };
            }
            return {
                success: false,
                error: `Unexpected status: ${response.status}`,
                method: 'allorigins',
            };
        }
        catch (error) {
            logger_1.logger.warn(`[Scraper] AllOrigins failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                method: 'allorigins',
            };
        }
    });
}
