"use strict";
/**
 * Price Extractor - 25-Layer System
 * Page থেকে price/pricing information extract করে
 * Multi-layer fallback system with confidence scoring
 * Supports: Amazon, eBay, AliExpress, Generic e-commerce
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
exports.PRICE_SELECTORS_15_LAYER = exports.PriceExtractor = void 0;
exports.detectSiteType = detectSiteType;
// Currency symbols and codes
const CURRENCY_MAP = {
    $: 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    '৳': 'BDT',
    '₩': 'KRW',
    '₽': 'RUB',
    C$: 'CAD',
    A$: 'AUD',
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    JPY: 'JPY',
    INR: 'INR',
    BDT: 'BDT',
};
const PRICE_SELECTORS_15_LAYER = [
    // Layer 1-5: Amazon-specific (highest confidence)
    { selector: '#priceblock_ourprice', confidence: 95, site: 'amazon' },
    { selector: '#priceblock_dealprice', confidence: 93, site: 'amazon' },
    { selector: '.a-price .a-offscreen', confidence: 90, site: 'amazon' },
    { selector: '#corePrice_feature_div .a-offscreen', confidence: 88, site: 'amazon' },
    { selector: '#apex_offerDisplay_desktop .a-offscreen', confidence: 87, site: 'amazon' },
    // Layer 6-9: eBay-specific (high confidence)
    { selector: '.x-price-primary .ux-textspans', confidence: 92, site: 'ebay' },
    { selector: '[data-testid="x-price-primary"]', confidence: 90, site: 'ebay' },
    { selector: '.x-bin-price__content .ux-textspans', confidence: 88, site: 'ebay' },
    { selector: '.vi-VR-cvipPrice', confidence: 85, site: 'ebay' },
    { selector: '.x-price-approx__price .ux-textspans', confidence: 83, site: 'ebay' },
    // Layer 10-18: AliExpress-specific (high confidence)
    { selector: '[data-pl="product-price"]', confidence: 95, site: 'aliexpress' },
    { selector: '[class*="price--current"] .notranslate', confidence: 93, site: 'aliexpress' },
    { selector: '[class*="price--current"]', confidence: 91, site: 'aliexpress' },
    { selector: '[class*="snow-price"] .notranslate', confidence: 89, site: 'aliexpress' },
    { selector: '[class*="snow-price"]', confidence: 87, site: 'aliexpress' },
    { selector: '[class*="price"] .notranslate', confidence: 85, site: 'aliexpress' },
    { selector: '[class*="es--wrap"] .notranslate', confidence: 83, site: 'aliexpress' },
    { selector: '.uniform-banner-box-price', confidence: 81, site: 'aliexpress' },
    { selector: '.product-price-current', confidence: 79, site: 'aliexpress' },
    // Layer 15-17: Generic e-commerce (high confidence)
    { selector: '[itemprop="price"]', confidence: 85 },
    { selector: '[data-price]', confidence: 83 },
    { selector: '.product-price .current-price', confidence: 80 },
    // Layer 18-20: Common class patterns (medium-high confidence)
    { selector: '.a-price-whole', confidence: 78, site: 'amazon' },
    { selector: '#price_inside_buybox', confidence: 76, site: 'amazon' },
    { selector: '.offer-price', confidence: 75 },
    // Layer 21-22: Amazon additional patterns (medium confidence)
    { selector: '.priceToPay .a-offscreen', confidence: 72, site: 'amazon' },
    { selector: '#newBuyBoxPrice', confidence: 70, site: 'amazon' },
    // Layer 23-25: Fallback patterns (lower confidence)
    { selector: '[class*="price"]:not([class*="compare"]):not([class*="was"])', confidence: 60 },
    { selector: '.price, .product-price, .sale-price', confidence: 55 },
];
exports.PRICE_SELECTORS_15_LAYER = PRICE_SELECTORS_15_LAYER;
// Legacy selectors for backward compatibility
const PRICE_SELECTORS = PRICE_SELECTORS_15_LAYER.map(s => s.selector);
exports.PriceExtractor = {
    name: 'prices',
    /**
     * Extract prices from document using 25-layer system
     * Document থেকে সব prices বের করে - confidence scoring সহ
     */
    extract($, baseUrl, selectors) {
        return __awaiter(this, void 0, void 0, function* () {
            const prices = [];
            const seenPrices = new Set();
            // Detect site type for site-specific selectors
            const siteType = detectSiteType(baseUrl);
            // Use custom selector or 15-layer selectors
            const priceSelectors = (selectors === null || selectors === void 0 ? void 0 : selectors.price)
                ? [{ selector: selectors.price, confidence: 90 }]
                : PRICE_SELECTORS_15_LAYER.filter(s => !s.site || s.site === siteType || siteType === 'generic');
            // Try each selector in priority order
            for (const { selector, confidence } of priceSelectors) {
                $(selector).each((_, el) => {
                    const $el = $(el);
                    const text = $el.text().trim();
                    // Try data-price attribute first (highest reliability)
                    const dataPrice = $el.attr('data-price') || $el.attr('content');
                    if (dataPrice) {
                        const value = parseFloat(dataPrice);
                        if (!isNaN(value) && value > 0) {
                            const key = `${value}`;
                            if (!seenPrices.has(key)) {
                                seenPrices.add(key);
                                prices.push({
                                    value,
                                    original: text,
                                    selector,
                                    currency: detectCurrency(text),
                                    confidence: Math.min(confidence + 5, 100), // +5 for data attribute
                                });
                            }
                        }
                        return;
                    }
                    // Parse price from text
                    const parsed = parsePrice(text);
                    if (parsed) {
                        const key = `${parsed.value}`;
                        if (!seenPrices.has(key)) {
                            seenPrices.add(key);
                            prices.push(Object.assign(Object.assign({}, parsed), { selector,
                                confidence }));
                        }
                    }
                });
                // If we found a high-confidence price, we can stop
                if (prices.length > 0 && prices.some(p => (p.confidence || 0) >= 85)) {
                    break;
                }
            }
            // Sort by confidence first, then by value
            prices.sort((a, b) => {
                const confDiff = (b.confidence || 0) - (a.confidence || 0);
                if (confDiff !== 0)
                    return confDiff;
                return a.value - b.value;
            });
            // Limit to 20 prices
            return prices.slice(0, 20);
        });
    },
    /**
     * Check if this extractor should run
     */
    shouldRun(extractors) {
        return extractors.includes('prices');
    },
};
/**
 * Parse price from text
 * Text থেকে price value extract করে
 */
function parsePrice(text) {
    if (!text)
        return null;
    // Clean text
    const cleanText = text.trim();
    // Price regex patterns
    const patterns = [
        // $99.99, €99,99, £99.99
        /(?:[$€£¥₹৳₩₽])\s*(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{1,2})?)/,
        // 99.99 USD, 99,99 EUR
        /(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{1,2})?)\s*(?:USD|EUR|GBP|JPY|INR|BDT)/i,
        // C$99.99, A$99.99
        /(?:C\$|A\$)\s*(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{1,2})?)/,
        // Generic number that looks like price
        /(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{1,2}))/,
    ];
    for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match && match[1]) {
            // Parse the numeric value
            let numStr = match[1]
                .replace(/\s/g, '') // Remove spaces
                .replace(/,(\d{3})/g, '$1') // Remove thousand separators (comma before 3 digits)
                .replace(/\.(\d{3})/g, '$1'); // Remove thousand separators (dot before 3 digits)
            // Handle European format (comma as decimal)
            if (numStr.includes(',') && !numStr.includes('.')) {
                numStr = numStr.replace(',', '.');
            }
            const value = parseFloat(numStr);
            if (!isNaN(value) && value > 0 && value < 1000000) {
                return {
                    value,
                    original: cleanText,
                    currency: detectCurrency(cleanText),
                };
            }
        }
    }
    return null;
}
/**
 * Detect currency from text
 * Text থেকে currency identify করে
 */
function detectCurrency(text) {
    if (!text)
        return undefined;
    // Check for currency symbols
    for (const [symbol, code] of Object.entries(CURRENCY_MAP)) {
        if (text.includes(symbol)) {
            return code;
        }
    }
    return undefined;
}
/**
 * Detect site type from URL
 * URL থেকে site type identify করে - site-specific selectors এর জন্য
 */
function detectSiteType(url) {
    if (!url)
        return 'generic';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('amazon.'))
        return 'amazon';
    if (urlLower.includes('ebay.'))
        return 'ebay';
    if (urlLower.includes('aliexpress.'))
        return 'aliexpress';
    if (urlLower.includes('walmart.'))
        return 'walmart';
    return 'generic';
}
