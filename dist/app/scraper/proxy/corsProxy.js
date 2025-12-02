"use strict";
/**
 * CORSProxy.io Helper
 * Alternative CORS bypass proxy
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
exports.fetchWithCorsProxy = fetchWithCorsProxy;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../../shared/logger");
const userAgent_1 = require("../antiBot/userAgent");
const CORSPROXY_URL = 'https://corsproxy.io';
/**
 * Fetch URL through CORSProxy.io
 * CORSProxy দিয়ে URL fetch করে - alternative proxy
 */
function fetchWithCorsProxy(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.logger.info(`[Scraper] Trying CORSProxy for: ${url}`);
            const proxyUrl = `${CORSPROXY_URL}/?${encodeURIComponent(url)}`;
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
                        method: 'corsproxy',
                    };
                }
                logger_1.logger.info(`[Scraper] CORSProxy success: ${html.length} bytes`);
                return {
                    success: true,
                    html,
                    method: 'corsproxy',
                };
            }
            return {
                success: false,
                error: `Unexpected status: ${response.status}`,
                method: 'corsproxy',
            };
        }
        catch (error) {
            logger_1.logger.warn(`[Scraper] CORSProxy failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                method: 'corsproxy',
            };
        }
    });
}
