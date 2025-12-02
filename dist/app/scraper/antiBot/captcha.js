"use strict";
/**
 * CAPTCHA & Bot Detection
 * CAPTCHA এবং bot detection identify করে gracefully handle করে
 * Human-readable error messages সহ
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.captchaHelper = exports.isRetryableError = exports.getCaptchaType = exports.detectBlocked = exports.detectBlocking = exports.detectCaptcha = void 0;
exports.getHumanReadableError = getHumanReadableError;
exports.smartDetectBlocking = smartDetectBlocking;
/**
 * Human-readable error messages
 * User-friendly error messages with suggestions
 */
const ERROR_MESSAGES = {
    CAPTCHA_DETECTED: {
        message: 'CAPTCHA verification required by the website',
        messageBn: 'Website এ CAPTCHA verification প্রয়োজন',
        suggestion: 'Try again after some time or use a different URL',
        suggestionBn: 'কিছুক্ষণ পর আবার চেষ্টা করুন অথবা অন্য URL ব্যবহার করুন',
    },
    ACCESS_DENIED: {
        message: 'Access denied by the website',
        messageBn: 'Website access করার অনুমতি নেই',
        suggestion: 'The website may have blocked automated access. Try a different product URL',
        suggestionBn: 'Website automated access block করেছে। অন্য product URL চেষ্টা করুন',
    },
    RATE_LIMITED: {
        message: 'Too many requests - rate limited',
        messageBn: 'অনেক বেশি request - rate limited',
        suggestion: 'Please wait a few minutes before trying again',
        suggestionBn: 'কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন',
    },
    ALL_METHODS_FAILED: {
        message: 'Unable to fetch the page after multiple attempts',
        messageBn: 'একাধিক চেষ্টার পরও page fetch করা যায়নি',
        suggestion: 'The website may be blocking all access. Try a different website or URL',
        suggestionBn: 'Website সব access block করছে। অন্য website বা URL চেষ্টা করুন',
    },
    NETWORK_ERROR: {
        message: 'Network connection error',
        messageBn: 'Network connection এ সমস্যা',
        suggestion: 'Check your internet connection and try again',
        suggestionBn: 'আপনার internet connection চেক করুন এবং আবার চেষ্টা করুন',
    },
    TIMEOUT: {
        message: 'Request timed out',
        messageBn: 'Request timeout হয়ে গেছে',
        suggestion: 'The website is responding slowly. Try again later',
        suggestionBn: 'Website ধীরে response করছে। পরে আবার চেষ্টা করুন',
    },
    INVALID_URL: {
        message: 'Invalid URL provided',
        messageBn: 'URL টি সঠিক নয়',
        suggestion: 'Please provide a valid product page URL',
        suggestionBn: 'সঠিক product page URL দিন',
    },
    PARSE_ERROR: {
        message: 'Failed to parse page content',
        messageBn: 'Page content parse করা যায়নি',
        suggestion: 'The page structure may have changed. Try a different URL',
        suggestionBn: 'Page structure পরিবর্তন হয়ে থাকতে পারে। অন্য URL চেষ্টা করুন',
    },
};
/**
 * Get human-readable error with details
 * User-friendly error message তৈরি করে
 */
function getHumanReadableError(code, url, methodsTried, captchaType) {
    const errorTemplate = ERROR_MESSAGES[code];
    return Object.assign(Object.assign({ code }, errorTemplate), { details: {
            url,
            methodsTried,
            captchaType,
        } });
}
// Common CAPTCHA indicators in HTML
const CAPTCHA_INDICATORS = [
    // Generic CAPTCHA
    'captcha',
    'recaptcha',
    'hcaptcha',
    'g-recaptcha',
    'h-captcha',
    // Bot detection messages
    'robot',
    'bot detected',
    'automated access',
    'unusual traffic',
    'suspicious activity',
    // Access denied
    'access denied',
    'blocked',
    'forbidden',
    'not allowed',
    // Verification required
    'verify you are human',
    'prove you are not a robot',
    'human verification',
    'security check',
    'challenge required',
    // Rate limiting
    'too many requests',
    'rate limit',
    'slow down',
    'try again later',
    // Amazon specific
    'enter the characters',
    'sorry, we just need to make sure',
    'type the characters',
];
// Common CAPTCHA class/id patterns
const CAPTCHA_SELECTORS = [
    '.captcha',
    '#captcha',
    '.g-recaptcha',
    '.h-captcha',
    '[data-captcha]',
    '.cf-challenge',
    '.challenge-form',
    '#challenge-form',
    '.antibot',
    '#px-captcha',
];
/**
 * Detect if HTML contains CAPTCHA
 * HTML এ CAPTCHA আছে কিনা check করে - enhanced with type detection
 */
const detectCaptcha = (html) => {
    if (!html) {
        return { detected: false, confidence: 0 };
    }
    const lowerHtml = html.toLowerCase();
    let matchCount = 0;
    let detectedType;
    // Check for text indicators
    for (const indicator of CAPTCHA_INDICATORS) {
        if (lowerHtml.includes(indicator.toLowerCase())) {
            matchCount++;
        }
    }
    // Check for CAPTCHA selectors in HTML
    for (const selector of CAPTCHA_SELECTORS) {
        const selectorPattern = selector.replace('.', 'class="').replace('#', 'id="');
        if (lowerHtml.includes(selectorPattern) ||
            lowerHtml.includes(selector.replace('.', '').replace('#', ''))) {
            matchCount++;
        }
    }
    // Detect type
    if (lowerHtml.includes('recaptcha') || lowerHtml.includes('g-recaptcha')) {
        detectedType = 'recaptcha';
    }
    else if (lowerHtml.includes('hcaptcha') || lowerHtml.includes('h-captcha')) {
        detectedType = 'hcaptcha';
    }
    else if (lowerHtml.includes('cf-challenge') || lowerHtml.includes('cloudflare')) {
        detectedType = 'cloudflare';
    }
    else if (lowerHtml.includes('enter the characters') || lowerHtml.includes('type the characters')) {
        detectedType = 'amazon';
    }
    else if (matchCount > 0) {
        detectedType = 'unknown';
    }
    const detected = matchCount > 0;
    const confidence = Math.min(matchCount * 25, 100); // 25% per match, max 100%
    return {
        detected,
        type: detectedType,
        confidence,
    };
};
exports.detectCaptcha = detectCaptcha;
/**
 * Detect if page is blocked or access denied
 * Page block হয়েছে কিনা check করে - enhanced with reason
 */
const detectBlocking = (html, statusCode) => {
    // Check HTTP status code
    if (statusCode) {
        const blockedCodes = {
            403: 'Access Forbidden',
            429: 'Rate Limited',
            503: 'Service Unavailable',
            504: 'Gateway Timeout',
        };
        if (blockedCodes[statusCode]) {
            return {
                blocked: true,
                reason: blockedCodes[statusCode],
                statusCode,
            };
        }
    }
    if (!html) {
        return { blocked: false };
    }
    const lowerHtml = html.toLowerCase();
    const blockedIndicators = {
        'access denied': 'Access Denied',
        'blocked': 'Blocked',
        'forbidden': 'Forbidden',
        '403 error': 'HTTP 403 Error',
        'service unavailable': 'Service Unavailable',
        'temporarily unavailable': 'Temporarily Unavailable',
        'too many requests': 'Rate Limited',
    };
    for (const [indicator, reason] of Object.entries(blockedIndicators)) {
        if (lowerHtml.includes(indicator)) {
            return {
                blocked: true,
                reason,
            };
        }
    }
    return { blocked: false };
};
exports.detectBlocking = detectBlocking;
// Legacy function for backward compatibility
const detectBlocked = (html, statusCode) => {
    return (0, exports.detectBlocking)(html, statusCode).blocked;
};
exports.detectBlocked = detectBlocked;
/**
 * Get CAPTCHA type if detected
 * কোন ধরনের CAPTCHA আছে তা identify করে
 */
const getCaptchaType = (html) => {
    if (!html)
        return null;
    const result = (0, exports.detectCaptcha)(html);
    return result.detected ? (result.type || 'unknown') : null;
};
exports.getCaptchaType = getCaptchaType;
/**
 * Check if error is retryable
 * Error retry করা যাবে কিনা check করে
 */
const isRetryableError = (error, html) => {
    // Network errors are usually retryable
    const retryableMessages = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ENOTFOUND',
        'timeout',
        'network error',
        'socket hang up',
    ];
    const errorMessage = ((error === null || error === void 0 ? void 0 : error.message) || '').toLowerCase();
    for (const msg of retryableMessages) {
        if (errorMessage.includes(msg.toLowerCase())) {
            return true;
        }
    }
    // Rate limiting is retryable with backoff
    if (html && (0, exports.detectBlocked)(html)) {
        return true;
    }
    // CAPTCHA might be retryable with different approach
    if (html) {
        const captchaResult = (0, exports.detectCaptcha)(html);
        if (captchaResult.detected) {
            return false; // Don't retry CAPTCHA - need different strategy
        }
    }
    return false;
};
exports.isRetryableError = isRetryableError;
// ==================== Smart Detection (Page Size + Content Aware) ====================
/**
 * Product page indicators
 * এগুলো পাওয়া গেলে page টি valid product page
 */
const PRODUCT_INDICATORS = [
    'addtocart', 'add-to-cart', 'buy-now', 'buynow',
    'product-title', 'producttitle', '#productTitle',
    'price', 'a-price', 'priceblock',
    'product-image', 'imgTagWrapperId',
    'product-description', 'feature-bullets',
    'reviews', 'rating', 'stars',
    'add to cart', 'add to basket', 'buy box',
];
/**
 * Smart detection that considers page size and content
 * Page size এবং content দেখে intelligent decision নেয়
 *
 * Logic:
 * 1. Very small page (<100 bytes) = blocked
 * 2. Large page (>50KB) with product indicators = valid (even if has some CAPTCHA words)
 * 3. Small page (<50KB) with high confidence CAPTCHA = blocked
 * 4. Small page (<20KB) with blocking indicators = blocked
 */
function smartDetectBlocking(html) {
    const result = {
        isBlocked: false,
        confidence: 0,
        pageSize: (html === null || html === void 0 ? void 0 : html.length) || 0,
        hasProductContent: false,
    };
    // Empty or very small response
    if (!html || html.length < 100) {
        return Object.assign(Object.assign({}, result), { isBlocked: true, reason: 'Empty or too small response', confidence: 100 });
    }
    const lowerHtml = html.toLowerCase();
    // Check for product content indicators
    result.hasProductContent = PRODUCT_INDICATORS.some(indicator => lowerHtml.includes(indicator.toLowerCase()));
    // Large page (>50KB) with product content = likely valid
    // Even if there are some CAPTCHA-related words in navigation/footer
    if (html.length > 50000 && result.hasProductContent) {
        return Object.assign(Object.assign({}, result), { isBlocked: false, confidence: 0, reason: 'Large page with product content - accepting' });
    }
    // For smaller pages, check strictly for CAPTCHA
    const captchaInfo = (0, exports.detectCaptcha)(html);
    // Only consider blocked if high confidence CAPTCHA (>50%)
    // AND the page is small (likely a CAPTCHA page, not a product page)
    if (captchaInfo.detected && captchaInfo.confidence > 50 && html.length < 50000) {
        return Object.assign(Object.assign({}, result), { isBlocked: true, reason: `CAPTCHA detected (${captchaInfo.type})`, captchaType: captchaInfo.type, confidence: captchaInfo.confidence });
    }
    // Check for explicit blocking pages (usually small)
    if (html.length < 20000) {
        const blockInfo = (0, exports.detectBlocking)(html);
        if (blockInfo.blocked) {
            return Object.assign(Object.assign({}, result), { isBlocked: true, reason: blockInfo.reason, confidence: 80 });
        }
    }
    return result;
}
exports.captchaHelper = {
    detectCaptcha: exports.detectCaptcha,
    detectBlocked: exports.detectBlocked,
    detectBlocking: exports.detectBlocking,
    getCaptchaType: exports.getCaptchaType,
    isRetryableError: exports.isRetryableError,
    getHumanReadableError,
    smartDetectBlocking,
    CAPTCHA_INDICATORS,
    CAPTCHA_SELECTORS,
    PRODUCT_INDICATORS,
};
