"use strict";
/**
 * Delay & Timing Utilities
 * Human-like behavior simulate করতে random delays ব্যবহার করা হয়
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
exports.delayHelper = exports.scrollDelay = exports.typingDelay = exports.exponentialBackoff = exports.randomDelay = exports.sleep = void 0;
/**
 * Sleep for specified milliseconds
 * নির্দিষ্ট সময়ের জন্য wait করে
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
/**
 * Random delay between min and max milliseconds
 * Bot detection এড়াতে random delay দেয় (human-like behavior)
 *
 * @param min - Minimum delay in ms (default: 1000)
 * @param max - Maximum delay in ms (default: 3000)
 */
const randomDelay = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    yield (0, exports.sleep)(delay);
    return delay;
});
exports.randomDelay = randomDelay;
/**
 * Exponential backoff delay for retries
 * Retry করার সময় exponentially বাড়তে থাকে delay
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @param maxDelay - Maximum delay cap in ms (default: 30000)
 */
const exponentialBackoff = (attempt_1, ...args_1) => __awaiter(void 0, [attempt_1, ...args_1], void 0, function* (attempt, baseDelay = 1000, maxDelay = 30000) {
    // Calculate delay: baseDelay * 2^(attempt-1) with some randomness
    const calculatedDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.3 * calculatedDelay; // Add 0-30% jitter
    const delay = Math.min(calculatedDelay + jitter, maxDelay);
    yield (0, exports.sleep)(delay);
    return Math.round(delay);
});
exports.exponentialBackoff = exponentialBackoff;
/**
 * Human-like typing delay
 * টাইপিং simulate করতে (future use)
 */
const typingDelay = (text) => __awaiter(void 0, void 0, void 0, function* () {
    // Average human types 40-60 WPM, roughly 200-300ms per character
    const delayPerChar = Math.random() * 100 + 50; // 50-150ms per char
    yield (0, exports.sleep)(text.length * delayPerChar);
});
exports.typingDelay = typingDelay;
/**
 * Page scroll delay
 * Scroll করার পর content load হওয়ার জন্য wait
 */
const scrollDelay = () => __awaiter(void 0, void 0, void 0, function* () {
    // Wait 500-1500ms after scroll for content to load
    yield (0, exports.randomDelay)(500, 1500);
});
exports.scrollDelay = scrollDelay;
exports.delayHelper = {
    sleep: exports.sleep,
    randomDelay: exports.randomDelay,
    exponentialBackoff: exports.exponentialBackoff,
    typingDelay: exports.typingDelay,
    scrollDelay: exports.scrollDelay,
};
